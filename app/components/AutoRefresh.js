'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Refresca os datos do servidor cada `interval` ms, só coa pestana visible.
 * Coa pestana oculta non lanza consultas á BD; ao volver, refresca de inmediato
 * se os datos quedaron vellos.
 */
export default function AutoRefresh({ interval = 60000 }) {
  const router = useRouter();

  useEffect(() => {
    let timer = null;
    let lastRefresh = Date.now();

    const refresh = () => {
      lastRefresh = Date.now();
      router.refresh();
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(refresh, interval);
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      if (Date.now() - lastRefresh >= interval) refresh();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router, interval]);

  return null;
}
