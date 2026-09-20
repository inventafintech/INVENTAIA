'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationSummary } from '@/services/NotificationService';

export interface NotificationStoreState {
  counts: NotificationSummary;
  loading: boolean;
  lastUpdated: string | null;
  refreshNotifications: () => Promise<void>;
}

const defaultCounts: NotificationSummary = {
  reabastecimiento: 0,
  ordenes: 0,
  inventario: 0,
  integraciones: 0,
  riesgoQuiebre: 0,
  proveedoresCriticos: 0,
  inventarioInmovilizado: 0,
};

const NotificationContext = createContext<NotificationStoreState>({
  counts: defaultCounts,
  loading: true,
  lastUpdated: null,
  refreshNotifications: async () => {},
});

export const NOTIFICATION_REFRESH_EVENT = 'inventa:notifications-refresh';

/**
 * Función utilitaria global para disparar la actualización instantánea
 * de contadores desde cualquier componente o acción (ej. tras aprobar una orden).
 */
export function triggerNotificationRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT));
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<NotificationSummary>(defaultCounts);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/summary', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.counts) {
          setCounts(data.counts);
          setLastUpdated(data.timestamp || new Date().toISOString());
        }
      }
    } catch (err) {
      console.error('Error al sincronizar resumen de notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Carga inicial
    fetchSummary();

    // 2. Escuchar evento de actualización reactiva inmediata
    const handleRefresh = () => {
      fetchSummary();
    };

    window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh);

    // 3. Estrategia de Polling: cada 10 segundos
    const pollInterval = setInterval(() => {
      fetchSummary();
    }, 10000);

    // 4. Refetch al recuperar el foco de la ventana
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchSummary();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchSummary]);

  return (
    <NotificationContext.Provider
      value={{
        counts,
        loading,
        lastUpdated,
        refreshNotifications: fetchSummary,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export { NotificationContext };

/**
 * Hook seguro que nunca lanza excepción si se renderiza fuera de NotificationProvider.
 */
export function useSafeNotificationStore(): NotificationStoreState {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      counts: defaultCounts,
      loading: false,
      lastUpdated: null,
      refreshNotifications: async () => {},
    };
  }
  return context;
}

/**
 * Hook global NotificationStore para acceder a los conteos de alertas reactivos
 */
export function useNotificationStore(): NotificationStoreState {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationStore debe ser usado dentro de un NotificationProvider');
  }
  return context;
}

// Alias de conveniencia
export const useNotifications = useNotificationStore;
