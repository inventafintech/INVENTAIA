'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onClear?: () => void;
  title?: string;
  activeCount?: number;
  children: React.ReactNode;
}

/**
 * AdvancedFiltersDrawer — divulgación progresiva: las opciones secundarias
 * viven aquí (1 clic para abrir, 1 clic para aplicar/limpiar = máx. 2 clics).
 * Drawer lateral en desktop, sheet inferior-centrado en móvil (320px safe,
 * sin overflow horizontal, respetadvh y área táctil 44px).
 */
export default function AdvancedFiltersDrawer({ open, onClose, onClear, title = 'Filtros avanzados', activeCount = 0, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 90,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          background: 'var(--card, #fff)',
          width: 'min(360px, 100%)',
          maxWidth: '100%',
          height: '100dvh',
          overflowY: 'auto',
          borderLeft: '1px solid var(--line, #e2e8f0)',
          boxShadow: '-16px 0 40px rgba(15,23,42,0.18)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 18px',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            position: 'sticky',
            top: 0,
            background: 'var(--card, #fff)',
            zIndex: 1,
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink, #0f172a)', margin: 0, flex: 1, minWidth: 0 }}>
            {title}
            {activeCount > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#2563eb',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  verticalAlign: 'middle',
                }}
              >
                {activeCount}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar filtros avanzados"
            style={{
              background: 'transparent',
              border: '1px solid var(--line, #e2e8f0)',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: 0 }}>{children}</div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 18px calc(14px + env(safe-area-inset-bottom))',
            borderTop: '1px solid var(--line, #e2e8f0)',
            position: 'sticky',
            bottom: 0,
            background: 'var(--card, #fff)',
          }}
        >
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              style={{
                flex: 1,
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 2,
              background: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}
