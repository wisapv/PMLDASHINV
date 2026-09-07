const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');
const { createBatchIfNotExists } = require('../lib/batches');
const { saveHandheldResults } = require('../lib/handheldResults');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const COLUMN_NAMES = {
  key0: 'Key0', source: 'Source', dock: 'Dock', sup: 'Sup', splant: 'Splant', sdock: 'Sdock',
  pno: 'Pno', partNo: 'PartNo', partName: 'PartName', kbn: 'KBN', qty: 'Qty',
  pcAddr: 'PC_Addr', addr01: 'Addr01',
};

function cellStr(row, index) {
  if (index < 0 || row[index] === undefined || row[index] === null) return '';
  return String(row[index]).trim();
}

// Whole-factory master file has a title row before the real header (see
// the sample: "NQC 202609 SUM SR" on row 1, real headers on row 2) — find
// the header row by looking for "Key0" instead of assuming a fixed row
// number, since that title row isn't guaranteed to always be exactly one
// line.
function parseMasterWorkbook(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerRowIndex = allRows.findIndex((row) => String(row[0]).trim() === COLUMN_NAMES.key0);
  if (headerRowIndex === -1) {
    throw new Error(`ไม่พบแถวหัวตาราง (คอลัมน์ "${COLUMN_NAMES.key0}") ในไฟล์`);
  }
  const headerRow = allRows[headerRowIndex];
  const colIndex = (name) => headerRow.findIndex((h) => String(h).trim() === name);

  const idx = Object.fromEntries(Object.entries(COLUMN_NAMES).map(([key, name]) => [key, colIndex(name)]));
  if (idx.key0 === -1 || idx.partNo === -1) {
    throw new Error('ไม่พบคอลัมน์ Key0 หรือ PartNo ในไฟล์ — เช็ครูปแบบไฟล์อีกครั้ง');
  }

  return allRows
    .slice(headerRowIndex + 1)
    .filter((row) => cellStr(row, idx.key0) !== '')
    .map((row) => ({
      key0: cellStr(row, idx.key0),
      source: cellStr(row, idx.source),
      dock: cellStr(row, idx.dock),
      supplier: cellStr(row, idx.sup),
      sPlant: cellStr(row, idx.splant),
      sDock: cellStr(row, idx.sdock),
      pno: cellStr(row, idx.pno),
      partNo: cellStr(row, idx.partNo),
      partName: cellStr(row, idx.partName),
      kbn: cellStr(row, idx.kbn),
      qty: cellStr(row, idx.qty),
      pcAddr: cellStr(row, idx.pcAddr),
      addr01: cellStr(row, idx.addr01),
    }));
}

