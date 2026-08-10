const test = require('node:test');
const assert = require('node:assert');
const { blankOrTrim } = require('./textUtils');

test('blankOrTrim: a single space becomes a true empty string', () => {
  assert.strictEqual(blankOrTrim(' '), '');
});

test('blankOrTrim: whitespace-only strings (tabs, multiple spaces) become empty', () => {
  assert.strictEqual(blankOrTrim('   '), '');
  assert.strictEqual(blankOrTrim('\t'), '');
});

test('blankOrTrim: null and undefined become empty', () => {
  assert.strictEqual(blankOrTrim(null), '');
  assert.strictEqual(blankOrTrim(undefined), '');
});

test('blankOrTrim: a real value keeps its content but loses surrounding whitespace', () => {
  assert.strictEqual(blankOrTrim('  ABC123  '), 'ABC123');
  assert.strictEqual(blankOrTrim('ABC123'), 'ABC123');
});
