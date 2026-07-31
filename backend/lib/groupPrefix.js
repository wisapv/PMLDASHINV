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

async function setStoredGroupPrefix(db, batchId, prefix) {
  await db.run(
    `INSERT INTO upload_batches (batch_id, group_prefix) VALUES (?, ?)
     ON CONFLICT(batch_id) DO UPDATE SET group_prefix = excluded.group_prefix`,
    [batchId, prefix]
  );
}

module.exports = { DEFAULT_GROUP_PREFIX, validateGroupPrefix, getStoredGroupPrefix, setStoredGroupPrefix };
