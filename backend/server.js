// ไฟล์: backend/server.js
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database'); 

const targetRoRoute = require('./part_list/targetRoRoute');
const partProcRoute = require('./part_list/partProcRoute');
const mergeRoute = require('./part_list/mergeRoute'); 
const mainFormatRoute = require('./part_list/mainFormatRoute');
// 1. เพิ่มบรรทัดนี้: นำเข้าไฟล์ templateRoute
const templateRoute = require('./part_list/templateRoute'); 

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/part-list', targetRoRoute);
app.use('/api/part-list', partProcRoute);
app.use('/api/part-list', mergeRoute);
app.use('/api/part-list', mainFormatRoute); 
// 2. เพิ่มบรรทัดนี้: เชื่อม Route ให้รองรับ URL ที่ขึ้นต้นด้วย /api/template
app.use('/api/template', templateRoute); 

const PORT = 3000;
app.listen(PORT, async () => {
  await initDB(); 
  console.log(`Backend Server is running on http://localhost:${PORT}`);
});