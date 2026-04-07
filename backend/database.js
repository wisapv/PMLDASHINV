const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database', 'inventory.sqlite');

// ตรวจสอบว่ามีโฟลเดอร์ database หรือยัง ถ้าไม่มีให้สร้าง
if (!fs.existsSync(path.join(__dirname, 'database'))) {
  fs.mkdirSync(path.join(__dirname, 'database'));
}

const connectDB = () => {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error connecting to SQLite:', err.message);
  });
};

const initDB = () => {
  return new Promise((resolve, reject) => {
    const db = connectDB();
    db.serialize(() => {
      // 1. ตารางเก็บ Template
      db.run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 2. ตารางเก็บข้อมูล Target RO (จากไฟล์ Excel ที่ Upload)
      db.run(`CREATE TABLE IF NOT EXISTS target_ro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_no TEXT,
        part_name TEXT,
        quantity INTEGER,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 3. ตารางเก็บข้อมูล Part Procurement
      db.run(`CREATE TABLE IF NOT EXISTS part_procurement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_no TEXT,
        stock_status TEXT,
        eta_date TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    db.close();
  });
};

module.exports = { connectDB, initDB };