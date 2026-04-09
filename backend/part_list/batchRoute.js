// ไฟล์: backend/part_list/batchRoute.js
const express = require('express');
const { connectDB } = require('../database');
const router = express.Router();

// ดึงประวัติ Batch ทั้งหมด
router.get('/list', async (req, res) => {
  try {
    const db = await connectDB();
    // นับจำนวน Records ของแต่ละ Batch ไปแสดงผลด้วย
    const batches = await db.all(`
      SELECT b.batch_id, b.upload_date, 
             (SELECT COUNT(*) FROM target_ro WHERE batch_id = b.batch_id) as tg_count,
             (SELECT COUNT(*) FROM part_procurement WHERE batch_id = b.batch_id) as pp_count
      FROM upload_batches b
      ORDER BY b.upload_date DESC
    `);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// ลบ Batch
router.delete('/:batchId', async (req, res) => {
  try {
    const db = await connectDB();
    const { batchId } = req.params;
    await db.run('DELETE FROM upload_batches WHERE batch_id = ?', batchId);
    await db.run('DELETE FROM target_ro WHERE batch_id = ?', batchId);
    await db.run('DELETE FROM part_procurement WHERE batch_id = ?', batchId);
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

module.exports = router;