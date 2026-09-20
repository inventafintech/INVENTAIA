'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { SIDEBAR_CONFIG, SidebarGroupConfig, SidebarItemConfig } from '@/config/sidebarConfig';
import { useSafeNotificationStore } from '@/context/NotificationContext';

import styles from './Sidebar.module.css';

export interface SidebarProps {
  className?: string;
  pendingOrdersCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  className = '',
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname() || '';
  const { counts } = useSafeNotificationStore();

  // Estado de los acordeones: todas las categorías abiertas por defecto
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    SIDEBAR_CONFIG.reduce((acc, group) => {
      acc[group.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Cierre accesible del menú con la tecla 'Escape' en dispositivos móviles
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    },
    [isMobileOpen, onCloseMobile]
  );

  useEffect(() => {
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Evitar scroll del body de fondo mientras el drawer esté abierto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, handleKeyDown]);

  const isItemActive = (item: SidebarItemConfig): boolean => {
    if (pathname === item.href) return true;

    // Coincidencia con rutas alias (compatibilidad con rutas ejecutivas)
    if (
      item.aliases &&
      item.aliases.some((alias) => {
        if (pathname === alias) return true;
        if (alias !== '/' && pathname.startsWith(`${alias}/`)) return true;
        return false;
      })
    ) {
      return true;
    }

    // Coincidencia jerárquica para subrutas
    if (item.href !== '/' && pathname.startsWith(`${item.href}/`)) {
      return true;
    }

    return false;
  };

  const getBadgeClass = (badgeKey?: string): string => {
    switch (badgeKey) {
      case 'reabastecimiento':
        return styles.badgeAlert;
      case 'inventario':
        return styles.badgeWarning;
      case 'ordenes':
        return styles.badgeInfo;
      case 'integraciones':
        return styles.badgePurple;
      default:
        return styles.badgeInfo;
    }
  };

  return (
    <>
      {/* Overlay oscuro con desenfoque para Mobile/Tablet */}
      <div
        className={`${styles.overlay} ${isMobileOpen ? styles.overlayVisible : ''}`}
        onClick={onCloseMobile}
        aria-hidden={!isMobileOpen}
      />

      {/* Contenedor Principal / Drawer Deslizante */}
      <aside
        className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''} ${className}`}
        aria-label="Navegación lateral de la plataforma"
        aria-modal={isMobileOpen ? 'true' : undefined}
        role={isMobileOpen ? 'dialog' : undefined}
      >
        {/* Encabezado Corporativo Enterprise con botón de cierre móvil */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLeft}>
            <div className={styles.logoIcon} aria-hidden="true">
              <span>I</span>
            </div>
            <div className={styles.brandInfo}>
              <span className={styles.brandName}>INVENTA.AI</span>
              <span className={styles.brandSub}>Cerebro de Compras</span>
            </div>
          </div>

          {/* Botón de cierre en versión móvil */}
          <button
            type="button"
            onClick={onCloseMobile}
            className={styles.closeButton}
            aria-label="Cerrar menú de navegación"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Contenedor de Navegación con Acordeones */}
        <nav className={styles.navContainer} aria-label="Menú principal">
          {SIDEBAR_CONFIG.map((group: SidebarGroupConfig) => {
            const isOpen = openGroups[group.id] ?? true;

            return (
              <div key={group.id} className={styles.navGroup}>
                {/* Encabezado de Categoría (Acordeón sin cajas) */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`group-${group.id}`}
                  className={styles.groupHeader}
                >
                  <span className={styles.groupTitle}>{group.title}</span>
                  <ChevronDown
                    size={15}
                    strokeWidth={2}
                    className={`${styles.chevron} ${isOpen ? styles.chevronExpanded : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {/* Lista Desplegable de Enlaces */}
                {isOpen && (
                  <ul
                    id={`group-${group.id}`}
                    className={styles.itemList}
                    role="list"
                  >
                    {group.items.map((item: SidebarItemConfig) => {
                      const Icon = item.icon;
                      const active = isItemActive(item);
                      const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

                      return (
                        <li key={item.id} className={styles.itemListItem}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => {
                              // Cerrar automáticamente el drawer móvil al seleccionar una opción
                              if (onCloseMobile) {
                                onCloseMobile();
                              }
                            }}
                            className={`${styles.navItem} ${active ? styles.active : ''}`}
                          >
                            <span className={styles.itemIcon} aria-hidden="true">
                              <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                            </span>
                            <span className={styles.navLabel}>{item.label}</span>

                            {/* Badge de Conteo Dinámico Real */}
                            {badgeCount > 0 && (
                              <span
                                className={`${styles.badge} ${getBadgeClass(item.badgeKey)}`}
                                aria-label={`${badgeCount} alertas pendientes`}
                              >
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
