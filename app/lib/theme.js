/** Clave localStorage para preferencia de tema (persiste entre recargas). */
export const THEME_STORAGE_KEY = 'tg-theme';

/** Script inline no layout: aplica .dark antes do primeiro pintado. */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function applyThemeMode(mode) {
  const dark = mode === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    /* localStorage bloqueado */
  }
}

export function readThemeFromDocument() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
