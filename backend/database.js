// ไฟล์: backend/database.js
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
  return open({ filename: dbPath, driver: sqlite3.Database });
}

async function initDB() {
  const db = await connectDB();
  
  // สร้างตารางใหม่สำหรับ Batch และปรับตารางเดิมให้มี batch_id
  await db.exec(`
    CREATE TABLE IF NOT EXISTS upload_batches (
      batch_id TEXT PRIMARY KEY,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS target_ro (
      batch_id TEXT,
      key_tg TEXT,
      data TEXT,
      upload_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS part_procurement (
      batch_id TEXT,
      key_pp TEXT,
      data TEXT,
      upload_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS group_prefix_history (
      prefix TEXT PRIMARY KEY,
      last_used_at TEXT NOT NULL
    );
  `);
  // ปรับ schema ของตารางเดิมให้มี group_prefix โดยไม่กระทบข้อมูลเดิม
  const uploadBatchesColumns = await db.all(`PRAGMA table_info(upload_batches)`);
  if (!uploadBatchesColumns.some((col) => col.name === 'group_prefix')) {
    await db.exec(`ALTER TABLE upload_batches ADD COLUMN group_prefix TEXT`);
  }

  console.log("SQLite Database initialized with Batch System.");
  return db;
}

module.exports = { connectDB, initDB };