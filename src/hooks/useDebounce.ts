'use client';

import { useState, useEffect } from 'react';

/** Retorna el valor con `delay` ms de retraso tras el último cambio (300ms por defecto). */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
