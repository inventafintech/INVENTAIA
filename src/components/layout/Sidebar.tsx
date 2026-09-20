'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAVIGATION_CONFIG, NavGroupConfig, NavItemConfig } from '@/config/navigationConfig';
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

  // Estado colapsable para desktop con persistencia en localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('inventa:sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Manejo seguro en caso de restricciones de almacenamiento del navegador
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem('inventa:sidebar-collapsed', String(nextState));
      } catch {}
      return nextState;
    });
  };

  // Estado de los acordeones: todos abiertos por defecto
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    NAVIGATION_CONFIG.reduce((acc, group) => {
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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, handleKeyDown]);

  const isItemActive = (item: NavItemConfig): boolean => {
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

  const getBadgeClass = (badgeType?: string): string => {
    switch (badgeType) {
      case 'alert':
        return styles.badgeAlert;
      case 'warning':
        return styles.badgeWarning;
      case 'purple':
        return styles.badgePurple;
      case 'info':
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
        className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''} ${
          isCollapsed ? styles.sidebarCollapsed : ''
        } ${className}`}
        aria-label="Navegación lateral de la plataforma"
        aria-modal={isMobileOpen ? 'true' : undefined}
        role={isMobileOpen ? 'dialog' : undefined}
      >
        {/* Encabezado Corporativo Enterprise con botón de cierre móvil */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLeft}>
            <div className={styles.logoIcon} aria-hidden="true" title="INVENTA.AI">
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
          {NAVIGATION_CONFIG.map((group: NavGroupConfig) => {
            const isOpen = openGroups[group.id] ?? true;

            return (
              <div key={group.id} className={styles.navGroup}>
                {/* Encabezado de Categoría */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`group-${group.id}`}
                  className={styles.groupHeader}
                  title={group.title}
                >
                  <span className={styles.groupTitle}>{group.title}</span>
                  <ChevronDown
                    size={14}
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
                    {group.items.map((item: NavItemConfig) => {
                      const Icon = item.icon;
                      const active = isItemActive(item);
                      const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

                      return (
                        <li key={item.id} className={styles.itemListItem}>
                          <Link
                            href={item.href}
                            title={item.label}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => {
                              if (onCloseMobile) {
                                onCloseMobile();
                              }
                            }}
                            className={`${styles.navItem} ${active ? styles.active : ''}`}
                          >
                            <span className={styles.itemIcon} aria-hidden="true">
                              <Icon size={18} strokeWidth={1.5} />
                              {badgeCount > 0 && <span className={styles.collapsedBadgeDot} />}
                            </span>

                            <span className={styles.navLabel}>{item.label}</span>

                            {/* Badge de Conteo Dinámico Real */}
                            {badgeCount > 0 && (
                              <span
                                className={`${styles.badge} ${getBadgeClass(item.badgeType)}`}
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

        {/* Footer con Botón Ergonómico para Colapsar/Expandir la Barra Lateral */}
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            onClick={toggleCollapse}
            className={styles.collapseButton}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose size={18} strokeWidth={1.5} />
                <span className={styles.collapseLabel}>Colapsar menú</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
