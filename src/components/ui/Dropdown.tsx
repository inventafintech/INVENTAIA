'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, MapPin, Check, Loader2 } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
}

/**
 * Selector desplegable del sistema de diseño (reemplaza al <select> nativo):
 * mismo radio/borde/hover/sombra en toda la plataforma, agrupación opcional,
 * navegación por teclado (↑↓/Enter/Esc) y targets táctiles ≥44px.
 */
export function Dropdown({ options, value, onChange, placeholder = 'Seleccionar', ariaLabel, disabled = false, loading = false, loadingText = 'Cargando…', emptyText = 'Sin opciones disponibles' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open ]);

  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open ]);

  // Aplanar preservando encabezados de grupo para navegación
  const flat: Array<{ type: 'header'; group: string } | { type: 'option'; option: DropdownOption; index: number }> = [];
  let lastGroup: string | null = null;
  const optionList = options;
  optionList.forEach((o) => {
    if (o.group && o.group !== lastGroup) {
      flat.push({ type: 'header', group: o.group });
      lastGroup = o.group;
    }
    flat.push({ type: 'option', option: o, index: optionList.indexOf(o) });
  });
  const navigable = flat.filter((f) => f.type === 'option') as Array<{ type: 'option'; option: DropdownOption; index: number }>;

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (loading || disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open || navigable.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % navigable.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + navigable.length) % navigable.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? navigable[activeIndex] : undefined;
      if (target) choose(target.option.value);
    }
  };

  let lastRenderedGroup: string | null = null;

  const isBusy = disabled || loading;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !isBusy && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-busy={loading}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 12px',
          borderRadius: '8px',
          border: `1px solid ${open ? '#2563eb' : '#cbd5e1'}`,
          background: '#f8fafc',
          fontSize: '14px',
          color: selected ? '#0f172a' : '#64748b',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 2px rgba(37,99,235,0.12)' : 'none',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? loadingText : selected ? selected.label : placeholder}
        </span>
        {loading ? (
          <Loader2 size={15} color="#2563eb" style={{ animation: 'inventa-spin 1s linear infinite', flexShrink: 0 }} aria-hidden="true" />
        ) : (
          <ChevronDown size={15} color="#64748b" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
        )}
      </button>

      {open && !isBusy && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: '6px',
            listStyle: 'none',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 16px 36px rgba(15,23,42,0.16)',
            zIndex: 70,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && (
            <li style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
              {loading ? loadingText : emptyText}
            </li>
          )}
          {options.map((o) => {
            const showHeader = o.group && o.group !== lastRenderedGroup;
            lastRenderedGroup = o.group || lastRenderedGroup;
            const flatIdx = navigable.findIndex((n) => n.option.value === o.value);
            const isActive = flatIdx === activeIndex;
            const isSelected = o.value === value;
            return (
              <React.Fragment key={o.value}>
                {showHeader && (
                  <li
                    aria-hidden="true"
                    style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#2563eb', padding: '8px 10px 4px 10px' }}
                  >
                    {o.group}
                  </li>
                )}
                <li role="option" aria-selected={isSelected} id={`ds-opt-${flatIdx}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                    onClick={() => choose(o.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: isActive ? '#eff6ff' : 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '10px',
                      minHeight: '44px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <MapPin size={15} color={isSelected ? '#2563eb' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.label}
                      </span>
                      {o.hint && (
                        <span style={{ display: 'block', fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={15} color="#2563eb" style={{ flexShrink: 0 }} />}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
      {loading && <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>}
    </div>
  );
}

export default Dropdown;
