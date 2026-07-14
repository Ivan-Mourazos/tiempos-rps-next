import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSecondsAsClock } from '../app/lib/timeFormat.js';

test('formatea a mesma hora de peche para mapa e tarxeta', () => {
  assert.equal(formatSecondsAsClock(17 * 3600 + 42 * 60 + 59), '17:42');
  assert.equal(formatSecondsAsClock(0), '00:00');
});

test('non mostra unha hora cando o dato está baleiro ou non é válido', () => {
  assert.equal(formatSecondsAsClock(null), '');
  assert.equal(formatSecondsAsClock(undefined), '');
  assert.equal(formatSecondsAsClock(''), '');
  assert.equal(formatSecondsAsClock(-1), '');
});
