'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state (default to light per request)
    const isDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(isDarkClass);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem', borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'var(--surface-color)', color: 'var(--brand-orange)',
        cursor: 'pointer', fontWeight: '500'
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {isDark ? 'Modo Claro' : 'Modo Escuro'}
    </button>
  );
}
