const test = require('node:test');
const assert = require('node:assert');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { initDB, connectDB } = require('../database');
const {
  generateBatchId,
  createBatchIfNotExists,
  setActiveBatch,
  getActiveBatchId,
  setBaselineBatch,
  getBaselineBatchId,
  getPreviousBatchId,
} = require('./batches');

// A throwaway in-memory DB, isolated from the real shared database file (and
// therefore safe from races with other concurrently-running test files), for
// asserting the genuinely-nothing-has-ever-been-active case.
async function openEmptyInMemoryDb() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE upload_batches (
      batch_id TEXT PRIMARY KEY,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

// Inserts a batch row with an explicit upload_date, bypassing
// createBatchIfNotExists's "now" timestamp — needed to deterministically
// control creation order for getPreviousBatchId tests without relying on
// real-time gaps between calls.
async function insertBatchAt(db, batchId, isoDate) {
  await db.run('INSERT INTO upload_batches (batch_id, upload_date) VALUES (?, ?)', [batchId, isoDate]);
}

test.before(async () => {
  await initDB();
});

test('generateBatchId: produces a B-YYYYMMDD-HHMMSS style id', () => {
  const id = generateBatchId();
  assert.match(id, /^B-\d{8}-\d{6}$/);
});

test('createBatchIfNotExists: is idempotent, does not error on repeated calls', async () => {
  const db = await connectDB();
  const batchId = 'TEST-BATCHES-CREATE-' + Date.now();
  try {
    await createBatchIfNotExists(db, batchId);
    await createBatchIfNotExists(db, batchId);
    const rows = await db.all('SELECT * FROM upload_batches WHERE batch_id = ?', batchId);
    assert.strictEqual(rows.length, 1);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('setActiveBatch / getActiveBatchId: activating a new batch deactivates the previous one', async () => {
  const db = await connectDB();
  const batchA = 'TEST-BATCHES-A-' + Date.now();
  const batchB = 'TEST-BATCHES-B-' + Date.now();
  try {
    await createBatchIfNotExists(db, batchA);
    await createBatchIfNotExists(db, batchB);

    await setActiveBatch(db, batchA);
    assert.strictEqual(await getActiveBatchId(db), batchA);

    await setActiveBatch(db, batchB);
    assert.strictEqual(await getActiveBatchId(db), batchB);

    const rowA = await db.get('SELECT is_active FROM upload_batches WHERE batch_id = ?', batchA);
    assert.strictEqual(rowA.is_active, 0);
  } finally {
    await cleanupBatch(batchA);
    await cleanupBatch(batchB);
  }
});

test('setActiveBatch: at most one row is ever active across several sequential calls', async () => {
  const db = await connectDB();
  const batchIds = ['TEST-BATCHES-SEQ1-' + Date.now(), 'TEST-BATCHES-SEQ2-' + Date.now(), 'TEST-BATCHES-SEQ3-' + Date.now()];
  try {
    for (const id of batchIds) await createBatchIfNotExists(db, id);
    for (const id of batchIds) await setActiveBatch(db, id);

    const activeRows = await db.all('SELECT batch_id FROM upload_batches WHERE is_active = 1');
    assert.strictEqual(activeRows.length, 1);
    assert.strictEqual(activeRows[0].batch_id, batchIds[batchIds.length - 1]);
  } finally {
    for (const id of batchIds) await cleanupBatch(id);
  }
});

test('getActiveBatchId: returns null in a database where no batch was ever active', async () => {
  const emptyDb = await openEmptyInMemoryDb();
  assert.strictEqual(await getActiveBatchId(emptyDb), null);
  await emptyDb.close();
});

test('getActiveBatchId: a batch that is created but never activated does not become the active one', async () => {
  // Deliberately scoped to a single batch_id rather than asserting on the
  // whole table — this DB file is shared with other concurrently-running
  // test files/processes, so a table-wide mutation here would race them.
  const db = await connectDB();
  const batchId = 'TEST-BATCHES-NEVERACTIVE-' + Date.now();
  try {
    await createBatchIfNotExists(db, batchId);
    const row = await db.get('SELECT is_active FROM upload_batches WHERE batch_id = ?', batchId);
    assert.strictEqual(row.is_active, 0);
    assert.notStrictEqual(await getActiveBatchId(db), batchId);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('setBaselineBatch / getBaselineBatchId: pinning a new baseline unsets the previous one', async () => {
  const db = await connectDB();
  const batchA = 'TEST-BATCHES-BASELINE-A-' + Date.now();
  const batchB = 'TEST-BATCHES-BASELINE-B-' + Date.now();
  try {
    await createBatchIfNotExists(db, batchA);
    await createBatchIfNotExists(db, batchB);

    await setBaselineBatch(db, batchA);
    assert.strictEqual(await getBaselineBatchId(db), batchA);

    await setBaselineBatch(db, batchB);
    assert.strictEqual(await getBaselineBatchId(db), batchB);

    const rowA = await db.get('SELECT is_baseline FROM upload_batches WHERE batch_id = ?', batchA);
    assert.strictEqual(rowA.is_baseline, 0);
  } finally {
    await cleanupBatch(batchA);
    await cleanupBatch(batchB);
  }
});

test('setBaselineBatch: at most one row is ever the baseline across several sequential calls', async () => {
  const db = await connectDB();
  const batchIds = ['TEST-BATCHES-BLSEQ1-' + Date.now(), 'TEST-BATCHES-BLSEQ2-' + Date.now(), 'TEST-BATCHES-BLSEQ3-' + Date.now()];
  try {
    for (const id of batchIds) await createBatchIfNotExists(db, id);
    for (const id of batchIds) await setBaselineBatch(db, id);

    const baselineRows = await db.all('SELECT batch_id FROM upload_batches WHERE is_baseline = 1');
    assert.strictEqual(baselineRows.length, 1);
    assert.strictEqual(baselineRows[0].batch_id, batchIds[batchIds.length - 1]);
  } finally {
    for (const id of batchIds) await cleanupBatch(id);
  }
});

test('getBaselineBatchId: returns null in a database where no batch was ever pinned as baseline', async () => {
  const emptyDb = await openEmptyInMemoryDb();
  await emptyDb.exec('ALTER TABLE upload_batches ADD COLUMN is_baseline INTEGER NOT NULL DEFAULT 0');
  assert.strictEqual(await getBaselineBatchId(emptyDb), null);
  await emptyDb.close();
});

test('getPreviousBatchId: returns null when there is no baseline and no earlier batch (first-ever batch)', async () => {
  const db = await connectDB();
  const onlyBatch = 'TEST-BATCHES-PREV-FIRST-' + Date.now();
  try {
    await insertBatchAt(db, onlyBatch, '2026-01-01T00:00:00.000Z');
    assert.strictEqual(await getPreviousBatchId(db, onlyBatch), null);
  } finally {
    await cleanupBatch(onlyBatch);
  }
});

test('getPreviousBatchId: falls back to the chronologically-previous batch when no baseline is set', async () => {
  const db = await connectDB();
  const older = 'TEST-BATCHES-PREV-OLDER-' + Date.now();
  const newer = 'TEST-BATCHES-PREV-NEWER-' + Date.now();
  try {
    await insertBatchAt(db, older, '2026-01-01T00:00:00.000Z');
    await insertBatchAt(db, newer, '2026-02-01T00:00:00.000Z');
    assert.strictEqual(await getPreviousBatchId(db, newer), older);
  } finally {
    await cleanupBatch(older);
    await cleanupBatch(newer);
  }
});

test('getPreviousBatchId: prefers an explicitly-set baseline over the chronologically-previous batch', async () => {
  const db = await connectDB();
  const oldest = 'TEST-BATCHES-PREV-BASE-' + Date.now();
  const middle = 'TEST-BATCHES-PREV-MID-' + Date.now();
  const current = 'TEST-BATCHES-PREV-CUR-' + Date.now();
  try {
    await insertBatchAt(db, oldest, '2026-01-01T00:00:00.000Z');
    await insertBatchAt(db, middle, '2026-02-01T00:00:00.000Z');
    await insertBatchAt(db, current, '2026-03-01T00:00:00.000Z');

    // Without a baseline, the chronologically-previous batch (middle) wins.
    assert.strictEqual(await getPreviousBatchId(db, current), middle);

    // Pinning the older batch as baseline overrides that, regardless of age.
    await setBaselineBatch(db, oldest);
    assert.strictEqual(await getPreviousBatchId(db, current), oldest);
  } finally {
    await cleanupBatch(oldest);
    await cleanupBatch(middle);
    await cleanupBatch(current);
  }
});
