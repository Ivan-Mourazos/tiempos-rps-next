'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { MiniSpinner } from './LoadingState';

export default function LoadMore({ currentLimit }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // O botón queda en "Cargando..." ata que chegan os datos novos (antes: 500 ms fixos).
  const [isLoading, startTransition] = useTransition();

  function handleLoadMore() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', currentLimit + 100);

    // scroll: false para que a páxina non salte ao principio
    startTransition(() => {
      router.push(`/?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="load-more">
      <button
        type="button"
        className="load-more-btn"
        onClick={handleLoadMore}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <MiniSpinner size={16} />
            Cargando...
          </>
        ) : (
          'Cargar máis resultados'
        )}
      </button>
    </div>
  );
}
