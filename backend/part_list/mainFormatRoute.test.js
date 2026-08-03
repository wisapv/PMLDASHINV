const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { initDB, connectDB } = require('../database');
const { initSocketHub, EVENTS } = require('../lib/socketHub');
const { handlePreviewMain, handleDownloadMain } = require('./mainFormatRoute');
const { handleProcessAssignAddr } = require('../handheld_part_list/assignAddrRoute');

function bufferFromAoa(aoa) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(aoa);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
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

// download-main reads a template file that isn't checked into the repo
// (backend/templates/ is gitignored — it's provided at deploy time). Create a
// minimal stand-in only if one isn't already present, and remove only what we
// created.
const TEMPLATE_PATH = path.join(__dirname, '../templates/MainFormat.xlsx');
let createdTemplateForTest = false;

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

async function cleanupPrefixHistory(prefix) {
  const db = await connectDB();
  await db.run('DELETE FROM group_prefix_history WHERE prefix = ?', prefix);
}

test.before(async () => {
  await initDB();

  if (!fs.existsSync(TEMPLATE_PATH)) {
    fs.mkdirSync(path.dirname(TEMPLATE_PATH), { recursive: true });
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([['h0'], ['h1'], ['h2'], ['h3'], ['h4']]);
    xlsx.utils.book_append_sheet(wb, ws, 'Part List');
    xlsx.writeFile(wb, TEMPLATE_PATH);
    createdTemplateForTest = true;
  }
});

test.after(() => {
  if (createdTemplateForTest && fs.existsSync(TEMPLATE_PATH)) {
    fs.unlinkSync(TEMPLATE_PATH);
  }
});

test('handlePreviewMain: prefix in request persists to upload_batches and is used in the computed Group', async () => {
  const batchId = 'TEST-GP-PERSIST-' + Date.now();
  await seedBatch(batchId);
  try {
    const res = mockRes();
    await handlePreviewMain({ query: { batchId, prefix: 'CUSTOM1' } }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data[0]['Group ID*'], 'CUSTOM1A1');

    const db = await connectDB();
    const row = await db.get('SELECT group_prefix FROM upload_batches WHERE batch_id = ?', batchId);
    assert.strictEqual(row.group_prefix, 'CUSTOM1');
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('CUSTOM1');
  }
});

