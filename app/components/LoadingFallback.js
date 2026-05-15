'use client';

import { useSearchParams } from 'next/navigation';
import LoadingState from './LoadingState';
import { getSlowQueryWarningMessage } from '../lib/dateRange';

/**
 * Loader que lee as datas da URL (F5, entrada directa con filtros).
 * loading.js de App Router non recibe searchParams; este componente si.
 */
export default function LoadingFallback() {
  const searchParams = useSearchParams();
  const fechaInicio = searchParams.get('fechaInicio') || '';
  const fechaFin = searchParams.get('fechaFin') || '';
  const submessage = getSlowQueryWarningMessage(fechaInicio, fechaFin);

  return (
    <LoadingState
      message="Cargando datos"
      submessage={submessage}
      submessageVariant={submessage ? 'warning' : 'default'}
    />
  );
}
