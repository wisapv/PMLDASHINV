// ไฟล์: backend/database.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

// กำหนด Path ของโฟลเดอร์ database
const dbFolder = path.join(__dirname, 'database');
const dbPath = path.join(dbFolder, 'database.sqlite');

// ฟังก์ชันเชื่อมต่อ DB
async function connectDB() {
  // เช็คว่ามีโฟลเดอร์ 'database' หรือยัง ถ้ายังไม่มีให้สร้างขึ้นมาใหม่
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
    console.log("Created 'database' folder automatically.");
  }

  return open({
    filename: dbPath, // ย้ายไปเซฟในโฟลเดอร์ database/database.sqlite
    driver: sqlite3.Database
  });
}

// ฟังก์ชันสร้างตาราง (รันตอนเปิด Server)
async function initDB() {
  const db = await connectDB();
  
  // สร้างตารางเพื่อพักข้อมูลชั่วคราว
  await db.exec(`
    CREATE TABLE IF NOT EXISTS target_ro (
      key_tg TEXT,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS part_procurement (
      key_pp TEXT,
      data TEXT
    );
  `);
  console.log("SQLite Database initialized inside '/database' folder.");
  return db;
}

module.exports = { connectDB, initDB };