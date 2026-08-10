const express = require('express');
const { connectDB } = require('../database');
const { buildPpIndex, cleanTargetRow, computeShop, dedupeDockEqualsSupplierRows } = require('../lib/partMatching');
const { buildMatchKey } = require('../lib/keyUtils');
const { getField } = require('../lib/fieldAliases');
const { emitEvent, EVENTS } = require('../lib/socketHub');
const { blankOrTrim } = require('../lib/textUtils');
const router = express.Router();

async function handlePreviewHandheld(req, res) {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' });

    const db = await connectDB();
    const tgRows = await db.all('SELECT data FROM target_ro WHERE batch_id = ?', batchId);
    const ppRows = await db.all('SELECT data FROM part_procurement WHERE batch_id = ?', batchId);

    if (tgRows.length === 0 || ppRows.length === 0) return res.status(404).json({ error: 'No Raw Data found.' });

    const { ppMap, duplicateKeys } = buildPpIndex(ppRows, { excludePartDesc: ['WHEEL ASSY'] });

    const cleanedRows = [];
    for (const r of tgRows) {
      const t = JSON.parse(r.data);
      const { valid, isDockEqualsSupplier } = cleanTargetRow(t, { mode: 'handheld' });
      if (!valid) continue;
      t.isDockEqualsSupplier = isDockEqualsSupplier;
      cleanedRows.push(t);
    }
    const dedupedRows = dedupeDockEqualsSupplierRows(cleanedRows, (row) => getField(row, 'PART_NO_TG'));

    const previewData = [];

    for (const t of dedupedRows) {
      const tgDock = String(t['Dock IH routing'] || t['Dock IH routing '] || '').trim();
      const supplier = String(t['Supplier'] || t['Supplier '] || '').trim();
      const partNo = String(t['Part No 12 Digits'] || t['Part No 12 Digits '] || '').trim();

      const keyTG = buildMatchKey(tgDock, partNo);
      const p = ppMap.get(keyTG);

      if (p) {
        const ppDock = String(p['DOCK'] || p['DOCK '] || '').trim();
        const shop = supplier === 'TTAT' ? 'TTAT' : computeShop(ppDock, { mode: 'handheld' });

        previewData.push({
          "Shop": shop,
          "Dock": ppDock,
          "Supplier": blankOrTrim(p['SUPL'] || p['SUPL ']),
          "S.plant": blankOrTrim(p['PLANT'] || p['PLANT ']),
          "S.dock": blankOrTrim(p['S.DOCK'] || p['S.DOCK ']),
          "Part no.": blankOrTrim(p['PART #'] || p['PART # ']),
          "Part name": blankOrTrim(p['PART DESC'] || p['PART DESC ']),
          "kbn": blankOrTrim(p['KBN'] || p['KBN ']),
          "Q'ty": blankOrTrim(p['QTY /CONT'] || p['QTY /CONT '])
        });
      }
    }

    emitEvent(EVENTS.HANDHELD_UPDATED, { batchId });
    res.json({ message: 'Success', count: previewData.length, data: previewData, duplicateKeys });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate handheld preview' });
  }
}

router.get('/preview-handheld', handlePreviewHandheld);

module.exports = router;
module.exports.handlePreviewHandheld = handlePreviewHandheld;
