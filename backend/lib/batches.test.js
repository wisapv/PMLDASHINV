const test = require('node:test');
const assert = require('node:assert');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { initDB, connectDB } = require('../database');
const { generateBatchId, createBatchIfNotExists, setActiveBatch, getActiveBatchId } = require('./batches');

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
