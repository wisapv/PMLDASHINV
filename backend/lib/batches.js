function generateBatchId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `B-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Shared by every upload route (target-ro, part-procurement) and by
// start-new-batch, so a batch row is created exactly one way everywhere.
async function createBatchIfNotExists(db, batchId) {
  const now = new Date().toISOString();
  await db.run('INSERT OR IGNORE INTO upload_batches (batch_id, upload_date) VALUES (?, ?)', [batchId, now]);
}

// At most one batch is ever active. Deactivating every row before activating
// the target one, inside a single transaction, keeps that true even across
// back-to-back start-new-batch calls.
async function setActiveBatch(db, batchId) {
  await db.exec('BEGIN TRANSACTION');
  try {
    await db.run('UPDATE upload_batches SET is_active = 0');
    await db.run('UPDATE upload_batches SET is_active = 1 WHERE batch_id = ?', batchId);
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}

async function getActiveBatchId(db) {
  const row = await db.get('SELECT batch_id FROM upload_batches WHERE is_active = 1 LIMIT 1');
  return row ? row.batch_id : null;
}

module.exports = { generateBatchId, createBatchIfNotExists, setActiveBatch, getActiveBatchId };
