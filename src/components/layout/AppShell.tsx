'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAppShell } from '@/hooks/useAppShell';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state } = useAppShell();

  return (
    <div className={styles.layout}>
      <Sidebar pendingOrdersCount={state.pendingOrdersCount} />
      <div className={styles.mainWrapper}>
        <TopBar
          pageTitle={state.pageTitle}
          hasActive={state.hasActiveIntegrations}
          statusText={state.statusText}
        />
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}
