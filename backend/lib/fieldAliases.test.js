const test = require('node:test');
const assert = require('node:assert');
const { getField } = require('./fieldAliases');

test('getField resolves known aliases', () => {
  assert.strictEqual(getField({ 'DOCK ': 'SW' }, 'DOCK'), 'SW');
  assert.strictEqual(getField({ 'PART #': 'ABC123' }, 'PART_NO_PP'), 'ABC123');
});

test('getField trims whitespace', () => {
  assert.strictEqual(getField({ 'DOCK': '  SW  ' }, 'DOCK'), 'SW');
});

test('getField returns empty string when missing', () => {
  assert.strictEqual(getField({}, 'DOCK'), '');
  assert.strictEqual(getField({ 'DOCK': '' }, 'DOCK'), '');
});

// T/C FROM(UNL) has no space before the parenthesis in the real Address
// Master source file (confirmed by the business owner) — this is the exact
// header variant that silently broke date-range filtering when read via a
// hardcoded 'T/C FROM (UNL)' literal, sending every row to Hold.
test('getField: TC_FROM_UNL resolves the real no-space header variant "T/C FROM(UNL)"', () => {
  const row = { 'T/C FROM(UNL)': '20180101' };
  assert.strictEqual(getField(row, 'TC_FROM_UNL'), '20180101');
});

test('getField: TC_FROM_UNL also resolves the space variant "T/C FROM (UNL)"', () => {
  const row = { 'T/C FROM (UNL)': '20180101' };
  assert.strictEqual(getField(row, 'TC_FROM_UNL'), '20180101');
});

test('getField: TC_TO_UNL resolves both the space and no-space header variants', () => {
  assert.strictEqual(getField({ 'T/C TO (UNL)': '20991231' }, 'TC_TO_UNL'), '20991231');
  assert.strictEqual(getField({ 'T/C TO(UNL)': '20991231' }, 'TC_TO_UNL'), '20991231');
});

test('getField: an unrecognized header for a canonical name returns empty string, not undefined', () => {
  const row = { 'Some Other Column': '20180101' };
  assert.strictEqual(getField(row, 'TC_FROM_UNL'), '');
});
