'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeProfileUpdates } from '@/lib/profileEvents';

export interface CurrentUser {
  id?: string;
  name?: string;
  email?: string;
  avatar_url?: string | null;
  role?: string;
  phone?: string | null;
  position?: string | null;
  language?: string | null;
  timezone?: string | null;
  provider?: 'google' | 'credentials';
}

/**
 * Fuente reactiva de datos del usuario autenticado.
 * Lee /api/session y se refresca automáticamente cuando el perfil
 * se actualiza en cualquier parte de la app (evento global).
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.authenticated && data?.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Error al refrescar usuario actual:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return subscribeProfileUpdates(() => {
      refresh();
    });
  }, [refresh]);

  return { user, loading, refresh };
}
