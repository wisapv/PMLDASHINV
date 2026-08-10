const test = require('node:test');
const assert = require('node:assert');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handleGetCurrentBatch, handleStartNewBatch, handleSetBaselineBatch } = require('./activeBatchRoute');
const { createBatchIfNotExists, setActiveBatch, getBaselineBatchId } = require('../lib/batches');

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  };
}

function mockSocketHub() {
  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });
  return emitted;
}

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

test.before(async () => {
  await initDB();
});

test('handleStartNewBatch: creates and activates a new batch, and handleGetCurrentBatch reports it', async () => {
  const emitted = mockSocketHub();
  const res = mockRes();
  await handleStartNewBatch({}, res);

  const newBatchId = res.body.batchId;
  try {
    assert.strictEqual(res.statusCode, 200);
    assert.match(newBatchId, /^B-\d{8}-\d{6}$/);

    const getRes = mockRes();
    await handleGetCurrentBatch({}, getRes);
    assert.strictEqual(getRes.body.batchId, newBatchId);

    assert.ok(emitted.some((e) => e.name === EVENTS.BATCH_CHANGED && e.payload.batchId === newBatchId));
  } finally {
    await cleanupBatch(newBatchId);
  }
});

test('handleStartNewBatch: deactivates whatever batch was previously active', async () => {
  mockSocketHub();
  const db = await connectDB();
  const previouslyActiveBatchId = 'TEST-ACTIVEROUTE-PREV-' + Date.now();
  await createBatchIfNotExists(db, previouslyActiveBatchId);
  await setActiveBatch(db, previouslyActiveBatchId);

  const res = mockRes();
  await handleStartNewBatch({}, res);
  const newBatchId = res.body.batchId;

  try {
    assert.notStrictEqual(newBatchId, previouslyActiveBatchId);

    const getRes = mockRes();
    await handleGetCurrentBatch({}, getRes);
    assert.strictEqual(getRes.body.batchId, newBatchId);

    const prevRow = await db.get('SELECT is_active FROM upload_batches WHERE batch_id = ?', previouslyActiveBatchId);
    assert.strictEqual(prevRow.is_active, 0);
  } finally {
    await cleanupBatch(previouslyActiveBatchId);
    await cleanupBatch(newBatchId);
  }
});

test('handleGetCurrentBatch: a batch that was created but never activated is not reported as current', async () => {
  // The genuinely-empty-table -> { batchId: null } case is covered in
  // lib/batches.test.js against an isolated in-memory DB; a table-wide
  // assertion isn't safe here since this DB file is shared with
  // concurrently-running test files/processes.
  const db = await connectDB();
  const batchId = 'TEST-ACTIVEROUTE-INACTIVE-' + Date.now();
  await createBatchIfNotExists(db, batchId);

  try {
    const getRes = mockRes();
    await handleGetCurrentBatch({}, getRes);
    assert.notStrictEqual(getRes.body.batchId, batchId);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handleSetBaselineBatch: sets the given batch as baseline and unsets any previous one, even across repeated calls', async () => {
  const db = await connectDB();
  const batchA = 'TEST-ACTIVEROUTE-BASELINE-A-' + Date.now();
  const batchB = 'TEST-ACTIVEROUTE-BASELINE-B-' + Date.now();
  await createBatchIfNotExists(db, batchA);
  await createBatchIfNotExists(db, batchB);

  try {
    const resA = mockRes();
    await handleSetBaselineBatch({ body: { batchId: batchA } }, resA);
    assert.strictEqual(resA.statusCode, 200);
    assert.strictEqual(resA.body.batchId, batchA);
    assert.strictEqual(await getBaselineBatchId(db), batchA);

    const resB = mockRes();
    await handleSetBaselineBatch({ body: { batchId: batchB } }, resB);
    assert.strictEqual(await getBaselineBatchId(db), batchB);

    // Repeated call with the same batch is idempotent — still exactly one baseline.
    await handleSetBaselineBatch({ body: { batchId: batchB } }, mockRes());
    const baselineRows = await db.all('SELECT batch_id FROM upload_batches WHERE is_baseline = 1');
    assert.strictEqual(baselineRows.length, 1);
    assert.strictEqual(baselineRows[0].batch_id, batchB);
  } finally {
    await cleanupBatch(batchA);
    await cleanupBatch(batchB);
  }
});

test('handleSetBaselineBatch: missing batchId is a 400, unknown batchId is a 404', async () => {
  const missingRes = mockRes();
  await handleSetBaselineBatch({ body: {} }, missingRes);
  assert.strictEqual(missingRes.statusCode, 400);

  const notFoundRes = mockRes();
  await handleSetBaselineBatch({ body: { batchId: 'TEST-ACTIVEROUTE-NOPE-' + Date.now() } }, notFoundRes);
  assert.strictEqual(notFoundRes.statusCode, 404);
});
