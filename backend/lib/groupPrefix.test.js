const test = require('node:test');
const assert = require('node:assert');
const { initDB, connectDB } = require('../database');
const { DEFAULT_GROUP_PREFIX, validateGroupPrefix, getStoredGroupPrefix, setStoredGroupPrefix } = require('./groupPrefix');

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

test.before(async () => {
  await initDB();
});

test('validateGroupPrefix: rejects empty and whitespace-only strings', () => {
  assert.strictEqual(validateGroupPrefix('').valid, false);
  assert.strictEqual(validateGroupPrefix('   ').valid, false);
});

test('validateGroupPrefix: rejects each Windows-filename-invalid character', () => {
  for (const ch of ['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
    const result = validateGroupPrefix(`AB${ch}CD`);
    assert.strictEqual(result.valid, false, `expected "${ch}" to be rejected`);
  }
});

test('validateGroupPrefix: accepts a plain alphanumeric prefix', () => {
  assert.strictEqual(validateGroupPrefix('SR481D').valid, true);
  assert.strictEqual(validateGroupPrefix('CUSTOM-1').valid, true);
});

test('getStoredGroupPrefix: falls back to DEFAULT_GROUP_PREFIX for a batch that was never set', async () => {
  const db = await connectDB();
  const batchId = 'TEST-LIB-GP-UNSET-' + Date.now();
  await db.run('INSERT INTO upload_batches (batch_id) VALUES (?)', batchId);
  try {
    const prefix = await getStoredGroupPrefix(db, batchId);
    assert.strictEqual(prefix, DEFAULT_GROUP_PREFIX);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('getStoredGroupPrefix: falls back to DEFAULT_GROUP_PREFIX when the batch row does not exist at all', async () => {
  const db = await connectDB();
  const prefix = await getStoredGroupPrefix(db, 'TEST-LIB-GP-MISSING-' + Date.now());
  assert.strictEqual(prefix, DEFAULT_GROUP_PREFIX);
});

test('setStoredGroupPrefix then getStoredGroupPrefix: round-trips the stored value', async () => {
  const db = await connectDB();
  const batchId = 'TEST-LIB-GP-ROUNDTRIP-' + Date.now();
  await db.run('INSERT INTO upload_batches (batch_id) VALUES (?)', batchId);
  try {
    await setStoredGroupPrefix(db, batchId, 'MYPFX');
    assert.strictEqual(await getStoredGroupPrefix(db, batchId), 'MYPFX');

    await setStoredGroupPrefix(db, batchId, 'MYPFX2');
    assert.strictEqual(await getStoredGroupPrefix(db, batchId), 'MYPFX2');
  } finally {
    await cleanupBatch(batchId);
  }
});
