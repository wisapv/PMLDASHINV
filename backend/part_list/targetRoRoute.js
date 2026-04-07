const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');

// ตั้งค่าตัวรับไฟล์
const upload = multer({ storage: multer.memoryStorage() });

// รอรับที่ path: /upload (รวมกับ server.js จะเป็น /api/target-ro/upload)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // 1. อ่านไฟล์ Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const db = connectDB();
    
    // 2. ล้างข้อมูลเก่าแล้วบันทึกใหม่
    db.run(`DELETE FROM target_ro`, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      const stmt = db.prepare(`INSERT INTO target_ro (part_no, part_name, quantity) VALUES (?, ?, ?)`);
      
      data.forEach((row) => {
        // เช็คชื่อคอลัมน์ Excel ให้ตรงกับของจริง ('Part No', 'Part Name', 'Qty')
        stmt.run(row['Part No'] || '', row['Part Name'] || '', row['Qty'] || 0);
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
  } catch (error) {
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

module.exports = router;