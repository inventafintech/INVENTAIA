'use client';

export default function GlobalLoading() {
  return (
    <div
      className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4"
      style={{ background: 'var(--color-paper)' }}
      role="status"
      aria-label="Cargando"
    >
      <div className="wise-spinner" aria-hidden="true" />
      <p
        className="font-medium text-sm animate-pulse"
        style={{ color: 'var(--color-slate)' }}
      >
        Cargando datos desde la red...
      </p>
    </div>
  );
}
