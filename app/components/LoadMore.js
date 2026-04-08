'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoadMore({ currentLimit }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  function handleLoadMore() {
    setIsLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', currentLimit + 100);
    
    // Usamos scroll: false para que la página no salte al principio al cargar más
    router.push(`/?${params.toString()}`, { scroll: false });
    
    // Simulamos un pequeño retraso para que el usuario perciba la acción
    setTimeout(() => setIsLoading(false), 500);
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      padding: '2rem 1rem',
      width: '100%' 
    }}>
      <button
        onClick={handleLoadMore}
        disabled={isLoading}
        style={{
          padding: '0.8rem 2rem',
          background: 'var(--brand-orange)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Cargando...
          </>
        ) : (
          'Cargar máis resultados'
        )}
      </button>

      <style jsx>{`
        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        button:hover:not(:disabled) {
          background: var(--brand-orange-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
}
