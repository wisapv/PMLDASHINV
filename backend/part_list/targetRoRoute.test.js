const test = require('node:test');
const assert = require('node:assert');
const xlsx = require('xlsx');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handleTargetRoUpload, handleDownloadNewParts } = require('./targetRoRoute');

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
    headers: {},
    status(code) { this.statusCode = code; return this; },
    // Round-trip through JSON like the real wire format Express's res.json()
    // produces — undefined-valued keys are dropped, matching what a real
    // client would actually see.
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
    setHeader(key, value) { this.headers[key] = value; },
    send(buf) { this.body = buf; return this; },
  };
}

async function cleanupBatch(batchId) {
  const db = await connectDB();
  await db.run('DELETE FROM target_ro WHERE batch_id = ?', batchId);
  await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
}

// getPreviousBatchId's chronological fallback does a genuinely global,
// unscoped "most recent batch before this one" query — a real "now"
// timestamp for both batches (even a minute apart) leaves a window where
// some other, concurrently-running test file's own real-time batch could
// land in between and get picked instead. handleTargetRoUpload always
// creates its batch row via createBatchIfNotExists, which is INSERT OR
// IGNORE — pre-inserting the row ourselves with a fully controlled date in a
// year no other test uses (2099) makes ordering deterministic and immune to
// any real-time interloper, since the later INSERT OR IGNORE is a no-op.
async function preCreateBatchAt(batchId, isoDate) {
  const db = await connectDB();
  await db.run('INSERT INTO upload_batches (batch_id, upload_date) VALUES (?, ?)', [batchId, isoDate]);
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

test('handleTargetRoUpload: response no longer includes a newParts field — new-parts detection now surfaces at Merge time instead', async () => {
  const batchId = 'TEST-TG-NONEWPARTS-' + Date.now();
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source'];
  const buffer = bufferFromAoa([headers, ['123456789012', 'ABC', 'SW', '1']]);

  try {
    const res = mockRes();
    await handleTargetRoUpload(mockReq(buffer, batchId), res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(res.body, 'newParts'), false);
  } finally {
    await cleanupBatch(batchId);
  }
});

test('handleDownloadNewParts: produces a valid .xlsx with the expected new-part rows and full original columns', async () => {
  const previousBatchId = 'TEST-TG-DLNEW-PREV-' + Date.now();
  const currentBatchId = 'TEST-TG-DLNEW-CUR-' + Date.now();
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source'];

  try {
    await preCreateBatchAt(previousBatchId, '2099-01-01T00:00:00.000Z');
    const previousBuffer = bufferFromAoa([headers, ['111111111111', 'ABC', 'SW', '1']]);
    await handleTargetRoUpload(mockReq(previousBuffer, previousBatchId), mockRes());

    await preCreateBatchAt(currentBatchId, '2099-02-01T00:00:00.000Z');
    const currentBuffer = bufferFromAoa([headers, ['111111111111', 'ABC', 'SW', '1'], ['222222222222', 'XYZ', 'ST', '2']]);
    await handleTargetRoUpload(mockReq(currentBuffer, currentBatchId), mockRes());

    const res = mockRes();
    await handleDownloadNewParts({ query: { batchId: currentBatchId } }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Buffer.isBuffer(res.body));

    const wb = xlsx.read(res.body, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]['Part No 12 Digits'], '222222222222');
    assert.strictEqual(rows[0]['Supplier'], 'XYZ');
    assert.strictEqual(rows[0]['Dock IH routing'], 'ST');
    // xlsx round-trips a numeric-looking string cell as a number by the time
    // it comes back out of a written-then-read workbook — incidental to the
    // xlsx library, not something this feature controls.
    assert.strictEqual(String(rows[0]['Source']), '2');
  } finally {
    await cleanupBatch(previousBatchId);
    await cleanupBatch(currentBatchId);
  }
});

test('handleDownloadNewParts: zero new parts produces an empty-but-valid .xlsx, not an error', async () => {
  const batchId = 'TEST-TG-DLNEW-EMPTY-' + Date.now();
  const secondBatchId = batchId + '-B';
  const headers = ['Part No 12 Digits', 'Supplier', 'Dock IH routing', 'Source'];
  const buffer = bufferFromAoa([headers, ['111111111111', 'ABC', 'SW', '1']]);

  try {
    // First-ever batch: its own upload already flags 111 as new, so a
    // second batch with the identical row (compared against this one as its
    // immediately-previous batch) has zero new parts.
    await preCreateBatchAt(batchId, '2099-01-01T00:00:00.000Z');
    await handleTargetRoUpload(mockReq(buffer, batchId), mockRes());

    await preCreateBatchAt(secondBatchId, '2099-02-01T00:00:00.000Z');
    await handleTargetRoUpload(mockReq(buffer, secondBatchId), mockRes());

    const res = mockRes();
    await handleDownloadNewParts({ query: { batchId: secondBatchId } }, res);

    assert.strictEqual(res.statusCode, 200);
    const wb = xlsx.read(res.body, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    assert.strictEqual(rows.length, 1, 'header row only, no data rows');
    assert.deepStrictEqual(rows[0], headers);
  } finally {
    await cleanupBatch(batchId);
    await cleanupBatch(secondBatchId);
  }
});

test('handleDownloadNewParts: missing batchId is a 400, unknown batchId is a 404', async () => {
  const missingRes = mockRes();
  await handleDownloadNewParts({ query: {} }, missingRes);
  assert.strictEqual(missingRes.statusCode, 400);

  const notFoundRes = mockRes();
  await handleDownloadNewParts({ query: { batchId: 'TEST-TG-DLNEW-NOPE-' + Date.now() } }, notFoundRes);
  assert.strictEqual(notFoundRes.statusCode, 404);
});
