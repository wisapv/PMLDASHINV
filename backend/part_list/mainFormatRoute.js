const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ฟังก์ชันช่วยตรวจสอบและสร้างโฟลเดอร์ templates
const templateDir = path.join(__dirname, '../templates');
if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
}

router.get('/download-main', async (req, res) => {
  try {
    const templatePath = path.join(templateDir, 'MainFormat.xlsx');
    
    // หากไม่มีไฟล์ Template ให้แจ้งเตือนชัดเจน
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ 
        error: 'ยังไม่มีไฟล์ Template กรุณาอัปโหลดไฟล์ MainFormat.xlsx ไว้ที่โฟลเดอร์ backend/templates ก่อน' 
      });
    }

    const db = await connectDB();
    // ดึงข้อมูลที่ Merge กันระหว่าง target_ro และ part_procurement
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
    `);

    if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'ไม่พบข้อมูลที่จับคู่กันได้ (No merged data) กรุณาตรวจสอบ Key Matching' });
    }

    // อ่าน Template และเขียนข้อมูลลงไป
    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const templateData = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 });
    const header = templateData.slice(0, 5); // เก็บ Header 5 บรรทัดแรกตามมาตรฐาน

    const dataRows = rows.map(row => {
      const t = JSON.parse(row.target_data);
      const p = JSON.parse(row.proc_data);
      return [
        "AA", "B", t['Group'] || "", "6", p['PART #'] || "", p['Suffix No'] || "", 
        p['COMP'] || "", p['PLANT'] || "", p['Production Routing'] || "", 
        p['DOCK'] || "", p['SUPL'] || "", p['PLANT'] || "", p['S.DOCK'] || "", 
        "", "", p['KBN'] || "", p['Source'] || "", p['Dock Comb.'] || "", 
        p['COMP'] || "", p['Life Cycle Code'] || "", 
        p['V.SHARE FLG[SYS L/O DATE BASIS]'] || "", p['V.SHARE VALUE'] || "", 
        p['ORD Method'] || "", p['QTY /CONT'] || "", p['PACK QTY/CONT'] || "", 
        "3", p['PART DESC'] || ""
      ];
    });

    const finalContent = [...header, ...dataRows, ["END"]];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(finalContent);
    xlsx.utils.book_append_sheet(wb, ws, "Part List");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=Main_PartList_Report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel' });
  }
});

// API สำหรับ Preview ข้อมูลก่อนดาวน์โหลด
router.get('/preview-main', async (req, res) => {
    try {
      const db = await connectDB();
      const rows = await db.all(`
        SELECT t.data as target_data, p.data as proc_data
        FROM target_ro t
        INNER JOIN part_procurement p ON t.key_tg = p.key_pp
      `);
  
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลสำหรับการ Preview' });
  
      const previewData = rows.map(row => {
        const t = JSON.parse(row.target_data);
        const p = JSON.parse(row.proc_data);
        return {
          "Group ID*": t['Group'] || "",
          "Part No.*": p['PART #'] || "",
          "Suffix*": p['Suffix No'] || "",
          "Supplier*": p['SUPL'] || "",
          "Part name*": p['PART DESC'] || ""
        };
      });
  
      res.json({ data: previewData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate preview' });
    }
});

module.exports = router;