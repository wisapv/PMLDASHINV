const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ... (ส่วนหัวเหมือนเดิม)
router.post('/target-ro', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const batchId = req.body.batchId; // 🔴 รับ batchId จาก Frontend
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    const processedData = rawData.reduce((acc, row) => {
      // ... (โค้ดประมวลผลข้อมูลเหมือนเดิม)
      const supplier = String(row['Supplier'] || '').trim();
      const dock = String(row['Dock IH routing'] || '').trim();
      const partNo = String(row['Part No 12 Digits'] || '').trim();
      const source = String(row['Source'] || '').trim();

      if (supplier === 'TTAT' || (dock !== '' && dock === supplier)) return acc;

      const keyTG = (dock + partNo).replace(/[\s-]/g, '');
      row['Key matching TG'] = keyTG;

      let shop = 'A';
      if (dock === 'SW' || dock === 'S9') shop = 'W';
      else if (dock === 'SK') shop = 'K';
      row['Shop'] = shop;
      row['Group'] = 'SR481D' + shop + source;

      acc.push(row);
      return acc;
    }, []);

    const db = await connectDB();
    const now = new Date().toISOString();
    
    // 🔴 บันทึก Batch ID (ถ้ามีแล้วให้ข้าม)
    await db.run('INSERT OR IGNORE INTO upload_batches (batch_id, upload_date) VALUES (?, ?)', batchId, now);
    
    // 🔴 บันทึกข้อมูลพร้อม Batch ID
    const stmt = await db.prepare('INSERT INTO target_ro (batch_id, key_tg, data, upload_at) VALUES (?, ?, ?, ?)');
    for (const row of processedData) {
      await stmt.run(batchId, row['Key matching TG'], JSON.stringify(row), now);
    }
    await stmt.finalize();

    res.json({ message: 'Target R/O saved to DB successfully', batchId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process Target R/O' });
  }
});
module.exports = router;