const test = require('node:test');
const assert = require('node:assert');
const xlsx = require('xlsx');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handlePartProcurementUpload } = require('./partProcRoute');

function bufferFromAoa(aoa) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(aoa);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Bypasses multer (applied as route middleware before this handler runs in
// production) and the HTTP layer entirely — invokes the handler directly with
// a req shaped the way multer would have left it, against the real DB.
function mockReq(buffer, batchId) {
  return { file: { buffer }, body: { batchId } };
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    // Round-trip through JSON like the real wire format Express's res.json()
    // produces — undefined-valued keys are dropped, matching what a real
    // client would actually see.
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  };
}

const FULL_HEADERS = [
  'T/C TO (UNL)', 'DOCK', 'Production Routing', 'PART #', 'PART DESC', 'COMP', 'SUPL',
  'PLANT', 'S.DOCK', 'KBN', 'Model Name', 'Life Cycle Code', 'V.SHARE FLG[SYS L/O DATE BASIS]',
  'V.SHARE VALUE', 'ORD Method', 'QTY /CONT', 'PACK QTY/CONT',
];
const FULL_DATA_ROW = [
  '20991231', 'SW', 'SW', 'PARTDUP001', 'DUP TEST PART', 'C1', 'S1',
  'P1', 'SD1', 'K1', 'MODL', 'L1', 'V1',
  'VV1', 'OM1', '10', '20',
];

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM part_procurement WHERE batch_id = ?', batchId);
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

test.before(async () => {
  await initDB();
});

test('handlePartProcurementUpload: duplicate PLANT header no longer blocks upload, returns 200 with warnings, row inserted', async () => {
  const batchId = 'TEST-PP-DUP-' + Date.now();
  const headers = [...FULL_HEADERS, 'PLANT']; // PLANT duplicated
  const dataRow = [...FULL_DATA_ROW, 'P2'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  try {
    await handlePartProcurementUpload(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.batchId, batchId);
    assert.deepStrictEqual(res.body.warnings, { duplicateHeaders: ['PLANT'] });

    const db = await connectDB();
    const rows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(JSON.parse(rows[0].data)['PART #'], 'PARTDUP001');
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handlePartProcurementUpload: response omits warnings key entirely when there are no duplicates', async () => {
  const batchId = 'TEST-PP-CLEAN-' + Date.now();
  const buffer = bufferFromAoa([FULL_HEADERS, FULL_DATA_ROW]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  try {
    await handlePartProcurementUpload(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(res.body, 'warnings'), false);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handlePartProcurementUpload: regression — missing required column is still rejected with 400, nothing inserted', async () => {
  const batchId = 'TEST-PP-MISSING-' + Date.now();
  const headers = ['DOCK', 'PART #']; // missing most required columns
  const dataRow = ['SW', 'PARTX001'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  await handlePartProcurementUpload(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Missing required columns');
  assert.ok(res.body.missing.includes('V_SHARE_VALUE'));

  const db = await connectDB();
  const rows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);
  assert.strictEqual(rows.length, 0);
});

test('handlePartProcurementUpload: emits batch:uploadUpdated on success', async () => {
  const batchId = 'TEST-PP-EMIT-' + Date.now();
  const buffer = bufferFromAoa([FULL_HEADERS, FULL_DATA_ROW]);

  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });

  try {
    await handlePartProcurementUpload(mockReq(buffer, batchId), mockRes());
    assert.ok(emitted.some((e) => e.name === EVENTS.BATCH_UPLOAD_UPDATED && e.payload.batchId === batchId));
  } finally {
    await cleanupBatch(batchId);
  }
});
