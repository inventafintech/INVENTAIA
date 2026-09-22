'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'inventa_theme';

/** Fuente de verdad post-paint: lo que dejó el script anti-FOUC en <html>. */
function getThemeFromDOM(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): void {
  const el = document.documentElement;
  el.setAttribute('data-theme', theme);
  // Clase `dark` para compatibilidad con variante Tailwind `dark:` y libs de terceros
  el.classList.toggle('dark', theme === 'dark');
  // Scrollbars y controles nativos en el tema correcto
  el.style.colorScheme = theme;
}

function persistTheme(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage bloqueado (privado/SSR): el DOM ya quedó aplicado
  }
}

export function useTheme() {
  // 'light' coincide con el SSR → cero hydration mismatch
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState<boolean>(false);

  // Sincroniza con el script anti-FOUC solo en cliente
  useEffect(() => {
    setThemeState(getThemeFromDOM());
    setMounted(true);
  }, []);

  // Sync multi-pestaña
  useEffect(() => {
    if (!mounted) return;
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === 'light' || e.newValue === 'dark') {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mounted]);

  const setTheme = useCallback((next: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => {
    setThemeState((prev) => {
      const value: ThemeMode =
        typeof next === 'function' ? (next as (p: ThemeMode) => ThemeMode)(prev) : next;
      applyTheme(value);
      persistTheme(value);
      return value;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  return { theme, setTheme, toggleTheme, mounted } as const;
}
