const express = require('express');
const cors = require('cors');
const { initDB } = require('./database'); 

const targetRoRoute = require('./part_list/targetRoRoute');
const partProcRoute = require('./part_list/partProcRoute');
const mergeRoute = require('./part_list/mergeRoute'); 
const mainFormatRoute = require('./part_list/mainFormatRoute');
const templateRoute = require('./part_list/templateRoute'); 

const app = express();
app.use(cors());
app.use(express.json());

// ปรับปรุงการเชื่อม Route ให้แยกส่วนชัดเจน
app.use('/api', targetRoRoute);      // สำหรับ /api/target-ro
app.use('/api', partProcRoute);    // สำหรับ /api/part-proc
app.use('/api', mergeRoute);       // สำหรับ /api/merge
app.use('/api', mainFormatRoute);  // สำหรับ /api/download-main และ /api/preview-main
app.use('/api/template', templateRoute); 

const PORT = 3000;
app.listen(PORT, async () => {
  try {
    await initDB(); 
    console.log(`--- Database Initialized Successfully ---`);
    console.log(`Backend Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
});