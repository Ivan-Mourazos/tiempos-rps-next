import { Suspense } from 'react';
import LoadingState from './components/LoadingState';
import LoadingFallback from './components/LoadingFallback';

export default function Loading() {
  return (
    <Suspense fallback={<LoadingState message="Cargando datos" />}>
      <LoadingFallback />
    </Suspense>
  );
}
