'use client';

import { createContext, useContext, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingState from './LoadingState';
import { getSlowQueryWarningMessage } from '../lib/dateRange';

const FilterNavContext = createContext(null);

export function FilterNavProvider({ children }) {
  const [isPending, startTransition] = useTransition();

  return (
    <FilterNavContext.Provider value={{ isPending, startTransition }}>
      {children}
    </FilterNavContext.Provider>
  );
}

export function useFilterNav() {
  const ctx = useContext(FilterNavContext);
  if (!ctx) {
    throw new Error('useFilterNav debe usarse dentro de FilterNavProvider');
  }
  return ctx;
}

/**
 * Envuelve o tablero: mentres isPending (cambio de filtros) mostra
 * sempre o spinner a pantalla completa, sen texto solto no header.
 */
export function FilterNavMain({ children }) {
  const { isPending } = useFilterNav();
  const searchParams = useSearchParams();

  if (isPending) {
    const submessage = getSlowQueryWarningMessage(
      searchParams.get('fechaInicio'),
      searchParams.get('fechaFin')
    );

    return (
      <LoadingState
        message="Cargando datos"
        submessage={submessage}
        submessageVariant={submessage ? 'warning' : 'default'}
      />
    );
  }

  return children;
}
