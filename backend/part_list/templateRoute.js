// ไฟล์: backend/part_list/templateRoute.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// สร้างโฟลเดอร์ templates อัตโนมัติถ้ายังไม่มี
const templateFolder = path.join(__dirname, '../templates');
if (!fs.existsSync(templateFolder)) {
  fs.mkdirSync(templateFolder);
}

// ตั้งค่า Multer ให้บันทึกไฟล์ลงโฟลเดอร์ templates โดยตรง
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, templateFolder);
  },
  filename: (req, file, cb) => {
    // บังคับเซฟชื่อ MainFormat.xlsx (เพื่อให้อนาคตเราเรียกใช้ไฟล์นี้ง่ายๆ)
    cb(null, 'MainFormat.xlsx'); 
  }
});

const upload = multer({ storage });

// API สำหรับอัพโหลด Template
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No template file uploaded' });
    }
    res.json({ message: 'Template saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

module.exports = router;