const DEFAULT_GROUP_PREFIX = 'SR481D';

// Characters invalid in Windows filenames — this value is used directly in a
// downloaded filename, so it must never contain them.
const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/;

function validateGroupPrefix(prefix) {
  if (typeof prefix !== 'string' || prefix.trim() === '') {
    return { valid: false, error: 'Group prefix cannot be empty.' };
  }

  const invalidChar = [...prefix].find((ch) => INVALID_FILENAME_CHARS.test(ch));
  if (invalidChar) {
    return { valid: false, error: `Group prefix contains an invalid character: "${invalidChar}". Avoid / \\ : * ? " < > |` };
  }

  return { valid: true };
}

async function getStoredGroupPrefix(db, batchId) {
  const row = await db.get('SELECT group_prefix FROM upload_batches WHERE batch_id = ?', batchId);
  return (row && row.group_prefix) ? row.group_prefix : DEFAULT_GROUP_PREFIX;
}

// group_prefix is only ever written by a real Merge action (see
// setStoredGroupPrefix's caller in mainFormatRoute.js), never by the passive
// no-prefix preview-main path — so its presence is a genuine "has this batch
// actually been merged at least once" signal, unlike "does preview-main
// currently compute non-empty rows" (true as soon as valid Target R/O +
// Part Procurement rows exist, even if Merge was never clicked).
async function hasStoredGroupPrefix(db, batchId) {
  const row = await db.get('SELECT group_prefix FROM upload_batches WHERE batch_id = ?', batchId);
  return !!(row && row.group_prefix);
}

async function setStoredGroupPrefix(db, batchId, prefix) {
  await db.run(
    `INSERT INTO upload_batches (batch_id, group_prefix) VALUES (?, ?)
     ON CONFLICT(batch_id) DO UPDATE SET group_prefix = excluded.group_prefix`,
    [batchId, prefix]
  );
}

// Tracks prefixes for the "recently used" suggestion list only — separate from
// any batch's own stored group_prefix. Inserts a new row or bumps last_used_at
// for an existing one, so the list always reflects most-recent-use ordering.
// Every prefix, including the default, goes through this the same way — there
// is no pinned/non-deletable entry.
async function recordGroupPrefixUsage(db, prefix) {
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO group_prefix_history (prefix, last_used_at) VALUES (?, ?)
     ON CONFLICT(prefix) DO UPDATE SET last_used_at = excluded.last_used_at`,
    [prefix, now]
  );
  return { prefix, last_used_at: now };
}

async function listGroupPrefixHistory(db) {
  return db.all('SELECT prefix, last_used_at FROM group_prefix_history ORDER BY last_used_at DESC');
}

// Removes a prefix from the suggestion history ONLY. This must never touch
// upload_batches.group_prefix — a batch that already used this prefix keeps
// it, and continues producing identical Group values in every export.
async function deleteGroupPrefixHistory(db, prefix) {
  const result = await db.run('DELETE FROM group_prefix_history WHERE prefix = ?', prefix);
  return result.changes > 0;
}

module.exports = {
  DEFAULT_GROUP_PREFIX,
  validateGroupPrefix,
  getStoredGroupPrefix,
  hasStoredGroupPrefix,
  setStoredGroupPrefix,
  recordGroupPrefixUsage,
  listGroupPrefixHistory,
  deleteGroupPrefixHistory,
};
