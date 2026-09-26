'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAppShell } from '@/hooks/useAppShell';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationProvider } from '@/context/NotificationContext';

// Carga diferida (Lazy Loading) de NexoCommandPalette para no penalizar el FCP del Dashboard
const NexoCommandPalette = dynamic(() => import('@/components/nexo/NexoCommandPalette').then(mod => mod.NexoCommandPalette), {
  ssr: false, // Desactivar SSR previene hidrataciones pesadas en el servidor y optimiza framer-motion
});

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
      {/* Contenedor principal Flex de pantalla completa (100% fluido) con CSS nativo optimizado */}
      <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg)] text-[var(--ink)] relative selection:bg-amber-400 selection:text-slate-900">

        {/* Sidebar adaptativo y colapsable (w-64 expandido / w-16 colapsado con transición fluida) */}
        <Sidebar
          pendingOrdersCount={state.pendingOrdersCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Contenedor dinámico que se expande al colapsar el menú lateral */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
          <TopBar
            pageTitle={pageTitle}
            hasActive={state.hasActiveIntegrations}
            statusText={state.statusText}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          {/* Área principal fluida: flex-1 overflow-auto ocupando el 100% del espacio sobrante */}
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 overflow-y-auto overflow-x-hidden w-full p-4 sm:p-6 lg:p-8 pb-24"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>

      {/* Nexo: copiloto conversacional (Modal Híbrido / Command Palette) */}
      <NexoCommandPalette />
    </NotificationProvider>
  );
}

export default AppShell;
