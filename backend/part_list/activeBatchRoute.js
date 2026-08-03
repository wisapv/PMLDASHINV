const express = require('express');
const { connectDB } = require('../database');
const { generateBatchId, createBatchIfNotExists, setActiveBatch, getActiveBatchId } = require('../lib/batches');
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

router.get('/current-batch', handleGetCurrentBatch);
router.post('/start-new-batch', handleStartNewBatch);

module.exports = router;
module.exports.handleGetCurrentBatch = handleGetCurrentBatch;
module.exports.handleStartNewBatch = handleStartNewBatch;
