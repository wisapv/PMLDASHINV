// A whitespace-only Excel cell (someone pressed spacebar instead of leaving
// it empty) is truthy in JS, so the common `value || ""` pattern lets it
// through as a stray space instead of treating it as blank. Use this for any
// display/output field pulled straight from source data; matching-key
// fields already do their own String(...).trim() and should stay untouched.
function blankOrTrim(value) {
  return String(value ?? '').trim();
}

module.exports = { blankOrTrim };
