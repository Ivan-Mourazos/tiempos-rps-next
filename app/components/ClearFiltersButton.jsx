'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useFilterNav } from './FilterNavContext';

export default function ClearFiltersButton() {
  const router = useRouter();
  const { startTransition } = useFilterNav();

  function handleClear() {
    startTransition(() => router.push('/'));
  }

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={handleClear}
      aria-label="Limpiar filtros"
      title="Limpiar filtros"
    >
      <Trash2 size={18} />
    </button>
  );
}
