'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Tag, Store, User, Building2, MapPin, SearchX } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import styles from './GlobalSearch.module.css';

interface SearchHit {
  id: string;
  name: string;
  detail: string;
  href: string;
}

interface SearchGroups {
  products: SearchHit[];
  suppliers: SearchHit[];
  clients: SearchHit[];
  branches: SearchHit[];
  locations: SearchHit[];
}

const EMPTY_GROUPS: SearchGroups = { products: [], suppliers: [], clients: [], branches: [], locations: [] };

const GROUP_META = [
  { key: 'products', label: 'Productos', icon: Tag },
  { key: 'suppliers', label: 'Proveedores', icon: Store },
  { key: 'clients', label: 'Clientes', icon: User },
  { key: 'branches', label: 'Sucursales', icon: Building2 },
  { key: 'locations', label: 'Ubicaciones', icon: MapPin },
] as const;

/** Resalta la coincidencia dentro del nombre (case-insensitive). */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className={styles.match}>{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroups>(EMPTY_GROUPS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();

  // Búsqueda disparada solo cuando el usuario deja de escribir (debounce 300ms)
  useEffect(() => {
    abortRef.current?.abort();
    if (trimmed.length < 2) {
      setGroups(EMPTY_GROUPS);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('search failed'))))
      .then((data) => {
        setGroups({
          products: data.products || [],
          suppliers: data.suppliers || [],
          clients: data.clients || [],
          branches: data.branches || [],
          locations: data.locations || [],
        });
        setActiveIndex(-1);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setGroups(EMPTY_GROUPS);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [trimmed]);

  const flatHits = useMemo(
    () => GROUP_META.flatMap((g) => (groups[g.key] as SearchHit[]).map((hit) => ({ ...hit, group: g.label }))),
    [groups]
  );
  const totalCount = flatHits.length;

  const goTo = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      setGroups(EMPTY_GROUPS);
      router.push(href);
    },
    [router]
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || totalCount === 0) {
      if (e.key === 'Enter' && trimmed.length >= 2) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? flatHits[activeIndex] : flatHits[0];
      if (target) goTo(target.href);
    }
  };

  const showDropdown = open && query.trim().length > 0;
  const showEmpty = showDropdown && !loading && trimmed.length >= 2 && totalCount === 0;
  const showHint = showDropdown && !loading && trimmed.length < 2;

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <div className={styles.searchBox}>
        {loading ? (
          <Loader2 size={16} strokeWidth={2} className={`${styles.searchIcon} ${styles.spin}`} aria-label="Buscando" />
        ) : (
          <Search size={16} strokeWidth={2} className={styles.searchIcon} />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="globalsearch-listbox"
          aria-activedescendant={activeIndex >= 0 ? `gs-option-${activeIndex}` : undefined}
          aria-label="Búsqueda global"
          placeholder="Buscar productos, clientes, proveedores, sucursales, ubicaciones"
          className={styles.searchInput}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {showDropdown && (
        <div id="globalsearch-listbox" role="listbox" className={styles.dropdown}>
          {showHint && (
            <div className={styles.hint}>Escribe al menos 2 caracteres para buscar…</div>
          )}
          {loading && totalCount === 0 && (
            <div className={styles.hint}>
              <Loader2 size={14} className={styles.spin} /> Buscando en productos, clientes, proveedores…
            </div>
          )}
          {showEmpty && (
            <div className={styles.empty}>
              <SearchX size={18} />
              <span>Sin resultados para “{trimmed}”</span>
            </div>
          )}
          {GROUP_META.map((group) => {
            const hits = groups[group.key] as SearchHit[];
            if (hits.length === 0) return null;
            const Icon = group.icon;
            return (
              <div key={group.key} className={styles.group}>
                <div className={styles.groupHeader}>
                  <Icon size={13} strokeWidth={2} />
                  <span>{group.label}</span>
                  <span className={styles.groupCount}>{hits.length}</span>
                </div>
                <ul className={styles.groupList}>
                  {hits.map((hit) => {
                    const flatIdx = flatHits.findIndex((f) => f.href === hit.href && f.id === hit.id);
                    return (
                      <li key={`${group.key}-${hit.id}`} role="option" id={`gs-option-${flatIdx}`} aria-selected={flatIdx === activeIndex}>
                        <button
                          type="button"
                          className={`${styles.hit} ${flatIdx === activeIndex ? styles.hitActive : ''}`}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                          onClick={() => goTo(hit.href)}
                        >
                          <span className={styles.hitName}>
                            <HighlightedName name={hit.name} query={trimmed} />
                          </span>
                          {hit.detail && <span className={styles.hitDetail}>{hit.detail}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {totalCount > 0 && (
            <div className={styles.footer}>
              {totalCount} resultado{totalCount === 1 ? '' : 's'} · ↑↓ navegar · Enter abrir · Esc cerrar
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
