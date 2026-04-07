// ไฟล์: backend/server.js
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database'); // นำเข้าฟังก์ชันสร้างตาราง

const targetRoRoute = require('./part_list/targetRoRoute');
const partProcRoute = require('./part_list/partProcRoute');
const mergeRoute = require('./part_list/mergeRoute'); // นำเข้า Merge Route
const mainFormatRoute = require('./part_list/mainFormatRoute');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/part-list', targetRoRoute);
app.use('/api/part-list', partProcRoute);
app.use('/api/part-list', mergeRoute);
app.use('/api/part-list', mainFormatRoute); // เชื่อม Merge Route

const PORT = 3000;
app.listen(PORT, async () => {
  await initDB(); // สร้างตาราง SQLite ทันทีที่เปิด Server
  console.log(`Backend Server is running on http://localhost:${PORT}`);
});