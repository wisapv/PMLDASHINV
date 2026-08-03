const test = require('node:test');
const assert = require('node:assert');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handlePreviewHandheld } = require('./handheldRoute');

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  };
}

async function seedBatch(batchId) {
  const db = await connectDB();
  const now = new Date().toISOString();
  await db.run('INSERT OR IGNORE INTO upload_batches (batch_id, upload_date) VALUES (?, ?)', [batchId, now]);

  const tgRow = {
    'Part No 12 Digits': '123456789012',
    'Supplier': 'SUPX',
    'Dock IH routing': 'ZZ',
    'Source': '1',
  };
  await db.run(
    'INSERT INTO target_ro (batch_id, key_tg, data, upload_at) VALUES (?, ?, ?, ?)',
    [batchId, 'RAW', JSON.stringify(tgRow), now]
  );

  const ppRow = {
    'T/C TO (UNL)': '20991231',
    'DOCK': 'ZZ',
    'Production Routing': '',
    'PART #': '123456789012',
    'PART DESC': 'TEST PART',
    'COMP': 'C1',
    'SUPL': 'SUPX',
    'PLANT': 'P1',
    'S.DOCK': 'SD1',
    'KBN': 'K1',
    'Model Name': 'MODL',
    'Life Cycle Code': 'L1',
    'V.SHARE FLG[SYS L/O DATE BASIS]': 'V1',
    'V.SHARE VALUE': 'VV1',
    'ORD Method': 'OM1',
    'QTY /CONT': '10',
    'PACK QTY/CONT': '20',
  };
  await db.run(
    'INSERT INTO part_procurement (batch_id, key_pp, data, upload_at) VALUES (?, ?, ?, ?)',
    [batchId, 'RAW', JSON.stringify(ppRow), now]
  );
}

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM target_ro WHERE batch_id = ?', batchId);
  await db.run('DELETE FROM part_procurement WHERE batch_id = ?', batchId);
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

test.before(async () => {
  await initDB();
});

test('handlePreviewHandheld: emits handheld:updated on success', async () => {
  const batchId = 'TEST-HH-EMIT-' + Date.now();
  await seedBatch(batchId);
  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });

  try {
    const res = mockRes();
    await handlePreviewHandheld({ query: { batchId } }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(emitted.some((e) => e.name === EVENTS.HANDHELD_UPDATED && e.payload.batchId === batchId));
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handlePreviewHandheld: regression — missing batchId still rejected with 400', async () => {
  const res = mockRes();
  await handlePreviewHandheld({ query: {} }, res);
  assert.strictEqual(res.statusCode, 400);
});
