'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyThemeMode, readThemeFromDocument } from '../lib/theme';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(readThemeFromDocument() === 'dark');
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    applyThemeMode(nextDark ? 'dark' : 'light');
    setIsDark(nextDark);
  };

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo escuro'}
      title={isDark ? 'Modo Claro' : 'Modo Escuro'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
