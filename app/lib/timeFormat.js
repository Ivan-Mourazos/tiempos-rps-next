/** Formatea segundos desde medianoche como HH:mm. */
export function formatSecondsAsClock(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return '';

  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return '';

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
