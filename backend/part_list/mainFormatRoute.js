// ไฟล์: backend/part_list/mainFormatRoute.js
const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ==========================================
// 1. API สำหรับดาวน์โหลดไฟล์ Excel (.xlsx) จริง
// ==========================================
router.get('/download-main', async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: 'Template file not found. Please upload template first.' });
    }

    const db = await connectDB();
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
    `);

    if (rows.length === 0) return res.status(404).json({ error: 'No merged data found.' });

    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const templateData = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 });
    const header = templateData.slice(0, 5);

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
    res.status(500).json({ error: 'Failed to generate Main Format file' });
  }
});

// ==========================================
// 2. API ใหม่ สำหรับโชว์ Preview บนหน้าเว็บ (ส่งกลับเป็น JSON 27 คอลัมน์)
// ==========================================
router.get('/preview-main', async (req, res) => {
  try {
    const db = await connectDB();
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
    `);

    if (rows.length === 0) return res.status(404).json({ error: 'No merged data found.' });

    // สร้างข้อมูล JSON ให้ตรงกับ 27 หัวคอลัมน์ของ Template
    const previewData = rows.map(row => {
      const t = JSON.parse(row.target_data);
      const p = JSON.parse(row.proc_data);

      return {
        "Company*": "AA",
        "Company plant code*": "B",
        "Group ID*": t['Group'] || "",
        "CTL flag*": "6",
        "Part No.*": p['PART #'] || "",
        "Suffix*": p['Suffix No'] || "",
        "Receiving company*": p['COMP'] || "",
        "Receiving company plant code*": p['PLANT'] || "",
        "Production process routing": p['Production Routing'] || "",
        "Dock code*": p['DOCK'] || "",
        "Supplier*": p['SUPL'] || "",
        "Supplier plant code*": p['PLANT'] || "",
        "Supplier shipping dock": p['S.DOCK'] || "",
        "Previous process routing": "",
        "Dummy": "",
        "Kanban No.*": p['KBN'] || "",
        "Source code*": p['Source'] || "",
        "Hikiate matching key*": p['Dock Comb.'] || "",
        "Model 1": p['COMP'] || "",
        "Life cycle code*": p['Life Cycle Code'] || "",
        "Vender share type": p['V.SHARE FLG[SYS L/O DATE BASIS]'] || "",
        "Vender share value": p['V.SHARE VALUE'] || "",
        "Order method*": p['ORD Method'] || "",
        "Order lot*": p['QTY /CONT'] || "",
        "Order lot size*": p['PACK QTY/CONT'] || "",
        "Round up flag*": "3",
        "Part name*": p['PART DESC'] || ""
      };
    });

    res.json({
      message: 'Preview generated successfully',
      count: previewData.length,
      data: previewData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate preview data' });
  }
});

module.exports = router;