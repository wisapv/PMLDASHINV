// ไฟล์: backend/handheld_part_list/assignAddrRoute.js
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { connectDB } = require('../database');
const { buildPpIndex, cleanTargetRow, dedupeDockEqualsSupplierRows, createFirstOccurrenceTracker } = require('../lib/partMatching');
const { buildMatchKey } = require('../lib/keyUtils');
const { parseExcelDate } = require('../lib/dateUtils');
const { getField } = require('../lib/fieldAliases');
const { getStoredGroupPrefix } = require('../lib/groupPrefix');
const { emitEvent, EVENTS } = require('../lib/socketHub');
const { blankOrTrim, toExcelCellValue } = require('../lib/textUtils');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const evaluatePicAndShop = (addrStr, dock, supplier) => {
    if (!addrStr) return { pic: 'A', shop: 'A', shouldDup: false };

    const addr = addrStr.trim().toUpperCase();
    const cleanAddr = addr.replace(/\s/g, '');
    const supl = supplier.trim().toUpperCase();

    // 1. W
    if (dock === 'SW' || dock === 'S9') return { pic: 'W', shop: 'W', shouldDup: true };
    // 2. T
    if (dock === 'ST') return { pic: 'T', shop: 'T', shouldDup: true };
    // 3. K
    if (dock === 'SK') return { pic: 'K', shop: 'K', shouldDup: false };

    // 4. TTAT
    if (dock === 'S6') {
        if (addr.startsWith('SS') && supl === 'TBAS') {
            return { pic: 'S4', shop: 'A', shouldDup: false };
        }
        if (addr.startsWith('SS') || addr.startsWith('TUSHO')) {
            return { pic: 'TTAT', shop: 'TTAT', shouldDup: false };
        }
    }

    // 5. R
    if (addr.startsWith('R.')) return { pic: 'R', shop: 'R', shouldDup: false };

    // 6. Shop A
    const shop = 'A';
    if (addr.startsWith('PC') || addr.startsWith('WH') || cleanAddr.length === 4) return { pic: 'PC', shop, shouldDup: true };
    if (/^(SBP|BP1|CH1|CH2|DO1|EG1|FA1|FN1|FN2|FN3|FN4|FR1|FR2|IP1|TR1|TR2|FA|SQ|SK)/.test(addr)) return { pic: 'A', shop, shouldDup: false };
    if (addr.startsWith('S4') || addr.startsWith('SS')) return { pic: 'S4', shop, shouldDup: false };
    if (/^(RA1|S5|SJ|SL|SM|SN|SO|SP)/.test(addr)) return { pic: 'S5', shop, shouldDup: false };
    // ALS parts are counted once at the Kanban Print Address only — no Lineside duplicate.
    if (addr.startsWith('S') && !/^(S5|S4|SJ|SL|SM|SN|SO|SP|SBP|SQ|SK)/.test(addr)) return { pic: 'ALS', shop, shouldDup: false };

    return { pic: 'A', shop, shouldDup: false };
};

// json_to_sheet has the same '' vs null quirk as aoa_to_sheet (see
// toExcelCellValue), so this is the write boundary for the Handheld export:
// dataRows here is whatever the client posts back (built from this route's
// own blankOrTrim(...) preview data), so '' needs converting to null right
// before it reaches json_to_sheet.
const toExcelRow = (row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, toExcelCellValue(value)])
);

const generateExcelBuffer = (dataRows) => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(dataRows.map(toExcelRow));
    xlsx.utils.book_append_sheet(wb, ws, "Handheld_Format");
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

