/** A partir de este número de días se muestra aviso de consulta lenta (no bloquea). */
export const SLOW_QUERY_THRESHOLD_DAYS = 31;

/** Tope de filas al buscar por cliente/teléfono (traer todos los coincidentes). */
export const SEARCH_RESULT_LIMIT = 10000;

/** Tope de filas en listados normales (sin búsqueda de texto). */
export const DEFAULT_LIST_LIMIT = 100;

/**
 * Cuenta días del intervalo [fechaInicio, fechaFin].
 * Si fechaFin está vacía, equivale a un solo día (misma lógica que el servidor).
 */
export function getDateRangeDayCount(fechaInicio, fechaFin) {
  if (!fechaInicio) return 0;

  const start = new Date(`${fechaInicio}T00:00:00`);
  const endStr = fechaFin || fechaInicio;
  const end = new Date(`${endStr}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return -1;

  return Math.floor(diffMs / 86400000) + 1;
}

export function isDateRangeInverted(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return false;
  return getDateRangeDayCount(fechaInicio, fechaFin) < 0;
}

/** Rango amplio: mostrar aviso en pantalla de carga, pero permitir la consulta. */
export function isSlowDateRange(fechaInicio, fechaFin, thresholdDays = SLOW_QUERY_THRESHOLD_DAYS) {
  const days = getDateRangeDayCount(fechaInicio, fechaFin);
  if (days <= 0) return false;
  return days > thresholdDays;
}

export function getSlowQueryWarningMessage(fechaInicio, fechaFin) {
  const days = getDateRangeDayCount(fechaInicio, fechaFin);
  if (!isSlowDateRange(fechaInicio, fechaFin)) return null;

  return `Intervalo amplo (${days} días): a consulta pode tardar varios segundos. Agarda, por favor.`;
}
