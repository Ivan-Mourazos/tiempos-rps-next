import LoadingState from './components/LoadingState';

/**
 * Loading UI a nivel de ruta (App Router).
 *
 * Next.js usa este archivo como fallback de Suspense que envuelve
 * automáticamente al `page.js`. Aparece en:
 *
 *  - Primera carga / F5 mientras el server procesa la query inicial.
 *  - Navegación cliente a una ruta nueva que aún no tiene HTML cacheado.
 *
 * Para cambios de filtros dentro de la misma ruta usamos `useTransition`
 * en FilterForm (ver ese componente).
 */
export default function Loading() {
  return <LoadingState message="Cargando datos" />;
}
