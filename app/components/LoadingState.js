/**
 * MiniSpinner
 * Spinner pequeño. Usado en botones o estados in-line.
 * Comparte el lenguaje visual de LoadingState para coherencia.
 *
 * Props:
 *  - size: tamaño en px (por defecto 16)
 *  - color: color del aro principal (por defecto blanco para botones)
 *
 * Los estilos viven en globals.css (.mini-spinner) para garantizar que
 * se aplican siempre, incluso cuando el componente se renderiza como
 * fallback de Suspense durante el SSR inicial.
 */
export function MiniSpinner({ size = 16, color = '#ffffff' }) {
  return (
    <span
      className="mini-spinner"
      style={{ width: size, height: size, borderTopColor: color }}
      aria-hidden="true"
    />
  );
}

/**
 * LoadingState
 * Loader visible y profesional para pantallas de carga.
 *
 * Estilos definidos en globals.css. Componente server-renderable (sin
 * 'use client') para que se vea correctamente durante el SSR inicial.
 *
 * Props:
 *  - message: texto principal (por defecto: "Cargando datos")
 *  - submessage: texto secundario opcional
 *  - submessageVariant: 'default' | 'warning' (aviso consulta lenta)
 *  - fullscreen: si true ocupa min-height alto (uso en fallback de Suspense)
 */
export default function LoadingState({
  message = 'Cargando datos',
  submessage = null,
  submessageVariant = 'default',
  fullscreen = true,
}) {
  return (
    <div
      className={`loading-state ${fullscreen ? 'is-fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-stage">
        <div className="spinner-wrapper" aria-hidden="true">
          <div className="spinner-ring outer" />
          <div className="spinner-ring inner" />
          <div className="spinner-core" />
        </div>

        <div className="loading-text">
          <span className="loading-title">
            {message}
            <span className="dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </span>
          </span>
          {submessage && (
            <span className={`loading-sub loading-sub--${submessageVariant}`}>
              {submessage}
            </span>
          )}
        </div>

        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" />
        </div>
      </div>
    </div>
  );
}
