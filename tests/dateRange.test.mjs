import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expandDefaultDateRangeForTextSearch,
  getPreviousYearISO,
} from '../app/lib/dateRange.js';

test('amplía a doce meses a busca por cliente que estaba limitada a hoxe', () => {
  const filters = expandDefaultDateRangeForTextSearch({
    cliente: 'Cliente exemplo',
    telefono: '',
    fechaInicio: '2026-07-13',
    fechaFin: '',
  }, '2026-07-13');

  assert.equal(filters.fechaInicio, '2025-07-13');
  assert.equal(filters.fechaFin, '2026-07-13');
});

test('amplía tamén a busca por teléfono', () => {
  const filters = expandDefaultDateRangeForTextSearch({
    cliente: '',
    telefono: '600123123',
    fechaInicio: '2026-07-13',
    fechaFin: '',
  }, '2026-07-13');

  assert.equal(filters.fechaInicio, '2025-07-13');
  assert.equal(filters.fechaFin, '2026-07-13');
});

test('respecta un rango de datas escollido polo usuario', () => {
  const filters = {
    cliente: 'Cliente exemplo',
    telefono: '',
    fechaInicio: '2026-06-01',
    fechaFin: '2026-06-30',
  };

  assert.strictEqual(
    expandDefaultDateRangeForTextSearch(filters, '2026-07-13'),
    filters
  );
});

test('non amplía a data de hoxe sen busca textual', () => {
  const filters = {
    cliente: '',
    telefono: '',
    fechaInicio: '2026-07-13',
    fechaFin: '',
  };

  assert.strictEqual(
    expandDefaultDateRangeForTextSearch(filters, '2026-07-13'),
    filters
  );
});

test('axusta correctamente o 29 de febreiro ao ano anterior', () => {
  assert.equal(getPreviousYearISO('2024-02-29'), '2023-02-28');
  assert.equal(getPreviousYearISO('data-non-valida'), '');
});
