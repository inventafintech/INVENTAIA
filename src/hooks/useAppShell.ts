'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShellState } from '@/types/appShell';

const defaultState: AppShellState = {
  companyName: 'Distribuidora San Martín',
  companyInitials: 'I.AI',
  pageTitle: 'Cerebro de Compras',
  hasActiveIntegrations: false,
  statusText: 'Pendiente de configuración',
  integrationBadgeStatus: 'pending',
  pendingOrdersCount: 2,
  providers: [],
  lastSyncTimestamp: null,
};

export function useAppShell() {
  const [state, setState] = useState<AppShellState>(defaultState);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/shell', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.state) {
          setState(json.state);
        }
      }
    } catch (err) {
      console.error('Failed to fetch App Shell state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  return {
    state,
    loading,
    refreshShell: fetchState,
  };
}
