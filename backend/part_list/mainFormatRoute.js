const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { buildPpIndex, cleanTargetRow, computeShop, createFirstOccurrenceTracker, findNewPartsSinceBatch } = require('../lib/partMatching');
const { buildMatchKey } = require('../lib/keyUtils');
const { getPreviousTgRows } = require('../lib/batches');
const { validateGroupPrefix, getStoredGroupPrefix, setStoredGroupPrefix, recordGroupPrefixUsage } = require('../lib/groupPrefix');
const { emitEvent, EVENTS } = require('../lib/socketHub');
const { blankOrTrim, toExcelCellValue } = require('../lib/textUtils');

const router = express.Router();

const generateExcelBuffer = (header, dataRows) => {
  const finalContent = [...header, ...dataRows, ["END"]];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(finalContent);
  xlsx.utils.book_append_sheet(wb, ws, "Part List");
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// Builds the same 27-column SAP-ready rows used by the Main Format preview
// table (and, filtered further by keyTG, the New Parts list/download) — the
// single source of truth for that column construction, so nothing else
// reimplements it. Returns each row alongside the keyTG it matched on (for
// filtering) and Remind data for valid-but-unmatched rows. A new Target R/O
// row with no Part Procurement match never reaches `rows` at all — it only
// ever surfaces via `remindData`.
async function buildMainFormatRows(db, batchId, groupPrefix) {
  const tgRows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
  const ppRows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

  const { ppMap, allPpMap, duplicateKeys } = buildPpIndex(ppRows, { excludePartDesc: ['WHEEL ASSY'] });

  const rows = [];
  const remindData = [];
  const isFirstOccurrence = createFirstOccurrenceTracker();

  for (const r of tgRows) {
    const t = JSON.parse(r.data);
    const { valid } = cleanTargetRow(t, { mode: 'main' });
    if (!valid) continue;

    const supplier = String(t['Supplier'] || t['Supplier '] || '').trim();
    const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
    const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();
    const source = String(t['Source'] || t['Source '] || '').trim();

    const keyTG = buildMatchKey(tgDock, partNo);
    if (!isFirstOccurrence(keyTG)) continue;

    const p = ppMap.get(keyTG);

    if (p) {
      const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();
      const shop = computeShop(ppDock, { mode: 'main' });

      if (shop === 'K') continue;

      t['Group'] = groupPrefix + shop + source;

      rows.push({
        keyTG,
        row: {
          "Company*": "AA",
          "Company plant code*": "B",
          "Group ID*": blankOrTrim(t['Group']),
          "CTL flag*": "6",
          "Part No.*": blankOrTrim(p['PART #'] || p['PART # ']).substring(0, 10),
          "Suffix*": blankOrTrim(p['Suffix No']),
          "Receiving company*": blankOrTrim(p['COMP']),
          "Receiving company plant code*": "S",
          "Production process routing": blankOrTrim(p['Production Routing'] || p['Production Routing ']),
          "Dock code*": blankOrTrim(p['DOCK'] || p['DOCK ']),
          "Supplier*": blankOrTrim(p['SUPL']),
          "Supplier plant code*": blankOrTrim(p['PLANT']),
          "Supplier shipping dock": blankOrTrim(p['S.DOCK']),
          "Previous process routing": "",
          "Dummy": "",
          "Kanban No.*": blankOrTrim(p['KBN']),
          "Source code*": blankOrTrim(t['Source'] || t['Source ']),
          "Hikiate matching key*": blankOrTrim(p['Dock Comb.']),
          "Model 1": blankOrTrim(p['Model Name']).substring(0, 4),
          "Life cycle code*": blankOrTrim(p['Life cycle code'] || p['Life Cycle Code']),
          "Vender share type": blankOrTrim(p['V.SHARE FLG[SYS L/O DATE BASIS]']),
          "Vender share value": blankOrTrim(p['V.SHARE VALUE']),
          "Order method*": blankOrTrim(p['ORD Method']),
          "Order lot*": blankOrTrim(p['QTY /CONT']),
          "Order lot size*": blankOrTrim(p['PACK QTY/CONT']),
          "Round up flag*": "3",
          "Part name*": blankOrTrim(p['PART DESC'])
        }
      });
    } else {
      // 🔴 ถ้าไม่มีข้อมูลใน Part Procure ให้เอามาใส่ Remind (เงื่อนไขเดียวกับ Handheld)
      if (!allPpMap.has(keyTG)) {
        remindData.push({
          "Dock IH": tgDock,
          "Supplier": supplier,
          "Part No": partNo,
          "Source": source,
          "Reason": "Missing in Part Procurement"
        });
      }
    }
  }

  return { rows, remindData, duplicateKeys, tgRows };
}

// The keyTG this matching pipeline already builds everywhere else, derived
// from a raw (unmatched) Target R/O row — used to turn
// findNewPartsSinceBatch's raw-row result into a Set for filtering
// buildMainFormatRows' output.
function keyTGSetFromTgRows(tgRowsRaw) {
  return new Set(tgRowsRaw.map((t) => {
    const dock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
    const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();
    return buildMatchKey(dock, partNo);
  }));
}

// Resolves the set of keyTG values that are "new since the previous/baseline
// batch" for batchId, reusing the exact same comparison as before — just
// exposed as a Set so it can filter buildMainFormatRows' already-built rows
// instead of a separate raw-row diff.
async function getNewKeyTGSet(db, batchId, tgRows) {
  const previousTgRows = await getPreviousTgRows(db, batchId);
  const newTgRows = findNewPartsSinceBatch(tgRows.map((r) => JSON.parse(r.data)), previousTgRows);
  return keyTGSetFromTgRows(newTgRows);
}

async function handleDownloadMain(req, res) {
  try {
    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) return res.status(400).json({ error: 'Template file not found.' });

    const { batchId, groups } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });
    const selectedGroups = groups ? groups.split(',') : [];

    const db = await connectDB();
    const groupPrefix = await getStoredGroupPrefix(db, batchId);
    const tgRows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
    const ppRows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

    const { ppMap } = buildPpIndex(ppRows, { excludePartDesc: ['WHEEL ASSY'] });

    const validRows = [];
    const isFirstOccurrence = createFirstOccurrenceTracker();
    for (const r of tgRows) {
      const t = JSON.parse(r.data);
      const { valid } = cleanTargetRow(t, { mode: 'main' });
      if (!valid) continue;

      const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
      const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();
      const source = String(t['Source'] || t['Source '] || '').trim();

      const keyTG = buildMatchKey(tgDock, partNo);
      if (!isFirstOccurrence(keyTG)) continue;

      const p = ppMap.get(keyTG);

      if (p) {
        const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();
        const shop = computeShop(ppDock, { mode: 'main' });

        if (shop === 'K') continue;

        t['Group'] = groupPrefix + shop + source;
        validRows.push({ target_data: t, proc_data: p });
      }
    }

    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const header = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 }).slice(0, 5);

    // .map(toExcelCellValue) here — not inside blankOrTrim — is the
    // aoa_to_sheet write boundary: it turns blankOrTrim's `''` back into
    // `null` so Excel sees a genuinely absent cell, not a blank string cell.
    const generateDataRow = (t, p) => [
      "AA", "B", blankOrTrim(t['Group']), "6", blankOrTrim(p['PART #'] || p['PART # ']).substring(0, 10),
      blankOrTrim(p['Suffix No']), blankOrTrim(p['COMP']), "S", blankOrTrim(p['Production Routing'] || p['Production Routing ']),
      blankOrTrim(p['DOCK'] || p['DOCK ']), blankOrTrim(p['SUPL']), blankOrTrim(p['PLANT']), blankOrTrim(p['S.DOCK']),
      "", "", blankOrTrim(p['KBN']), blankOrTrim(t['Source'] || t['Source ']), blankOrTrim(p['Dock Comb.']),
      blankOrTrim(p['Model Name']).substring(0, 4), blankOrTrim(p['Life Cycle Code'] || p['Life cycle code']),
      blankOrTrim(p['V.SHARE FLG[SYS L/O DATE BASIS]']), blankOrTrim(p['V.SHARE VALUE']),
      blankOrTrim(p['ORD Method']), blankOrTrim(p['QTY /CONT']), blankOrTrim(p['PACK QTY/CONT']),
      "3", blankOrTrim(p['PART DESC'])
    ].map(toExcelCellValue);

    if (selectedGroups.length === 1) {
      const groupName = selectedGroups[0];
      const dataRows = validRows.filter(r => r.target_data['Group'] === groupName).map(r => generateDataRow(r.target_data, r.proc_data));
      res.setHeader('Content-Disposition', `attachment; filename=PartList_${groupName}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(generateExcelBuffer(header, dataRows));
    } else {
      res.setHeader('Content-Disposition', `attachment; filename=PartList_Batches_${batchId}.zip`);
      res.setHeader('Content-Type', 'application/zip');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      const folderName = `PartList_${batchId}`; 
      for (const groupName of selectedGroups) {
        const dataRows = validRows.filter(r => r.target_data['Group'] === groupName).map(r => generateDataRow(r.target_data, r.proc_data));
        if (dataRows.length > 0) archive.append(generateExcelBuffer(header, dataRows), { name: `${folderName}/PartList_${groupName}.xlsx` });
      }
      await archive.finalize();
    }
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
}

router.get('/download-main', handleDownloadMain);

async function handlePreviewMain(req, res) {
  try {
    const { batchId, prefix } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();

    // Only an explicit prefix represents a real Merge action on this batch —
    // the no-prefix fallback is also used to passively re-view a (possibly
    // unrelated, non-active) batch from history, which must never broadcast.
    const isRealMergeAction = prefix !== undefined && prefix !== null;

    let groupPrefix;
    if (isRealMergeAction) {
      const { valid, error } = validateGroupPrefix(prefix);
      if (!valid) return res.status(400).json({ error });
      await setStoredGroupPrefix(db, batchId, prefix);
      groupPrefix = prefix;
    } else {
      groupPrefix = await getStoredGroupPrefix(db, batchId);
    }
    // Every prefix actually used for a batch — whether explicitly provided or
    // just the untouched stored/default value — goes into the suggestion
    // history the same way, including the default itself.
    await recordGroupPrefixUsage(db, groupPrefix);

    const { rows, remindData, duplicateKeys, tgRows } = await buildMainFormatRows(db, batchId, groupPrefix);
    const previewData = rows.map((r) => r.row);

    // New Parts = the subset of previewData (already fully-built, matched,
    // 27-column rows) whose keyTG is new since the previous/baseline batch —
    // a genuine filter of the same output, never a separately maintained
    // formatter. Surfaced as part of the Merge results (alongside
    // Remind/Hold), not at Target R/O upload time.
    const newKeyTGs = await getNewKeyTGSet(db, batchId, tgRows);
    const newParts = rows.filter((r) => newKeyTGs.has(r.keyTG)).map((r) => r.row);

    if (isRealMergeAction) emitEvent(EVENTS.BATCH_MERGE_UPDATED, { batchId });
    // 🔴 ส่งข้อมูล remind กลับไปพร้อมกัน
    res.json({ message: 'Success', count: previewData.length, data: previewData, remind: remindData, newParts, duplicateKeys });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
}

router.get('/preview-main', handlePreviewMain);

// Same 27-column layout/template as handleDownloadMain (reusing
// generateExcelBuffer, the same template file, and buildMainFormatRows) —
// filtered down to the New Parts subset instead of every matched row, so the
// file is structurally indistinguishable from a real Main Format export.
// Recomputes rather than trusting anything retained elsewhere, so this works
// even after the user navigates away and comes back. Zero new parts for a
// real batch produces the template's header rows plus the END sentinel and
// no data rows — an empty-but-valid file, the same shape handleDownloadMain
// itself would produce for an empty selection, not an error.
async function handleDownloadNewParts(req, res) {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();
    const batch = await db.get('SELECT batch_id FROM upload_batches WHERE batch_id = ?', batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) return res.status(400).json({ error: 'Template file not found.' });

    const groupPrefix = await getStoredGroupPrefix(db, batchId);
    const { rows, tgRows } = await buildMainFormatRows(db, batchId, groupPrefix);
    const newKeyTGs = await getNewKeyTGSet(db, batchId, tgRows);
    const newPartsRows = rows.filter((r) => newKeyTGs.has(r.keyTG)).map((r) => r.row);

    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const header = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 }).slice(0, 5);
    // Same aoa_to_sheet write-boundary conversion as generateDataRow above:
    // newPartsRows is built from buildMainFormatRows' blankOrTrim(...) row
    // objects, so '' needs to become null here before it reaches the sheet.
    const dataRows = newPartsRows.map((row) => Object.values(row).map(toExcelCellValue));

    res.setHeader('Content-Disposition', `attachment; filename=NewParts_${batchId}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(generateExcelBuffer(header, dataRows));
  } catch (error) {
    console.error('Download New Parts Error:', error);
    res.status(500).json({ error: 'Failed to generate new parts file' });
  }
}

router.get('/new-parts-since-last-batch/download', handleDownloadNewParts);

module.exports = router;
module.exports.handleDownloadMain = handleDownloadMain;
module.exports.handlePreviewMain = handlePreviewMain;
module.exports.handleDownloadNewParts = handleDownloadNewParts;