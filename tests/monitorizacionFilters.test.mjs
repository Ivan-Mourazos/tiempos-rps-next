import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyMonitorizacionFilters,
  normalizeIsoDate,
  normalizeMonitorizacionFilters,
} from '../app/lib/monitorizacionFilters.js';

function createRequestMock() {
  const inputs = [];
  return {
    inputs,
    input(name, value) {
      inputs.push([name, value]);
      return this;
    },
  };
}

test('normaliza datas reais e rexeita datas imposibles', () => {
  assert.equal(normalizeIsoDate('2024-02-29'), '2024-02-29');
  assert.equal(normalizeIsoDate('2025-02-29'), '');
  assert.equal(normalizeIsoDate('9999-01-01'), '');
});

test('limita e normaliza valores procedentes da URL', () => {
  const filters = normalizeMonitorizacionFilters({
    tecnico: [' TEC\0NICO ', 'ignorado'],
    tipo: 'vt',
    prioridad: '999',
    cliente: `  ${'a'.repeat(150)}  `,
    telefono: '1'.repeat(80),
    fechaInicio: '2026-07-13',
  });

  assert.equal(filters.tecnico, 'TEC NICO');
  assert.equal(filters.tipo, 'VT');
  assert.equal(filters.prioridad, 'TODAS');
  assert.equal(filters.cliente.length, 100);
  assert.equal(filters.telefono.length, 32);
  assert.equal(filters.fechaInicio, '2026-07-13');
});

test('limita palabras de cliente y conserva SQL parametrizado', () => {
  const request = createRequestMock();
  const query = applyMonitorizacionFilters('SELECT 1 WHERE 1=1', request, {
    cliente: 'uno dos tres cuatro cinco seis siete ocho nueve diez',
    fechaInicio: '2026-07-13',
  });

  const clientWordInputs = request.inputs.filter(([name]) => /^cliente\d+$/.test(name));
  assert.equal(clientWordInputs.length, 8);
  assert.match(query, /@cliente0/);
  assert.doesNotMatch(query, /@cliente8/);
  assert.ok(request.inputs.some(([name, value]) => name === 'fechaInicio' && value === '2026-07-13'));
});

