'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarItem } from './SidebarItem';
import { useNotificationStore } from '@/context/NotificationContext';
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  pendingOrdersCount?: number;
}

export function Sidebar({ pendingOrdersCount }: SidebarProps) {
  const pathname = usePathname() || '';
  const { counts } = useNotificationStore();
  const { workspaceName, setWorkspaceName } = useWorkspaceStore();

  // Sincronizar el nombre inicial desde el backend (ajustes o sesión activa)
  useEffect(() => {
    async function initWorkspaceName() {
      try {
        const res = await fetch('/api/dashboard/ajustes', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const name = data.settings?.razonSocial || data.settings?.companyName;
          if (name) {
            setWorkspaceName(name);
            return;
          }
        }

        const sessionRes = await fetch('/api/session', { cache: 'no-store' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.workspace?.name) {
            setWorkspaceName(sessionData.workspace.name);
          }
        }
      } catch (err) {
        console.error('Error sincronizando nombre de workspace:', err);
      }
    }
    initWorkspaceName();
  }, [setWorkspaceName]);

  // El contador de órdenes prioriza el valor dinámico del store
  const orderCount = typeof counts.ordenes === 'number' ? counts.ordenes : (pendingOrdersCount ?? 0);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Encabezado de Marca */}
      <div className={styles.brand}>
        <div className={styles.logo}>I.AI</div>
        <span className={styles.company} title={workspaceName || 'Mi Empresa'}>
          {workspaceName || 'Mi Empresa'}
        </span>
      </div>

      {/* Navegación Principal */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>PRINCIPAL</div>

        <SidebarItem
          href="/dashboard"
          label="Resumen Ejecutivo"
          isActive={isActive('/dashboard')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard?tab=predictiva"
          label="IA Predictiva"
          isActive={pathname === '/dashboard/predictiva' || pathname.includes('tab=predictiva')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard/reabastecimiento"
          label="Reabastecimiento"
          isActive={isActive('/dashboard/reabastecimiento')}
          badgeCount={counts.reabastecimiento}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard/ordenes"
          label="Órdenes"
          isActive={isActive('/dashboard/ordenes')}
          badgeCount={orderCount}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard/financiamiento"
          label="Financiamiento"
          isActive={isActive('/dashboard/financiamiento')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          }
        />

        {/* Sección OPERACIÓN */}
        <div className={styles.navSection} style={{ marginTop: '24px' }}>
          OPERACIÓN
        </div>

        <SidebarItem
          href="/dashboard/inventario"
          label="Inventario"
          isActive={isActive('/dashboard/inventario')}
          badgeCount={counts.inventario}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard/analytics"
          label="Analytics"
          isActive={isActive('/dashboard/analytics')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          }
        />

        <SidebarItem
          href="/dashboard/integraciones"
          label="Integraciones"
          isActive={isActive('/dashboard/integraciones')}
          badgeCount={counts.integraciones}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          }
        />
      </nav>

      {/* Footer del Sidebar */}
      <div className={styles.bottomNav}>
        <SidebarItem
          href="/dashboard/ajustes"
          label="Ajustes"
          isActive={isActive('/dashboard/ajustes')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          }
        />
        <SidebarItem
          href="/"
          label="Volver al Inicio"
          isActive={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          }
        />
      </div>
    </aside>
  );
}
