// ไฟล์: backend/part_list/mainFormatRoute.js
const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); 

const router = express.Router();

// ฟังก์ชันช่วยสร้าง Buffer ของ Excel
const generateExcelBuffer = (header, dataRows) => {
  const finalContent = [...header, ...dataRows, ["END"]];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(finalContent);
  xlsx.utils.book_append_sheet(wb, ws, "Part List");
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// ==========================================
// 1. API สำหรับดาวน์โหลดไฟล์ Excel (.xlsx หรือ .zip)
// ==========================================
router.get('/download-main', async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: 'Template file not found. Please upload template first.' });
    }

    const { batchId, groups } = req.query; 
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const selectedGroups = groups ? groups.split(',') : [];

    const db = await connectDB();
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
      WHERE t.batch_id = ? AND p.batch_id = ?
    `, [batchId, batchId]);

    if (rows.length === 0) return res.status(404).json({ error: 'No merged data found.' });

    // 🔴 1. กรองข้อมูล (Data Cleaning)
    const validRows = rows.filter(r => {
      const p = JSON.parse(r.proc_data);
      
      // เงื่อนไข 1: ข้อมูล Procure ต้องมีอยู่จริง
      if (!p || Object.keys(p).length === 0) return false;
      
      // เงื่อนไข 2: ตัดข้อมูลที่มีคำว่า WHEEL ASSY ออก
      const partDesc = String(p['PART DESC'] || '').trim().toUpperCase();
      if (partDesc.includes('WHEEL ASSY')) return false;

      return true;
    });

    if (validRows.length === 0) return res.status(404).json({ error: 'No valid data after filtering.' });

    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const templateData = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 });
    const header = templateData.slice(0, 5);

    // 🔴 กรณีโหลดแค่ 1 กลุ่ม -> โหลดไฟล์เดี่ยว .xlsx
    if (selectedGroups.length === 1) {
      const groupName = selectedGroups[0];
      const filteredRows = validRows.filter(r => JSON.parse(r.target_data)['Group'] === groupName);
      
      const dataRows = filteredRows.map(row => {
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

      const buffer = generateExcelBuffer(header, dataRows);
      res.setHeader('Content-Disposition', `attachment; filename=PartList_${groupName}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } 
    
    // 🔴 กรณีโหลดหลายกลุ่ม -> สร้างโฟลเดอร์ใน .zip
    else {
      res.setHeader('Content-Disposition', `attachment; filename=PartList_Batches_${batchId}.zip`);
      res.setHeader('Content-Type', 'application/zip');

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      const folderName = `PartList_${batchId}`; // ชื่อโฟลเดอร์ตอนแตกไฟล์

      for (const groupName of selectedGroups) {
        const filteredRows = validRows.filter(r => JSON.parse(r.target_data)['Group'] === groupName);
        if (filteredRows.length === 0) continue; 

        const dataRows = filteredRows.map(row => {
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

        const buffer = generateExcelBuffer(header, dataRows);
        archive.append(buffer, { name: `${folderName}/PartList_${groupName}.xlsx` });
      }

      await archive.finalize(); 
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate Main Format file' });
  }
});

// ==========================================
// 2. API สำหรับแสดง Preview บนหน้าเว็บ (ส่งกลับเป็น JSON 27 คอลัมน์)
// ==========================================
router.get('/preview-main', async (req, res) => {
  try {
    const { batchId } = req.query; 
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();
    const rows = await db.all(`
      SELECT t.data as target_data, p.data as proc_data
      FROM target_ro t
      INNER JOIN part_procurement p ON t.key_tg = p.key_pp
      WHERE t.batch_id = ? AND p.batch_id = ?
    `, [batchId, batchId]);

    if (rows.length === 0) return res.status(404).json({ error: 'No merged data found.' });

    // 🔴 2. กรองข้อมูลสำหรับหน้า Preview ด้วย (เงื่อนไขเดียวกับตอนดาวน์โหลด)
    const validRows = rows.filter(r => {
      const p = JSON.parse(r.proc_data);
      if (!p || Object.keys(p).length === 0) return false;
      
      const partDesc = String(p['PART DESC'] || '').trim().toUpperCase();
      if (partDesc.includes('WHEEL ASSY')) return false;

      return true;
    });

    const previewData = validRows.map(row => {
      const t = JSON.parse(row.target_data);
      const p = JSON.parse(row.proc_data);

      // คอลัมน์เดิมที่คุณตั้งไว้
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