// POST /api/getsudo/upload-master — full replace of the whole-factory
// part master. Meant to be re-run monthly. dataMonth (e.g. "2026-09") is
// picked by the admin, not parsed from the file — the upload date and the
// month the data represents aren't always the same thing.
async function handleUploadMaster(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const dataMonth = String(req.body.dataMonth || '').trim();
    if (!/^\d{4}-\d{2}$/.test(dataMonth)) {
      return res.status(400).json({ error: 'กรุณาระบุเดือนของข้อมูล (YYYY-MM) ก่อนอัปโหลด' });
    }

    let rows;
    try {
      rows = parseMasterWorkbook(req.file.buffer);
    } catch (parseError) {
      return res.status(400).json({ error: parseError.message });
    }
    if (rows.length === 0) return res.status(400).json({ error: 'ไม่พบข้อมูลในไฟล์' });

    const db = await connectDB();
    const now = new Date().toISOString();

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run('DELETE FROM getsudo_master_parts');
      for (const r of rows) {
        await db.run(
          `INSERT INTO getsudo_master_parts
             (key0, source, dock, supplier, s_plant, s_dock, pno, part_no, part_name, kbn, qty, pc_addr, addr01, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.key0, r.source, r.dock, r.supplier, r.sPlant, r.sDock, r.pno, r.partNo, r.partName, r.kbn, r.qty, r.pcAddr, r.addr01, now]
        );
      }
      await db.run(
        `INSERT INTO getsudo_master_meta (id, data_month, uploaded_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_month = excluded.data_month, uploaded_at = excluded.uploaded_at`,
        [dataMonth, now]
      );
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    res.json({ success: true, count: rows.length, updatedAt: now, dataMonth });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload master file' });
  }
}

// GET /api/getsudo/master-status — row count + which month + last refresh
// time, so the web page can show "3,412 parts · Data for: Sep 2026"
// instead of the admin having to guess whether the upload actually took.
async function handleMasterStatus(req, res) {
  try {
    const db = await connectDB();
    const countRow = await db.get('SELECT COUNT(*) AS count FROM getsudo_master_parts');
    const metaRow = await db.get('SELECT data_month, uploaded_at FROM getsudo_master_meta WHERE id = 1');
    res.json({
      count: countRow?.count || 0,
      updatedAt: metaRow?.uploaded_at || null,
      dataMonth: metaRow?.data_month || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load master status' });
  }
}

// GET /api/getsudo/master-preview — first N raw rows, for the "Preview"
// modal (same idea as Template Manager's own format preview).
async function handleMasterPreview(req, res) {
  try {
    const db = await connectDB();
    const rows = await db.all('SELECT * FROM getsudo_master_parts LIMIT 20');
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load master preview' });
  }
}

function cleanAddress(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

function generateGetsudoBatchId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  // "NQC" names which master file this came from (per the file's own title
  // row, e.g. "NQC 202609 SUM SR") — helps tell Getsudo batches apart from
  // the regular Part Runout batch at a glance in any batch list.
  return `GETSUDO-NQC-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// POST /api/getsudo/create-batch — the ad-hoc counting entry point. Takes
// whatever part numbers the admin picked, matches each against the master
// (a part number can match more than one row — different supplier/dock
// sources), and produces the exact same finalData shape the TBOS/Address-
// matching pipeline produces — so AssignHandheld, the multi-device
// assignment logic, and the whole Android app work on a Getsudo batch with
// zero changes on their end.
async function handleCreateBatch(req, res) {
  try {
    const { partNumbers } = req.body;
    if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
      return res.status(400).json({ error: 'partNumbers must be a non-empty array' });
    }

    const requested = [...new Set(partNumbers.map((p) => String(p).trim()).filter(Boolean))];
    if (requested.length === 0) return res.status(400).json({ error: 'No valid part numbers provided' });

    const db = await connectDB();

    const foundRows = [];
    const notFound = [];
    for (const pn of requested) {
      const matches = await db.all('SELECT * FROM getsudo_master_parts WHERE part_no = ? OR pno = ?', [pn, pn]);
      if (matches.length === 0) notFound.push(pn);
      else foundRows.push(...matches);
    }

    if (foundRows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Part Number ที่ระบุใน master เลยสักตัว', notFound });
    }

    // No "Shop" field in the NQC master (unlike TBOS data) — Dock is the
    // closest equivalent, so it's used for both until/unless a real Shop
    // column shows up in a future export.
    const finalData = foundRows.map((row) => {
      const rawAddr = row.pc_addr && row.pc_addr.trim() ? row.pc_addr : row.addr01;
      // Real prefixes vary in length (2-char "SD", 3-char "R.", "IP1", or
      // a full word like "TUSHO") — there's no length that's always
      // correct, so this just takes the first 3 characters of whatever's
      // left after stripping whitespace (keeps dashes/dots — only spaces
      // caused the actual bug, e.g. "SD - R03" silently becoming "SD ").
      const cleanedAddr = cleanAddress(rawAddr);
      const shortAddr = cleanedAddr.replace(/\s+/g, '').slice(0, 3).toUpperCase();
      return {
        PIC: 'Getsudo',
        ShortAddr: shortAddr || 'UNK',
        Addr: cleanedAddr,
        Shop: row.dock || '',
        Dock: row.dock || '',
        Supplier: row.supplier || '',
        'S.plant': row.s_plant || '',
        'S.dock': row.s_dock || '',
        kbn: row.kbn || '',
        'Part no.': row.part_no || '',
        'Part name': row.part_name || '',
        "Q'ty": row.qty || '',
      };
    });

    const batchId = generateGetsudoBatchId();
    await createBatchIfNotExists(db, batchId); // registers in upload_batches — shows up in /api/batches/list — without touching which batch is "active"
    await saveHandheldResults(db, batchId, { finalData, holdData: [], remindData: [] });

    res.json({
      success: true,
      batchId,
      matchedCount: finalData.length,
      requestedCount: requested.length,
      notFound,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create Getsudo batch' });
  }
}

router.post('/upload-master', upload.single('file'), handleUploadMaster);
router.get('/master-status', handleMasterStatus);
router.get('/master-preview', handleMasterPreview);
router.post('/create-batch', express.json({ limit: '2mb' }), handleCreateBatch);

module.exports = router;
module.exports.handleUploadMaster = handleUploadMaster;
module.exports.handleMasterStatus = handleMasterStatus;
module.exports.handleMasterPreview = handleMasterPreview;
module.exports.handleCreateBatch = handleCreateBatch;
module.exports.parseMasterWorkbook = parseMasterWorkbook;