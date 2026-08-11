const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');
const { validateRequiredColumns, findDuplicateHeaders, REQUIRED_FIELDS_TARGET_RO } = require('../lib/validateColumns');
const { createBatchIfNotExists, getPreviousTgRows } = require('../lib/batches');
const { findNewPartsSinceBatch } = require('../lib/partMatching');
const { emitEvent, EVENTS } = require('../lib/socketHub');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Recomputes new-parts-since-previous-batch for batchId, rather than relying
// on anything retained anywhere else — used by the download endpoint so it
// works even after the user navigates away and comes back. New-parts
// detection surfaces to the user at Merge time (preview-main), not here;
// this endpoint only needs to recompute the same result for the file
// download.
async function computeNewParts(db, batchId) {
  const currentRaw = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
  const currentTgRows = currentRaw.map((r) => JSON.parse(r.data));
  const previousTgRows = await getPreviousTgRows(db, batchId);
  return { newParts: findNewPartsSinceBatch(currentTgRows, previousTgRows), currentTgRows };
}

async function handleTargetRoUpload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const batchId = req.body.batchId;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const headerRow = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
    const duplicates = findDuplicateHeaders(headerRow);
    const { valid, missing } = validateRequiredColumns(headerRow, REQUIRED_FIELDS_TARGET_RO);
    if (!valid) return res.status(400).json({ error: 'Missing required columns', missing });

    const rawData = xlsx.utils.sheet_to_json(sheet);

    const db = await connectDB();
    const now = new Date().toISOString();
    
    await db.exec('BEGIN TRANSACTION');
    
    try {
      await createBatchIfNotExists(db, batchId);
      const stmt = await db.prepare('INSERT INTO target_ro (batch_id, key_tg, data, upload_at) VALUES (?, ?, ?, ?)');
      for (const row of rawData) {
        await stmt.run([batchId, 'RAW', JSON.stringify(row), now]);
      }
      await stmt.finalize();

      await db.exec('COMMIT');
      emitEvent(EVENTS.BATCH_UPLOAD_UPDATED, { batchId });

      res.json({
        message: 'Target R/O RAW saved to DB successfully',
        batchId,
        warnings: duplicates.length > 0 ? { duplicateHeaders: duplicates } : undefined,
      });

    } catch (insertError) {
      await db.exec('ROLLBACK');
      console.error("Insert Error:", insertError);
      throw insertError; 
    }
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: 'Failed to process Target R/O' });
  }
}

router.post('/target-ro', upload.single('file'), handleTargetRoUpload);

// Recomputes rather than trusting anything retained from the original
// upload response, so this works even after the user navigates away and
// comes back. No batchId -> 400 (nothing to look up). Batch not found ->
// 404 (a clear, distinct error from "found but nothing new"). Zero new
// parts for a real batch -> an empty-but-valid .xlsx (header row only, using
// the batch's own Target R/O columns) rather than an error: "no new parts
// this run" is an expected, common outcome, not a failure, and the frontend
// download button should always produce something openable.
async function handleDownloadNewParts(req, res) {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();
    const batch = await db.get('SELECT batch_id FROM upload_batches WHERE batch_id = ?', batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const { newParts, currentTgRows } = await computeNewParts(db, batchId);

    const wb = xlsx.utils.book_new();
    const ws = newParts.length > 0
      ? xlsx.utils.json_to_sheet(newParts)
      : xlsx.utils.aoa_to_sheet([currentTgRows.length > 0 ? Object.keys(currentTgRows[0]) : []]);
    xlsx.utils.book_append_sheet(wb, ws, 'New Parts');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=NewParts_${batchId}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Download New Parts Error:', error);
    res.status(500).json({ error: 'Failed to generate new parts file' });
  }
}

router.get('/new-parts-since-last-batch/download', handleDownloadNewParts);

module.exports = router;
module.exports.handleTargetRoUpload = handleTargetRoUpload;
module.exports.handleDownloadNewParts = handleDownloadNewParts;