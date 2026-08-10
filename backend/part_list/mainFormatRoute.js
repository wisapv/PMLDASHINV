const express = require('express');
const { connectDB } = require('../database');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { buildPpIndex, cleanTargetRow, computeShop } = require('../lib/partMatching');
const { buildMatchKey } = require('../lib/keyUtils');
const { validateGroupPrefix, getStoredGroupPrefix, setStoredGroupPrefix, recordGroupPrefixUsage } = require('../lib/groupPrefix');
const { emitEvent, EVENTS } = require('../lib/socketHub');
const { blankOrTrim } = require('../lib/textUtils');

const router = express.Router();

const generateExcelBuffer = (header, dataRows) => {
  const finalContent = [...header, ...dataRows, ["END"]];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(finalContent);
  xlsx.utils.book_append_sheet(wb, ws, "Part List");
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

async function handleDownloadMain(req, res) {
  try {
    const templatePath = path.join(__dirname, '../templates/MainFormat.xlsx');
    if (!fs.existsSync(templatePath)) return res.status(400).json({ error: 'Template file not found.' });

    const { batchId, groups } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });
    const selectedGroups = groups ? groups.split(',') : [];

    const db = await connectDB();
    const groupPrefix = await getStoredGroupPrefix(db, batchId);
    const tgRows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
    const ppRows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

    const { ppMap } = buildPpIndex(ppRows, { excludePartDesc: ['WHEEL ASSY'] });

    const validRows = [];
    for (const r of tgRows) {
      const t = JSON.parse(r.data);
      const { valid } = cleanTargetRow(t, { mode: 'main' });
      if (!valid) continue;

      const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
      const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();
      const source = String(t['Source'] || t['Source '] || '').trim();

      const keyTG = buildMatchKey(tgDock, partNo);
      const p = ppMap.get(keyTG);

      if (p) {
        const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();
        const shop = computeShop(ppDock, { mode: 'main' });

        if (shop === 'K') continue;

        t['Group'] = groupPrefix + shop + source;
        validRows.push({ target_data: t, proc_data: p });
      }
    }

    const wbTemplate = xlsx.readFile(templatePath);
    const wsTemplate = wbTemplate.Sheets[wbTemplate.SheetNames[0]];
    const header = xlsx.utils.sheet_to_json(wsTemplate, { header: 1 }).slice(0, 5);

    const generateDataRow = (t, p) => [
      "AA", "B", blankOrTrim(t['Group']), "6", blankOrTrim(p['PART #'] || p['PART # ']).substring(0, 10),
      blankOrTrim(p['Suffix No']), blankOrTrim(p['COMP']), "S", blankOrTrim(p['Production Routing'] || p['Production Routing ']),
      blankOrTrim(p['DOCK'] || p['DOCK ']), blankOrTrim(p['SUPL']), blankOrTrim(p['PLANT']), blankOrTrim(p['S.DOCK']),
      "", "", blankOrTrim(p['KBN']), blankOrTrim(t['Source'] || t['Source ']), blankOrTrim(p['Dock Comb.']),
      blankOrTrim(p['Model Name']).substring(0, 4), blankOrTrim(p['Life Cycle Code'] || p['Life cycle code']),
      blankOrTrim(p['V.SHARE FLG[SYS L/O DATE BASIS]']), blankOrTrim(p['V.SHARE VALUE']),
      blankOrTrim(p['ORD Method']), blankOrTrim(p['QTY /CONT']), blankOrTrim(p['PACK QTY/CONT']),
      "3", blankOrTrim(p['PART DESC'])
    ];

    if (selectedGroups.length === 1) {
      const groupName = selectedGroups[0];
      const dataRows = validRows.filter(r => r.target_data['Group'] === groupName).map(r => generateDataRow(r.target_data, r.proc_data));
      res.setHeader('Content-Disposition', `attachment; filename=PartList_${groupName}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(generateExcelBuffer(header, dataRows));
    } else {
      res.setHeader('Content-Disposition', `attachment; filename=PartList_Batches_${batchId}.zip`);
      res.setHeader('Content-Type', 'application/zip');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      const folderName = `PartList_${batchId}`; 
      for (const groupName of selectedGroups) {
        const dataRows = validRows.filter(r => r.target_data['Group'] === groupName).map(r => generateDataRow(r.target_data, r.proc_data));
        if (dataRows.length > 0) archive.append(generateExcelBuffer(header, dataRows), { name: `${folderName}/PartList_${groupName}.xlsx` });
      }
      await archive.finalize();
    }
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
}

router.get('/download-main', handleDownloadMain);

async function handlePreviewMain(req, res) {
  try {
    const { batchId, prefix } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();

    // Only an explicit prefix represents a real Merge action on this batch —
    // the no-prefix fallback is also used to passively re-view a (possibly
    // unrelated, non-active) batch from history, which must never broadcast.
    const isRealMergeAction = prefix !== undefined && prefix !== null;

    let groupPrefix;
    if (isRealMergeAction) {
      const { valid, error } = validateGroupPrefix(prefix);
      if (!valid) return res.status(400).json({ error });
      await setStoredGroupPrefix(db, batchId, prefix);
      groupPrefix = prefix;
    } else {
      groupPrefix = await getStoredGroupPrefix(db, batchId);
    }
    // Every prefix actually used for a batch — whether explicitly provided or
    // just the untouched stored/default value — goes into the suggestion
    // history the same way, including the default itself.
    await recordGroupPrefixUsage(db, groupPrefix);

    const tgRows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
    const ppRows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

    const { ppMap, allPpMap, duplicateKeys } = buildPpIndex(ppRows, { excludePartDesc: ['WHEEL ASSY'] });

    const previewData = [];
    const remindData = []; // 🔴 สร้าง Array สำหรับข้อมูล Remind

    for (const r of tgRows) {
      const t = JSON.parse(r.data);
      const { valid } = cleanTargetRow(t, { mode: 'main' });
      if (!valid) continue;

      const supplier = String(t['Supplier'] || t['Supplier '] || '').trim();
      const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
      const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();
      const source = String(t['Source'] || t['Source '] || '').trim();

      const keyTG = buildMatchKey(tgDock, partNo);
      const p = ppMap.get(keyTG);

      if (p) {
        const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();
        const shop = computeShop(ppDock, { mode: 'main' });

        if (shop === 'K') continue;

        t['Group'] = groupPrefix + shop + source;

        previewData.push({
          "Company*": "AA",
          "Company plant code*": "B",
          "Group ID*": blankOrTrim(t['Group']),
          "CTL flag*": "6",
          "Part No.*": blankOrTrim(p['PART #'] || p['PART # ']).substring(0, 10),
          "Suffix*": blankOrTrim(p['Suffix No']),
          "Receiving company*": blankOrTrim(p['COMP']),
          "Receiving company plant code*": "S",
          "Production process routing": blankOrTrim(p['Production Routing'] || p['Production Routing ']),
          "Dock code*": blankOrTrim(p['DOCK'] || p['DOCK ']),
          "Supplier*": blankOrTrim(p['SUPL']),
          "Supplier plant code*": blankOrTrim(p['PLANT']),
          "Supplier shipping dock": blankOrTrim(p['S.DOCK']),
          "Previous process routing": "",
          "Dummy": "",
          "Kanban No.*": blankOrTrim(p['KBN']),
          "Source code*": blankOrTrim(t['Source'] || t['Source ']),
          "Hikiate matching key*": blankOrTrim(p['Dock Comb.']),
          "Model 1": blankOrTrim(p['Model Name']).substring(0, 4),
          "Life cycle code*": blankOrTrim(p['Life cycle code'] || p['Life Cycle Code']),
          "Vender share type": blankOrTrim(p['V.SHARE FLG[SYS L/O DATE BASIS]']),
          "Vender share value": blankOrTrim(p['V.SHARE VALUE']),
          "Order method*": blankOrTrim(p['ORD Method']),
          "Order lot*": blankOrTrim(p['QTY /CONT']),
          "Order lot size*": blankOrTrim(p['PACK QTY/CONT']),
          "Round up flag*": "3",
          "Part name*": blankOrTrim(p['PART DESC'])
        });
      } else {
        // 🔴 ถ้าไม่มีข้อมูลใน Part Procure ให้เอามาใส่ Remind (เงื่อนไขเดียวกับ Handheld)
        if (!allPpMap.has(keyTG)) {
            remindData.push({
                "Dock IH": tgDock,
                "Supplier": supplier,
                "Part No": partNo,
                "Source": source,
                "Reason": "Missing in Part Procurement"
            });
        }
      }
    }
    if (isRealMergeAction) emitEvent(EVENTS.BATCH_MERGE_UPDATED, { batchId });
    // 🔴 ส่งข้อมูล remind กลับไปพร้อมกัน
    res.json({ message: 'Success', count: previewData.length, data: previewData, remind: remindData, duplicateKeys });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
}

router.get('/preview-main', handlePreviewMain);

module.exports = router;
module.exports.handleDownloadMain = handleDownloadMain;
module.exports.handlePreviewMain = handlePreviewMain;