router.post('/export-excel', express.json({ limit: '50mb' }), (req, res) => {
    try {
        const { data, fileName } = req.body;
        if (!data) return res.status(400).json({ error: "No data provided" });

        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        const buffer = generateExcelBuffer(jsonData);
        
        res.setHeader('Content-Disposition', `attachment; filename=${fileName || 'Handheld_Data'}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Export Excel Error:", err);
        res.status(500).send("Export Failed");
    }
});

async function handleProcessAssignAddr(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { batchId } = req.body;

        const db = await connectDB();
        const groupPrefix = await getStoredGroupPrefix(db, batchId);
        const tgRaw = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
        const ppRaw = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

        const today = new Date(); today.setHours(0, 0, 0, 0);

        const { ppMap, allPpMap, duplicateKeys } = buildPpIndex(ppRaw, { excludePartDesc: ['WHEEL ASSY'] });

        const addrWorkbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const addrSheet = addrWorkbook.Sheets[addrWorkbook.SheetNames[0]];
        const addrRaw = xlsx.utils.sheet_to_json(addrSheet);
        
        // Unlike Part Procurement (single active row per key), Address Master can
        // legitimately have multiple time-overlapping valid rows for the same
        // Dock+PartNo — genuinely different physical delivery/kanban points, not
        // sequential revisions. So addrMap is key -> row[], not key -> row; every
        // row whose [T/C FROM, T/C TO] window contains today is kept, not just the
        // last one parsed.
        const addrMap = new Map();
        const partNameAddrLookup = new Map();

        addrRaw.forEach(row => {
            const fromDate = parseExcelDate(row['T/C FROM (UNL)']);
            const toDate = parseExcelDate(row['T/C TO (UNL)']);
            const isActive = !isNaN(fromDate) && !isNaN(toDate) && fromDate <= today && today <= toDate;
            if (!isActive) return;

            const dock = String(row['DOCK'] || '').replace(/\s/g, '');
            const partNo = String(row['PART #'] || '').replace(/\s/g, '');
            const keyAddr = (dock + partNo).replace(/-/g, '');

            if (!addrMap.has(keyAddr)) addrMap.set(keyAddr, []);
            addrMap.get(keyAddr).push(row);

            const partNameKey = String(row['PART DESC'] || row['PART NAME'] || '').trim().toUpperCase();
            if (partNameKey) {
                partNameAddrLookup.set(partNameKey, row);
            }
        });

        const finalData = [];
        const holdData = [];
        const remindData = []; 
        const baseDataList = [];

        const cleanedRows = [];
        tgRaw.forEach(r => {
            const t = JSON.parse(r.data);
            const { valid, isDockEqualsSupplier } = cleanTargetRow(t, { mode: 'handheld' });
            if (!valid) return;
            t.isDockEqualsSupplier = isDockEqualsSupplier;
            cleanedRows.push(t);
        });
        const dedupedRows = dedupeDockEqualsSupplierRows(cleanedRows, (row) => getField(row, 'PART_NO_TG'));

        // Additive, and runs after the Dock=Supplier-subgroup dedup above —
        // safe/idempotent for rows that step already deduped, and catches
        // the general case (e.g. two rows differing only in an unused
        // source column like "CTL routing") across the full row set.
        const isFirstOccurrence = createFirstOccurrenceTracker();

        dedupedRows.forEach(t => {
            const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
            const supplier = String(t['Supplier'] || t['Supplier '] || '').trim();
            const partNoRaw = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();

            const keyTG = buildMatchKey(tgDock, partNoRaw);
            if (!isFirstOccurrence(keyTG)) return;

            const p = ppMap.get(keyTG);

            if (p) {
                baseDataList.push({ t, p, keyTG });
            } else {
                if (!allPpMap.has(keyTG)) {
                    remindData.push({
                        "Dock IH": tgDock,
                        "Supplier": supplier,
                        "Part No": partNoRaw,
                        "Source": blankOrTrim(t['Source'] || t['Source ']),
                        "Reason": "Missing in Part Procurement"
                    });
                }
            }
        });

        baseDataList.forEach(item => {
            const { t, p } = item;
            const ppDockValue = String(p['DOCK'] || p['DOCK '] || '').replace(/\s/g, '');
            const ppPartNo = String(p['PART #'] || p['PART # '] || '').replace(/\s/g, '');
            const addrLookupKey = (ppDockValue + ppPartNo).replace(/-/g, '');
            
            let addrInfoList = addrMap.get(addrLookupKey);

            if (!addrInfoList || addrInfoList.length === 0) {
                const partNameKey = String(p['PART DESC'] || p['PART DESC '] || '').trim().toUpperCase();
                const fallback = partNameAddrLookup.get(partNameKey);
                addrInfoList = fallback ? [fallback] : [];
            }

            const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();

            if (addrInfoList.length === 0) {
                holdData.push({
                    "Dock": ppDock,
                    "Supplier": blankOrTrim(p['SUPL'] || p['SUPL ']),
                    "Part No": blankOrTrim(p['PART #'] || p['PART # ']),
                    "Part Name": blankOrTrim(p['PART DESC'] || p['PART DESC ']),
                    "Reason": "Missing in Address Master"
                });
                return;
            }

            const source = String(t['Source'] || t['Source '] || '').trim();
            const ppSupplier = String(p['SUPL'] || p['SUPL '] || '').trim();

            const createFinalRow = (address, picType, finalShop, isLineside = false) => {
                // 🔴 จุดแก้ไข: เช็คว่าถ้า PIC เป็น A, R, K ให้ตัด 3 ตัวเลย
                let shortAddrLength = 2; // ค่าเริ่มต้น 2 ตัว
                
                if (['A', 'R', 'K'].includes(picType)) {
                    shortAddrLength = 3; // PIC A, R, K ใช้ 3 ตัว
                } else if (isLineside) {
                    shortAddrLength = 3; // Lineside อื่นๆ ใช้ 3 ตัวตามเดิม
                }

                const shortAddr = address.substring(0, shortAddrLength);

                return {
                    Shop: finalShop,
                    Group: groupPrefix + finalShop + source,
                    Dock: ppDock,
                    Supplier: blankOrTrim(p['SUPL'] || p['SUPL ']),
                    "S.plant": blankOrTrim(p['PLANT'] || p['PLANT ']),
                    "S.dock": blankOrTrim(p['S.DOCK'] || p['S.DOCK ']),
                    "Part no.": blankOrTrim(p['PART #'] || p['PART # ']),
                    "Part name": blankOrTrim(p['PART DESC'] || p['PART DESC ']),
                    kbn: blankOrTrim(p['KBN'] || p['KBN ']),
                    "Q'ty": blankOrTrim(p['QTY /CONT'] || p['QTY /CONT ']),
                    Addr: address,
                    ShortAddr: shortAddr, // 🔴 นำความยาวใหม่ที่คำนวณได้ไปใช้
                    PIC: picType
                };
            };

            // Address Master can have multiple time-overlapping valid rows for
            // this same part (genuinely different physical delivery/kanban
            // points, not sequential revisions) — each is processed
            // independently, so one part can produce more than one Kanban(+
            // Lineside) pair of output rows.
            for (const addrInfo of addrInfoList) {
                const kanbanAddrRaw = String(addrInfo['Kanban Print Address'] || '').trim().toUpperCase();
                const linesideAddrRaw = String(addrInfo['Lineside Address'] || '').trim().toUpperCase();

                const kanbanEval = evaluatePicAndShop(kanbanAddrRaw, ppDock, ppSupplier);

                if (kanbanAddrRaw) {
                    finalData.push(createFinalRow(kanbanAddrRaw, kanbanEval.pic, kanbanEval.shop, false));
                }

                // Only duplicate into a Lineside row when the group calls for it
                // AND the Lineside Address genuinely differs from the Kanban
                // Print Address for this same entry — otherwise it's the same
                // physical point counted twice.
                if (kanbanEval.shouldDup && linesideAddrRaw && linesideAddrRaw !== kanbanAddrRaw) {
                    const linesideEval = evaluatePicAndShop(linesideAddrRaw, ppDock, ppSupplier);
                    finalData.push(createFinalRow(linesideAddrRaw, linesideEval.pic, linesideEval.shop, true));
                }
            }
        });

        emitEvent(EVENTS.HANDHELD_UPDATED, { batchId });
        res.json({ success: true, data: finalData, hold: holdData, remind: remindData, duplicateKeys });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Process Failed' });
    }
}

router.post('/process-assign-addr', upload.single('file'), handleProcessAssignAddr);

module.exports = router;
module.exports.evaluatePicAndShop = evaluatePicAndShop;
module.exports.handleProcessAssignAddr = handleProcessAssignAddr;
module.exports.generateExcelBuffer = generateExcelBuffer;