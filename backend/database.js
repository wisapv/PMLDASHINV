const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const dbFolder = path.join(__dirname, 'database');
const dbPath = path.join(dbFolder, 'database.sqlite');

async function connectDB() {
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
    console.log("Created 'database' folder automatically.");
  }

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initDB() {
  const db = await connectDB();
  
  // เพิ่มคอลัมน์ upload_at เพื่อเก็บประวัติเวลาที่อัพโหลด
  await db.exec(`
    CREATE TABLE IF NOT EXISTS target_ro (
      key_tg TEXT,
      data TEXT,
      upload_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS part_procurement (
      key_pp TEXT,
      data TEXT,
      upload_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("SQLite Database initialized inside '/database' folder.");
  return db;
}

module.exports = { connectDB, initDB };