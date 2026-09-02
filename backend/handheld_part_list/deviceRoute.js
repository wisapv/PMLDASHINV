const express = require('express');
const { connectDB } = require('../database');
const { emitEvent, EVENTS } = require('../lib/socketHub');

const router = express.Router();

function normalizeName(value) {
  return String(value || '').trim();
}

function validateDeviceName(name) {
  if (!name) return 'Device name cannot be empty.';
  if (/[/\\:*?"<>|]/.test(name)) return 'Device name contains an invalid character.';
  return '';
}

async function handleListDevices(req, res) {
  try {
    const db = await connectDB();
    const rows = await db.all('SELECT id, name, status FROM handheld_devices ORDER BY created_at ASC');
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load handheld devices' });
  }
}

async function handleAddDevice(req, res) {
  try {
    const name = normalizeName(req.body.name);
    const error = validateDeviceName(name);
    if (error) return res.status(400).json({ error });

    const db = await connectDB();
    const id = name.toUpperCase();

    const existing = await db.get('SELECT id FROM handheld_devices WHERE id = ?', id);
    if (existing) return res.status(409).json({ error: 'A device with this name already exists.' });

    await db.run(
      'INSERT INTO handheld_devices (id, name, status) VALUES (?, ?, ?)',
      id, name, 'active'
    );
    emitEvent(EVENTS.HANDHELD_DEVICES_UPDATED, {});
    res.json({ data: { id, name, status: 'active' } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add handheld device' });
  }
}

// Handles rename and/or status change (whichever fields are present in the
// body) — the same modal on the frontend does both, so one endpoint covers
// it instead of splitting into /rename and /status.
async function handleUpdateDevice(req, res) {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const device = await db.get('SELECT id, name, status FROM handheld_devices WHERE id = ?', id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    let nextName = device.name;
    if (req.body.name !== undefined) {
      const name = normalizeName(req.body.name);
      const error = validateDeviceName(name);
      if (error) return res.status(400).json({ error });

      if (name.toUpperCase() !== id) {
        const clash = await db.get('SELECT id FROM handheld_devices WHERE id = ? AND id != ?', name.toUpperCase(), id);
        if (clash) return res.status(409).json({ error: 'A device with this name already exists.' });
      }
      nextName = name;
    }

    let nextStatus = device.status;
    if (req.body.status !== undefined) {
      if (!['active', 'inactive'].includes(req.body.status)) {
        return res.status(400).json({ error: "status must be 'active' or 'inactive'" });
      }
      nextStatus = req.body.status;
    }

    await db.run('UPDATE handheld_devices SET name = ?, status = ? WHERE id = ?', nextName, nextStatus, id);
    emitEvent(EVENTS.HANDHELD_DEVICES_UPDATED, {});
    res.json({ data: { id, name: nextName, status: nextStatus } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update handheld device' });
  }
}

async function handleDeleteDevice(req, res) {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const result = await db.run('DELETE FROM handheld_devices WHERE id = ?', id);
    if (result.changes === 0) return res.status(404).json({ error: 'Device not found' });
    emitEvent(EVENTS.HANDHELD_DEVICES_UPDATED, {});
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete handheld device' });
  }
}

router.get('/', handleListDevices);
router.post('/', handleAddDevice);
router.patch('/:id', handleUpdateDevice);
router.delete('/:id', handleDeleteDevice);

module.exports = router;
module.exports.handleListDevices = handleListDevices;
module.exports.handleAddDevice = handleAddDevice;
module.exports.handleUpdateDevice = handleUpdateDevice;
module.exports.handleDeleteDevice = handleDeleteDevice;