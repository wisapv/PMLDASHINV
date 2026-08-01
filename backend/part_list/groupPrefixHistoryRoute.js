const express = require('express');
const { connectDB } = require('../database');
const { validateGroupPrefix, recordGroupPrefixUsage, listGroupPrefixHistory, deleteGroupPrefixHistory } = require('../lib/groupPrefix');

const router = express.Router();

async function handleGetGroupPrefixHistory(req, res) {
  try {
    const db = await connectDB();
    const history = await listGroupPrefixHistory(db);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load group prefix history' });
  }
}

async function handleAddGroupPrefixHistory(req, res) {
  try {
    const { prefix } = req.body;
    const { valid, error } = validateGroupPrefix(prefix);
    if (!valid) return res.status(400).json({ error });

    const db = await connectDB();
    const record = await recordGroupPrefixUsage(db, prefix);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save group prefix history entry' });
  }
}

async function handleDeleteGroupPrefixHistory(req, res) {
  try {
    const { prefix } = req.params;
    const db = await connectDB();
    const deleted = await deleteGroupPrefixHistory(db, prefix);
    if (!deleted) return res.status(404).json({ error: 'Prefix not found in history' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group prefix history entry' });
  }
}

router.get('/group-prefix-history', handleGetGroupPrefixHistory);
router.post('/group-prefix-history', handleAddGroupPrefixHistory);
router.delete('/group-prefix-history/:prefix', handleDeleteGroupPrefixHistory);

module.exports = router;
module.exports.handleGetGroupPrefixHistory = handleGetGroupPrefixHistory;
module.exports.handleAddGroupPrefixHistory = handleAddGroupPrefixHistory;
module.exports.handleDeleteGroupPrefixHistory = handleDeleteGroupPrefixHistory;
