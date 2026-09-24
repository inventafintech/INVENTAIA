'use client';

import { useSearchParams } from 'next/navigation';

/** Lee el parámetro `?q=` de la URL para pre-filtrar listados (búsqueda global). */
export function useSearchQuery(): string {
  const params = useSearchParams();
  return params?.get('q') || '';
}
