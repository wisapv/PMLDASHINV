const express = require('express');
const { connectDB } = require('../database');
const { generateBatchId, createBatchIfNotExists, setActiveBatch, getActiveBatchId, setBaselineBatch } = require('../lib/batches');
const { emitEvent, EVENTS } = require('../lib/socketHub');

const router = express.Router();

async function handleGetCurrentBatch(req, res) {
  try {
    const db = await connectDB();
    const batchId = await getActiveBatchId(db);
    res.json({ batchId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current batch' });
  }
}

async function handleStartNewBatch(req, res) {
  try {
    const db = await connectDB();
    const batchId = generateBatchId();
    await createBatchIfNotExists(db, batchId);
    await setActiveBatch(db, batchId);
    emitEvent(EVENTS.BATCH_CHANGED, { batchId });
    res.json({ batchId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start new batch' });
  }
}

// This is a shared/global setting, not per-user — same as is_active above.
async function handleSetBaselineBatch(req, res) {
  try {
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();
    const batch = await db.get('SELECT batch_id FROM upload_batches WHERE batch_id = ?', batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    await setBaselineBatch(db, batchId);
    res.json({ batchId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set baseline batch' });
  }
}

router.get('/current-batch', handleGetCurrentBatch);
router.post('/start-new-batch', handleStartNewBatch);
router.post('/set-baseline-batch', handleSetBaselineBatch);

module.exports = router;
module.exports.handleGetCurrentBatch = handleGetCurrentBatch;
module.exports.handleStartNewBatch = handleStartNewBatch;
module.exports.handleSetBaselineBatch = handleSetBaselineBatch;
