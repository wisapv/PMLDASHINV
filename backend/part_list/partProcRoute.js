const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseExcelDate(excelDate) {
  if (!excelDate) return new Date('invalid');
  if (typeof excelDate === 'number') return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  const cleanStr = String(excelDate).replace(/\s/g, '');
  if (/^\d{8}$/.test(cleanStr)) return new Date(cleanStr.slice(0, 4), parseInt(cleanStr.slice(4, 6)) - 1, cleanStr.slice(6, 8));
  return new Date(cleanStr);
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedData = rawData.reduce((acc, row) => {
      const rowDate = parseExcelDate(row['T/C TO (UNL)']);
      if (isNaN(rowDate) || rowDate <= today) return acc;

      const dock = String(row['DOCK'] || '').trim();
      const prodRouting = String(row['Production Routing'] || '').trim();
      const partNo = String(row['PART #'] || '').trim();
      
      const dockComb = prodRouting === '' ? dock : dock + prodRouting;
      row['Dock Comb.'] = dockComb;
      
      const keyPP = (dockComb + partNo).replace(/\s/g, '');
      row['Key matching PP'] = keyPP;
      row['Suffix No'] = partNo.slice(-2);
      row['Model No.'] = String(row['Model Name'] || '').substring(0, 4);

      acc.push(row);
      return acc;
    }, []);

    const db = await connectDB();
    // 🔴 เอา db.exec('DELETE FROM part_procurement'); ออก เพื่อเก็บประวัติ
    
    const stmt = await db.prepare('INSERT INTO part_procurement (key_pp, data, upload_at) VALUES (?, ?, ?)');
    const now = new Date().toISOString();

    for (const row of processedData) {
      await stmt.run(row['Key matching PP'], JSON.stringify(row), now);
    }
    await stmt.finalize();

    res.json({ message: 'Part Procurement saved to DB successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process Part Procurement' });
  }
});

module.exports = router;