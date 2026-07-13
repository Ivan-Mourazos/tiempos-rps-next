'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useFilterNav } from './FilterNavContext';

export default function ClearFiltersButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startTransition } = useFilterNav();

  function handleClear() {
    const href = searchParams.get('vista') === 'mapa' ? '/?vista=mapa' : '/';
    startTransition(() => router.push(href));
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
