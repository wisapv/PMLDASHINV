const test = require('node:test');
const assert = require('node:assert');
const { initDB, connectDB } = require('../database');
const { recordGroupPrefixUsage } = require('../lib/groupPrefix');
const { handleGetGroupPrefixHistory, handleDeleteGroupPrefixHistory } = require('./groupPrefixHistoryRoute');

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  };
}

async function cleanupPrefix(prefix) {
  const db = await connectDB();
  await db.run('DELETE FROM group_prefix_history WHERE prefix = ?', prefix);
}

test.before(async () => {
  await initDB();
});

test('handleGetGroupPrefixHistory: returns entries sorted most-recent-first', async () => {
  const db = await connectDB();
  const older = 'TESTROUTE-OLD-' + Date.now();
  const newer = 'TESTROUTE-NEW-' + Date.now();
  try {
    await recordGroupPrefixUsage(db, older);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await recordGroupPrefixUsage(db, newer);

    const res = mockRes();
    await handleGetGroupPrefixHistory({}, res);

    assert.strictEqual(res.statusCode, 200);
    const prefixes = res.body.map((r) => r.prefix);
    const olderIdx = prefixes.indexOf(older);
    const newerIdx = prefixes.indexOf(newer);
    assert.ok(olderIdx !== -1 && newerIdx !== -1);
    assert.ok(newerIdx < olderIdx);
  } finally {
    await cleanupPrefix(older);
    await cleanupPrefix(newer);
  }
});

test('handleDeleteGroupPrefixHistory: deletes an existing entry', async () => {
  const db = await connectDB();
  const prefix = 'TESTROUTE-DEL-' + Date.now();
  try {
    await recordGroupPrefixUsage(db, prefix);

    const res = mockRes();
    await handleDeleteGroupPrefixHistory({ params: { prefix } }, res);

    assert.strictEqual(res.statusCode, 200);
    const row = await db.get('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.strictEqual(row, undefined);
  } finally {
    await cleanupPrefix(prefix);
  }
});

test('handleDeleteGroupPrefixHistory: 404 when the prefix is not in history', async () => {
  const res = mockRes();
  await handleDeleteGroupPrefixHistory({ params: { prefix: 'TESTROUTE-MISSING-' + Date.now() } }, res);
  assert.strictEqual(res.statusCode, 404);
});
