/**
 * Escala de prioridade en tgm_monitorizacion (TGM).
 * 1 = baixa, 2 = media, 3 = alta (a máis urxente).
 */
export const PRIORIDAD_ALTA = 3;
export const PRIORIDAD_MEDIA = 2;
export const PRIORIDAD_BAIXA = 1;

const PRIORIDAD_LABELS = {
  1: 'Baixa',
  2: 'Media',
  3: 'Alta',
};

/** Texto para opcións do filtro: "3 — Alta" */
export function formatPrioridadOption(value) {
  const n = Number(value);
  const label = PRIORIDAD_LABELS[n];
  return label ? `${n} — ${label}` : String(value);
}

/** Orden no desplegable: alta primeiro (3 → 1) */
export function sortPrioridadesForFilter(prioridades) {
  return [...prioridades].sort((a, b) => Number(b) - Number(a));
}
