'use client';

/**
 * MiniSpinner
 * Spinner pequeño doble anillo. Usado en botones o estados in-line.
 * Comparte el lenguaje visual de LoadingState para coherencia.
 *
 * Props:
 *  - size: tamaño en px (por defecto 16)
 *  - color: color del aro principal (por defecto blanco para botones)
 */
export function MiniSpinner({ size = 16, color = '#ffffff' }) {
  return (
    <span
      className="mini-spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style jsx>{`
        .mini-spinner {
          display: inline-block;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-top-color: ${color};
          animation: mini-spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes mini-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

/**
 * LoadingState
 * Loader visible y profesional para pantallas de carga.
 *
 * Props:
 *  - message: texto principal (por defecto: "Cargando datos")
 *  - submessage: texto secundario opcional
 *  - fullscreen: si true ocupa min-height alto (uso en fallback de Suspense)
 */
export default function LoadingState({
  message = 'Cargando datos',
  submessage = null,
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
        {/* Spinner doble anillo: aro exterior + interior contra-rotando */}
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
          {submessage && <span className="loading-sub">{submessage}</span>}
        </div>

        {/* Barra de progreso indeterminada — refuerza señal de carga */}
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" />
        </div>
      </div>

      <style jsx>{`
        .loading-state {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .loading-state.is-fullscreen {
          min-height: 60vh;
        }

        .loading-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          max-width: 360px;
          width: 100%;
          text-align: center;
          animation: fadeIn 0.3s ease-out;
        }

        /* ===== Spinner ===== */
        .spinner-wrapper {
          position: relative;
          width: 88px;
          height: 88px;
        }

        .spinner-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 4px solid transparent;
        }

        /* Aro exterior — rota lento, color marca */
        .spinner-ring.outer {
          border-top-color: var(--brand-orange);
          border-right-color: var(--brand-orange);
          animation: spin 1.4s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite;
          box-shadow: 0 0 24px rgba(243, 112, 33, 0.15);
        }

        /* Aro interior — más pequeño, contra-rotación rápida, gris suave */
        .spinner-ring.inner {
          inset: 14px;
          border-top-color: var(--text-secondary);
          border-left-color: var(--text-secondary);
          opacity: 0.55;
          animation: spin-reverse 1s linear infinite;
        }

        /* Núcleo central — punto pulsante marca */
        .spinner-core {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 10px;
          height: 10px;
          margin: -5px 0 0 -5px;
          border-radius: 50%;
          background: var(--brand-orange);
          animation: pulse 1.4s ease-in-out infinite;
        }

        /* ===== Texto ===== */
        .loading-text {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .loading-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0.01em;
        }

        .loading-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        /* Puntos animados — uno tras otro */
        .dots {
          display: inline-flex;
          margin-left: 2px;
        }
        .dot {
          opacity: 0;
          animation: dotFade 1.4s infinite;
        }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        /* ===== Barra progreso indeterminada ===== */
        .progress-track {
          position: relative;
          width: 220px;
          height: 4px;
          background: var(--border-color);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(
            90deg,
            transparent,
            var(--brand-orange) 50%,
            transparent
          );
          border-radius: 999px;
          animation: slide 1.6s ease-in-out infinite;
        }

        /* ===== Keyframes ===== */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
        @keyframes dotFade {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Reduce motion — respetar accesibilidad */
        @media (prefers-reduced-motion: reduce) {
          .spinner-ring.outer,
          .spinner-ring.inner,
          .spinner-core,
          .dot,
          .progress-bar,
          .loading-stage {
            animation-duration: 3s;
          }
        }
      `}</style>
    </div>
  );
}
