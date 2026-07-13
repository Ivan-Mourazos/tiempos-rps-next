import { buildClienteWarningExistsClause } from './monitorizacionSql';

const MAX_CLIENT_SEARCH_WORDS = 8;
const VALID_PRIORITIES = new Set(['1', '2', '3']);
const TYPE_PATTERN = /^[A-Z0-9_-]{1,10}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value, maxLength) {
  return String(firstValue(value) || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeIsoDate(value) {
  const normalized = cleanText(value, 10);
  const match = normalized.match(ISO_DATE_PATTERN);
  if (!match) return '';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return '';

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return normalized;
}

export function normalizeMonitorizacionFilters(filters = {}) {
  const tecnico = cleanText(filters.tecnico, 100) || 'TODOS';
  const rawType = cleanText(filters.tipo, 10).toUpperCase();
  const rawPriority = cleanText(filters.prioridad, 5);

  return {
    tecnico,
    tipo: rawType === 'TODOS' || TYPE_PATTERN.test(rawType) ? rawType || 'TODOS' : 'TODOS',
    prioridad: rawPriority === 'TODAS' || VALID_PRIORITIES.has(rawPriority)
      ? rawPriority || 'TODAS'
      : 'TODAS',
    cliente: cleanText(filters.cliente, 100),
    telefono: cleanText(filters.telefono, 32),
    fechaInicio: normalizeIsoDate(filters.fechaInicio),
    fechaFin: normalizeIsoDate(filters.fechaFin),
  };
}

/**
 * Engade á consulta os mesmos filtros do panel e rexistra os parámetros SQL.
 * A consulta debe usar `m` como alias de tgm_monitorizacion.
 */
export function applyMonitorizacionFilters(query, request, filters) {
  const normalizedFilters = normalizeMonitorizacionFilters(filters);
  const {
    tecnico,
    tipo,
    prioridad,
    cliente,
    telefono,
    fechaInicio,
    fechaFin,
  } = normalizedFilters;

  if (tecnico && tecnico !== 'TODOS') {
    query += ' AND (m.abreviatura = @tecnico OR m.comercial = @tecnico)';
    request.input('tecnico', tecnico);
  }

  if (tipo && tipo !== 'TODOS') {
    query += ' AND m.tipo = @tipo';
    request.input('tipo', tipo);
  }

  if (prioridad && prioridad !== 'TODAS') {
    query += ' AND m.prioridad = @prioridad';
    request.input('prioridad', Number.parseInt(prioridad, 10));
  }

  const clienteLimpio = String(cliente || '').trim();
  if (clienteLimpio) {
    const palabras = clienteLimpio
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_CLIENT_SEARCH_WORDS);
    const paramNames = palabras.map((palabra, index) => {
      const name = `cliente${index}`;
      request.input(name, `%${palabra}%`);
      return name;
    });

    const directMatch = palabras
      .map((_, index) => `m.cliente LIKE @cliente${index}`)
      .join(' AND ');
    const warningExists = buildClienteWarningExistsClause(paramNames);

    query += ` AND ((${directMatch}) OR ${warningExists} OR m.aviso LIKE @clienteFull OR m.comercial LIKE @clienteFull)`;
    request.input('clienteFull', `%${clienteLimpio}%`);
  }

  const telefonoLimpio = String(telefono || '').trim();
  if (telefonoLimpio) {
    query += ' AND (m.Telefono1 LIKE @telefono OR m.Telefono2 LIKE @telefono)';
    request.input('telefono', `%${telefonoLimpio}%`);
  }

  if (fechaInicio) {
    query += ' AND m.fecha >= @fechaInicio';
    request.input('fechaInicio', fechaInicio);
  }

  const effectiveFechaFin = fechaFin || fechaInicio;
  if (effectiveFechaFin) {
    query += ' AND m.fecha < DATEADD(day, 1, @fechaFinSql)';
    request.input('fechaFinSql', effectiveFechaFin);
  }

  return query;
}

/** Mantén a orde histórica do listado. */
export function applyMonitorizacionOrder(query, filters) {
  const normalizedFilters = normalizeMonitorizacionFilters(filters);
  const effectiveFechaFin = normalizedFilters.fechaFin || normalizedFilters.fechaInicio;

  if (!normalizedFilters.fechaInicio && normalizedFilters.fechaFin) {
    return `${query} ORDER BY m.fecha ASC, m.hora DESC`;
  }

  if (
    normalizedFilters.fechaInicio &&
    effectiveFechaFin &&
    normalizedFilters.fechaInicio !== effectiveFechaFin
  ) {
    return `${query} ORDER BY m.fecha ASC, m.hora DESC`;
  }

  return `${query} ORDER BY m.fecha DESC, m.hora DESC`;
}
