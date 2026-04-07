const express = require('express');
const router = express.Router();
const { connectDB } = require('../database');

router.post('/upload', (req, res) => {
  const { data } = req.body; // รับ Array ของข้อมูลจาก Frontend
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  const db = connectDB();
  
  // ล้างข้อมูลเก่าก่อน Insert ใหม่ (Optional - แล้วแต่การใช้งาน)
  db.run(`DELETE FROM target_ro`, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    const stmt = db.prepare(`INSERT INTO target_ro (part_no, part_name, quantity) VALUES (?, ?, ?)`);
    
    data.forEach((row) => {
      // สมมติว่าใน Excel มีคอลัมน์ Part No, Part Name, Qty
      stmt.run(row['Part No'], row['Part Name'], row['Qty']);
    });

    stmt.finalize((err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Target RO data uploaded and saved successfully' });
      }
      db.close();
    });
  });
});

module.exports = router;