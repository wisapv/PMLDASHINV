const test = require('node:test');
const assert = require('node:assert');
const xlsx = require('xlsx');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handleTargetRoUpload } = require('./targetRoRoute');

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

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM target_ro WHERE batch_id = ?', batchId);
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

test.before(async () => {
  await initDB();
});

test('handleTargetRoUpload: duplicate header no longer blocks upload, returns 200 with warnings, row inserted', async () => {
  const batchId = 'TEST-TG-DUP-' + Date.now();
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source', 'Supplier'];
  const dataRow = ['123456789012', 'ABC', 'SW', '1', 'XYZ'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  try {
    await handleTargetRoUpload(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.batchId, batchId);
    assert.deepStrictEqual(res.body.warnings, { duplicateHeaders: ['Supplier'] });

    const db = await connectDB();
    const rows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(JSON.parse(rows[0].data)['Part No 12 Digits'], '123456789012');
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handleTargetRoUpload: response omits warnings key entirely when there are no duplicates', async () => {
  const batchId = 'TEST-TG-CLEAN-' + Date.now();
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source'];
  const dataRow = ['123456789012', 'ABC', 'SW', '1'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  try {
    await handleTargetRoUpload(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(res.body, 'warnings'), false);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handleTargetRoUpload: regression — missing required column is still rejected with 400, nothing inserted', async () => {
  const batchId = 'TEST-TG-MISSING-' + Date.now();
  const headers = ['Part No 12 Digits']; // missing Supplier, Dock IH routing, Source
  const dataRow = ['123456789012'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const req = mockReq(buffer, batchId);
  const res = mockRes();

  await handleTargetRoUpload(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Missing required columns');
  assert.deepStrictEqual(res.body.missing.sort(), ['DOCK_IH', 'SOURCE', 'SUPPLIER'].sort());

  const db = await connectDB();
  const rows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
  assert.strictEqual(rows.length, 0);
});

test('handleTargetRoUpload: emits batch:uploadUpdated on success', async () => {
  const batchId = 'TEST-TG-EMIT-' + Date.now();
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source'];
  const dataRow = ['123456789012', 'ABC', 'SW', '1'];
  const buffer = bufferFromAoa([headers, dataRow]);

  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });

  try {
    await handleTargetRoUpload(mockReq(buffer, batchId), mockRes());
    assert.ok(emitted.some((e) => e.name === EVENTS.BATCH_UPLOAD_UPDATED && e.payload.batchId === batchId));
  } finally {
    await cleanupBatch(batchId);
  }
});
