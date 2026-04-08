'use client';

export default function JobCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-line short" />
        <div className="skeleton-badge" />
      </div>
      <div className="skeleton-grid">
        <div className="skeleton-line medium" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line long" />
      </div>
      <div className="skeleton-body" />
      <div className="skeleton-footer">
        <div className="skeleton-line short" />
        <div className="skeleton-button" />
      </div>

      <style jsx>{`
        .skeleton-card {
          background-color: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: var(--shadow-sm);
        }

        .skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .skeleton-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }

        .skeleton-body {
          height: 60px;
          background-color: var(--bg-color);
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .skeleton-footer {
          margin-top: auto;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .skeleton-line {
          height: 12px;
          background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-color) 50%, var(--bg-color) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-badge {
          width: 80px;
          height: 20px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-color) 50%, var(--bg-color) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        .skeleton-button {
          width: 100px;
          height: 32px;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-color) 50%, var(--bg-color) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        .short { width: 30%; }
        .medium { width: 70%; }
        .long { width: 100%; grid-column: 1 / -1; }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
