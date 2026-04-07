// ไฟล์: backend/part_list/mainFormatRoute.js
const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/download-main', async (req, res) => {
  try {
    // 1. เช็คก่อนว่ามีการอัพโหลด Template ไว้หรือยัง
    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: 'Template file not found. Please upload template first.' });
    }

    const db = await connectDB();
    
    // 2. ดึงข้อมูลที่ Join กันแล้วจาก DB
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
    `);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No merged data found.' });
    }

    // 3. อ่านไฟล์ Template ที่อัพโหลดไว้
    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    
    // แปลงข้อมูลใน Template ให้อยู่ในรูป Array of Arrays (AoA)
    const templateData = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 });
    
    // ตัดเอาแค่ 5 บรรทัดแรกมาเป็น Header ของเรา
    const header = templateData.slice(0, 5);

    // 4. แปลงข้อมูล Database ให้ตรงกับ 27 คอลัมน์
    const dataRows = rows.map(row => {
      const t = JSON.parse(row.target_data);
      const p = JSON.parse(row.proc_data);

      return [
        "AA", "B", t['Group'] || "", "6", p['PART #'] || "", 
        p['Suffix No'] || "", p['COMP'] || "", p['PLANT'] || "", 
        p['Production Routing'] || "", p['DOCK'] || "", p['SUPL'] || "", 
        p['PLANT'] || "", p['S.DOCK'] || "", "", "", 
        p['KBN'] || "", p['Source'] || "", p['Dock Comb.'] || "", 
        p['COMP'] || "", p['Life Cycle Code'] || "", 
        p['V.SHARE FLG[SYS L/O DATE BASIS]'] || "", p['V.SHARE VALUE'] || "", 
        p['ORD Method'] || "", p['QTY /CONT'] || "", p['PACK QTY/CONT'] || "", 
        "3", p['PART DESC'] || ""
      ];
    });

    // 5. รวม Header จากไฟล์จริง + ข้อมูล + เติม "END" ไว้ล่างสุด
    const finalContent = [...header, ...dataRows, ["END"]];

    // 6. สร้างไฟล์ Excel ส่งกลับไปให้ดาวน์โหลด
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(finalContent);
    xlsx.utils.book_append_sheet(wb, ws, "Part List");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=Main_PartList_Report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate Main Format file' });
  }
});

module.exports = router;