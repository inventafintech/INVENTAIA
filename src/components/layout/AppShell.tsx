'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NexoChatInterface } from '@/components/nexo/NexoChatInterface';
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
    for (const group of NAVIGATION_CONFIG) {
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
      {/* Contenedor principal Flex de pantalla completa (100% fluido) */}
      <div className={`flex h-screen w-full overflow-hidden ${styles.layout}`}>
        {/* Sidebar adaptativo y colapsable (w-64 expandido / w-16 colapsado con transición fluida) */}
        <Sidebar
          pendingOrdersCount={state.pendingOrdersCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Contenedor dinámico que se expande al colapsar el menú lateral */}
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${styles.mainWrapper}`}>
          <TopBar
            pageTitle={pageTitle}
            hasActive={state.hasActiveIntegrations}
            statusText={state.statusText}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          {/* Área principal fluida: flex-1 overflow-auto ocupando el 100% del espacio sobrante */}
          <main className={`flex-1 overflow-auto w-full p-4 sm:p-6 lg:p-8 pb-24 ${styles.contentArea}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Nexo: copiloto conversacional flotante en la esquina inferior DERECHA (fixed bottom-6 right-6 z-50) */}
      <NexoChatInterface />
    </NotificationProvider>
  );
}

export default AppShell;
