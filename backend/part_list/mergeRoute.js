// ไฟล์: backend/part_list/mergeRoute.js
const express = require('express');
const { connectDB } = require('../database');
const router = express.Router();

router.get('/merge', async (req, res) => {
  try {
    const db = await connectDB();
    
    // ทำ Inner Join ด้วย Key ที่ตรงกัน
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
    `);

    // แกะ JSON และรวม Object เข้าด้วยกัน
    const mergedData = rows.map(row => ({
      ...JSON.parse(row.target_data),
      ...JSON.parse(row.proc_data)
    }));

    res.json({
      message: 'Data merged successfully',
      count: mergedData.length,
      data: mergedData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to merge data' });
  }
});

module.exports = router;