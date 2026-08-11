// A whitespace-only Excel cell (someone pressed spacebar instead of leaving
// it empty) is truthy in JS, so the common `value || ""` pattern lets it
// through as a stray space instead of treating it as blank. Use this for any
// display/output field pulled straight from source data; matching-key
// fields already do their own String(...).trim() and should stay untouched.
function blankOrTrim(value) {
  return String(value ?? '').trim();
}

// SheetJS's aoa_to_sheet/json_to_sheet treat a `null` array/property value as
// "no cell here" but an empty string `''` as a real (blank-looking) text
// cell — and Excel counts that cell as non-blank in things like Pivot Table
// aggregations. Apply this only right before handing a row to the xlsx
// writer, never to blankOrTrim's own JSON/preview output, which needs `''`.
function toExcelCellValue(value) {
  return value === '' ? null : value;
}

module.exports = { blankOrTrim, toExcelCellValue };
