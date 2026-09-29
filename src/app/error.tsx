'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Global Error:', error);
  }, [error]);

  return (
    <div
      className="w-full h-[80vh] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--color-paper)' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'var(--color-fog)',
          color: 'var(--color-forest-ink)',
          border: '1px solid var(--color-forest-ink)',
        }}
        aria-hidden="true"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2
        className="text-2xl font-bold mb-2"
        style={{ color: 'var(--color-obsidian)', letterSpacing: '-0.011em' }}
      >
        Algo salió mal
      </h2>
      <p
        className="mb-8 max-w-md"
        style={{ color: 'var(--color-charcoal)', fontSize: '16px' }}
      >
        Hemos detectado un error inesperado al procesar tu solicitud. El equipo técnico ha sido notificado.
      </p>
      <button onClick={() => reset()} className="wise-btn-primary">
        Intentar nuevamente
      </button>
    </div>
  );
}
