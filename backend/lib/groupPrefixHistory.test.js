const test = require('node:test');
const assert = require('node:assert');
const { initDB, connectDB } = require('../database');
const { recordGroupPrefixUsage, listGroupPrefixHistory, deleteGroupPrefixHistory } = require('./groupPrefix');

async function cleanupPrefix(prefix) {
  const db = await connectDB();
  await db.run('DELETE FROM group_prefix_history WHERE prefix = ?', prefix);
}

test.before(async () => {
  await initDB();
});

test('recordGroupPrefixUsage: inserts a new prefix into history', async () => {
  const db = await connectDB();
  const prefix = 'TESTHIST1-' + Date.now();
  try {
    await recordGroupPrefixUsage(db, prefix);
    const row = await db.get('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.ok(row);
    assert.strictEqual(row.prefix, prefix);
    assert.ok(row.last_used_at);
  } finally {
    await cleanupPrefix(prefix);
  }
});

test('recordGroupPrefixUsage: re-recording the same prefix updates last_used_at instead of duplicating', async () => {
  const db = await connectDB();
  const prefix = 'TESTHIST2-' + Date.now();
  try {
    await recordGroupPrefixUsage(db, prefix);
    const firstRow = await db.get('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);

    await new Promise((resolve) => setTimeout(resolve, 10));
    await recordGroupPrefixUsage(db, prefix);

    const rows = await db.all('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.strictEqual(rows.length, 1);
    assert.ok(rows[0].last_used_at >= firstRow.last_used_at);
  } finally {
    await cleanupPrefix(prefix);
  }
});

test('listGroupPrefixHistory: returns entries sorted most-recent-first', async () => {
  const db = await connectDB();
  const older = 'TESTHIST-OLD-' + Date.now();
  const newer = 'TESTHIST-NEW-' + Date.now();
  try {
    await recordGroupPrefixUsage(db, older);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await recordGroupPrefixUsage(db, newer);

    const history = await listGroupPrefixHistory(db);
    const olderIdx = history.findIndex((h) => h.prefix === older);
    const newerIdx = history.findIndex((h) => h.prefix === newer);
    assert.ok(olderIdx !== -1 && newerIdx !== -1);
    assert.ok(newerIdx < olderIdx);
  } finally {
    await cleanupPrefix(older);
    await cleanupPrefix(newer);
  }
});

test('deleteGroupPrefixHistory: removes only the history row, leaving a batch that used it unaffected', async () => {
  const db = await connectDB();
  const prefix = 'TESTHIST-DEL-' + Date.now();
  const batchId = 'TEST-HISTDEL-BATCH-' + Date.now();
  try {
    await db.run('INSERT INTO upload_batches (batch_id, group_prefix) VALUES (?, ?)', [batchId, prefix]);
    await recordGroupPrefixUsage(db, prefix);

    const deleted = await deleteGroupPrefixHistory(db, prefix);
    assert.strictEqual(deleted, true);

    const historyRow = await db.get('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.strictEqual(historyRow, undefined);

    const batchRow = await db.get('SELECT group_prefix FROM upload_batches WHERE batch_id = ?', batchId);
    assert.strictEqual(batchRow.group_prefix, prefix);
  } finally {
    await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
    await cleanupPrefix(prefix);
  }
});

test('deleteGroupPrefixHistory: returns false when the prefix is not present', async () => {
  const db = await connectDB();
  const deleted = await deleteGroupPrefixHistory(db, 'TESTHIST-MISSING-' + Date.now());
  assert.strictEqual(deleted, false);
});