test('handlePreviewMain: providing a prefix also upserts group_prefix_history (insert new, then update last_used_at on reuse)', async () => {
  const batchId = 'TEST-GP-HISTUPSERT-' + Date.now();
  const prefix = 'HISTUPSERT-' + Date.now();
  await seedBatch(batchId);
  try {
    await handlePreviewMain({ query: { batchId, prefix } }, mockRes());

    const db = await connectDB();
    const rowsAfterFirst = await db.all('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.strictEqual(rowsAfterFirst.length, 1);
    const firstSeenAt = rowsAfterFirst[0].last_used_at;

    await new Promise((resolve) => setTimeout(resolve, 10));
    await handlePreviewMain({ query: { batchId, prefix } }, mockRes());

    const rowsAfterSecond = await db.all('SELECT * FROM group_prefix_history WHERE prefix = ?', prefix);
    assert.strictEqual(rowsAfterSecond.length, 1, 'must update the existing row, not duplicate it');
    assert.ok(rowsAfterSecond[0].last_used_at >= firstSeenAt);
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory(prefix);
  }
});

test('handlePreviewMain: a later call without prefix reuses the previously stored value, not the hardcoded default', async () => {
  const batchId = 'TEST-GP-REUSE-' + Date.now();
  await seedBatch(batchId);
  try {
    await handlePreviewMain({ query: { batchId, prefix: 'STORED9' } }, mockRes());

    const res2 = mockRes();
    await handlePreviewMain({ query: { batchId } }, res2);

    assert.strictEqual(res2.body.data[0]['Group ID*'], 'STORED9A1');
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('STORED9');
  }
});

test('handlePreviewMain: a batch that never had a prefix set falls back to SR481D, and the fallback is recorded into group_prefix_history like any other prefix', async () => {
  const batchId = 'TEST-GP-DEFAULT-' + Date.now();
  await seedBatch(batchId);
  try {
    const res = mockRes();
    await handlePreviewMain({ query: { batchId } }, res);

    assert.strictEqual(res.body.data[0]['Group ID*'], 'SR481DA1');

    const db = await connectDB();
    const row = await db.get('SELECT * FROM group_prefix_history WHERE prefix = ?', 'SR481D');
    assert.ok(row, 'the untouched default must be recorded into history when actually used for a merge');
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('SR481D');
  }
});

test('handlePreviewMain: invalid prefix (each disallowed character, and empty string) is rejected with 400 and does not overwrite the stored value', async () => {
  const batchId = 'TEST-GP-INVALID-' + Date.now();
  await seedBatch(batchId);
  try {
    await handlePreviewMain({ query: { batchId, prefix: 'GOODPFX' } }, mockRes());

    const invalidPrefixes = ['', '   ', 'BAD/X', 'BAD\\X', 'BAD:X', 'BAD*X', 'BAD?X', 'BAD"X', 'BAD<X', 'BAD>X', 'BAD|X'];
    for (const bad of invalidPrefixes) {
      const res = mockRes();
      await handlePreviewMain({ query: { batchId, prefix: bad } }, res);
      assert.strictEqual(res.statusCode, 400, `expected 400 for prefix ${JSON.stringify(bad)}`);
      assert.ok(res.body.error);
    }

    const db = await connectDB();
    const row = await db.get('SELECT group_prefix FROM upload_batches WHERE batch_id = ?', batchId);
    assert.strictEqual(row.group_prefix, 'GOODPFX');
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('GOODPFX');
  }
});

test('preview-main, download-main, and process-assign-addr all use the same stored prefix for one batchId', async () => {
  const batchId = 'TEST-GP-CROSS-' + Date.now();
  await seedBatch(batchId);
  try {
    const previewRes = mockRes();
    await handlePreviewMain({ query: { batchId, prefix: 'CROSSPFX' } }, previewRes);
    const expectedGroup = 'CROSSPFXA1';
    assert.strictEqual(previewRes.body.data[0]['Group ID*'], expectedGroup);

    const downloadRes = mockRes();
    await handleDownloadMain({ query: { batchId, groups: expectedGroup } }, downloadRes);
    assert.strictEqual(downloadRes.statusCode, 200);
    assert.ok(Buffer.isBuffer(downloadRes.body));

    const wb = xlsx.read(downloadRes.body, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    // 5 template header rows precede the data rows.
    assert.strictEqual(rows[5][2], expectedGroup);

    const addrHeaders = ['T/C TO (UNL)', 'DOCK', 'PART #', 'Kanban Print Address', 'Lineside Address', 'PART DESC'];
    const addrRow = ['20991231', 'ZZ', '123456789012', 'WH01', '', 'TEST PART'];
    const addrBuffer = bufferFromAoa([addrHeaders, addrRow]);

    const assignRes = mockRes();
    await handleProcessAssignAddr({ file: { buffer: addrBuffer }, body: { batchId } }, assignRes);
    assert.strictEqual(assignRes.statusCode, 200);
    assert.strictEqual(assignRes.body.data.length, 1);
    assert.strictEqual(assignRes.body.data[0].Group, expectedGroup);
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('CROSSPFX');
  }
});

test('handlePreviewMain: emits batch:mergeUpdated on a real merge (prefix provided), but not on a passive history re-view (no prefix)', async () => {
  const batchId = 'TEST-GP-EMIT-' + Date.now();
  await seedBatch(batchId);
  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });

  try {
    await handlePreviewMain({ query: { batchId, prefix: 'EMITPFX' } }, mockRes());
    assert.ok(emitted.some((e) => e.name === EVENTS.BATCH_MERGE_UPDATED && e.payload.batchId === batchId));

    emitted.length = 0;
    await handlePreviewMain({ query: { batchId } }, mockRes());
    assert.ok(!emitted.some((e) => e.name === EVENTS.BATCH_MERGE_UPDATED), 'a passive re-view without a prefix must not broadcast');
  } finally {
    await cleanupBatch(batchId);
    await cleanupPrefixHistory('EMITPFX');
  }
});

test('handleProcessAssignAddr: emits handheld:updated on success', async () => {
  const batchId = 'TEST-GP-HANDHELDEMIT-' + Date.now();
  await seedBatch(batchId);
  const emitted = [];
  initSocketHub({ emit: (name, payload) => emitted.push({ name, payload }) });

  try {
    const addrHeaders = ['T/C TO (UNL)', 'DOCK', 'PART #', 'Kanban Print Address', 'Lineside Address', 'PART DESC'];
    const addrRow = ['20991231', 'ZZ', '123456789012', 'WH01', '', 'TEST PART'];
    const addrBuffer = bufferFromAoa([addrHeaders, addrRow]);

    await handleProcessAssignAddr({ file: { buffer: addrBuffer }, body: { batchId } }, mockRes());
    assert.ok(emitted.some((e) => e.name === EVENTS.HANDHELD_UPDATED && e.payload.batchId === batchId));
  } finally {
    await cleanupBatch(batchId);
  }
});
