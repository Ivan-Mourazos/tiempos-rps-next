'use client';

import { List, Map } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFilterNav } from './FilterNavContext';

const VIEWS = [
  { value: 'listado', label: 'Lista', icon: List },
  { value: 'mapa', label: 'Mapa', icon: Map },
];

export default function ViewSwitcher({ currentView }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startTransition } = useFilterNav();

  function selectView(nextView) {
    if (nextView === currentView) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextView === 'mapa') params.set('vista', 'mapa');
    else params.delete('vista');

    const href = params.size ? `/?${params.toString()}` : '/';
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <div className="view-switcher" role="group" aria-label="Vista de resultados">
      {VIEWS.map(({ value, label, icon: Icon }) => {
        const active = currentView === value;
        return (
          <button
            key={value}
            type="button"
            className={`view-switcher-btn ${active ? 'is-active' : ''}`}
            onClick={() => selectView(value)}
            aria-pressed={active}
            title={`Vista ${label.toLowerCase()}`}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
