'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SIDEBAR_CONFIG } from '@/config/sidebarConfig';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAppShell } from '@/hooks/useAppShell';
import { NotificationProvider } from '@/context/NotificationContext';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state } = useAppShell();
  const pathname = usePathname() || '';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Auto-cierre del menú móvil al navegar hacia cualquier ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const currentItem = React.useMemo(() => {
    for (const group of SIDEBAR_CONFIG) {
      for (const item of group.items) {
        if (pathname === item.href) return item;
        if (
          item.aliases &&
          item.aliases.some(
            (alias) => pathname === alias || (alias !== '/' && pathname.startsWith(`${alias}/`))
          )
        ) {
          return item;
        }
        if (item.href !== '/' && pathname.startsWith(`${item.href}/`)) {
          return item;
        }
      }
    }
    return null;
  }, [pathname]);

  const pageTitle = currentItem ? currentItem.label : (state.pageTitle || 'Cerebro de Compras');

  return (
    <NotificationProvider>
      <div className={styles.layout}>
        {/* Sidebar adaptativo (Off-canvas Drawer en móvil, Estático en Desktop) */}
        <Sidebar
          pendingOrdersCount={state.pendingOrdersCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <div className={styles.mainWrapper}>
          <TopBar
            pageTitle={pageTitle}
            hasActive={state.hasActiveIntegrations}
            statusText={state.statusText}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
