// ไฟล์: backend/part_list/templateRoute.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx'); // <-- เพิ่มการเรียกใช้ xlsx

const router = express.Router();

const templateFolder = path.join(__dirname, '../templates');
if (!fs.existsSync(templateFolder)) {
  fs.mkdirSync(templateFolder);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, templateFolder);
  },
  filename: (req, file, cb) => {
    cb(null, 'MainFormat.xlsx'); 
  }
});

const upload = multer({ storage });

// 1. API อัพโหลด Template
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No template file uploaded' });
    res.json({ message: 'Template saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// 2. API ดึงข้อมูลวันที่อัพเดทล่าสุด
router.get('/info', (req, res) => {
  const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
  if (fs.existsSync(templatePath)) {
    const stats = fs.statSync(templatePath);
    res.json({ exists: true, lastUpdate: stats.mtime });
  } else {
    res.json({ exists: false });
  }
});

// 3. API โหลดข้อมูล 5 บรรทัดแรกไปโชว์เป็นตารางบนเว็บ (ใหม่ ✨)
router.get('/preview-data', (req, res) => {
  const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
  if (fs.existsSync(templatePath)) {
    try {
      const wb = xlsx.readFile(templatePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // ดึงข้อมูลมาทั้งหมดเลย (เอา .slice(0, 5) ออก)
      const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
      
      res.json({ exists: true, data: data });
    } catch (error) {
      res.status(500).json({ error: "Failed to read template data" });
    }
  } else {
    res.status(404).json({ error: "No template found" });
  }
});

// 4. API ดาวน์โหลดไฟล์ Excel (เปลี่ยนจากดูบนเว็บมาเป็นปุ่มโหลดแทน)
router.get('/preview-file', (req, res) => {
  const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
  if (fs.existsSync(templatePath)) {
    res.download(templatePath, 'Current_Template_Format.xlsx');
  } else {
    res.status(404).json({ error: "No template found" });
  }
});

module.exports = router;