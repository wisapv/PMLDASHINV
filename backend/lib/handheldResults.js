// Computed cache of process-assign-addr's output (Kanban/Lineside rows, PIC
// assignments, Hold/Remind lists) — one row per batch, keyed by batch_id.
// This is a cache tied to that batch's Target R/O + Part Procurement +
// uploaded Address Master inputs, not an independent source of truth, so a
// simple JSON-blob-per-batch table (see database.js's handheld_results) is
// enough; no relational schema needed.

async function saveHandheldResults(db, batchId, { finalData, holdData, remindData }) {
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO handheld_results (batch_id, final_data, hold_data, remind_data, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(batch_id) DO UPDATE SET
       final_data = excluded.final_data,
       hold_data = excluded.hold_data,
       remind_data = excluded.remind_data,
       updated_at = excluded.updated_at`,
    [batchId, JSON.stringify(finalData), JSON.stringify(holdData), JSON.stringify(remindData), now]
  );
}

// Partial save for a PIC drag-and-drop reassignment — only final_data
// actually changes (PIC field on existing rows), hold_data/remind_data are
// untouched. Returns false (no-op) if process-assign-addr was never run for
// this batch, since there's nothing to attach a reassignment to yet.
async function saveFinalData(db, batchId, finalData) {
  const now = new Date().toISOString();
  const result = await db.run(
    `UPDATE handheld_results SET final_data = ?, updated_at = ? WHERE batch_id = ?`,
    [JSON.stringify(finalData), now, batchId]
  );
  return result.changes > 0;
}

async function getHandheldResults(db, batchId) {
  const row = await db.get('SELECT final_data, hold_data, remind_data, updated_at FROM handheld_results WHERE batch_id = ?', batchId);
  if (!row) return null;
  return {
    finalData: JSON.parse(row.final_data || '[]'),
    holdData: JSON.parse(row.hold_data || '[]'),
    remindData: JSON.parse(row.remind_data || '[]'),
    updatedAt: row.updated_at,
  };
}

module.exports = { saveHandheldResults, saveFinalData, getHandheldResults };
