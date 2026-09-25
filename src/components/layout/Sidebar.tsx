'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
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

  // Estado de colapso en escritorio (modo icono de 72px) con persistencia en localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('inventa_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Fallback seguro para SSR
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('inventa_sidebar_collapsed', String(next));
      } catch {
        // Fallback seguro
      }
      return next;
    });
  };

  // Estado de los acordeones: se restaura desde localStorage para que la
  // navegación client-side (que remonta el shell en cada página) conserve los
  // grupos tal como los dejó el usuario; por defecto todo abierto.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    NAVIGATION_CONFIG.reduce((acc, group) => {
      acc[group.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('inventa_sidebar_groups');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        setOpenGroups((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Fallback seguro para SSR
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = {
        ...prev,
        [groupId]: !prev[groupId],
      };
      try {
        localStorage.setItem('inventa_sidebar_groups', JSON.stringify(next));
      } catch {
        // Fallback seguro
      }
      return next;
    });
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

  const getBadgeClass = (badgeType?: 'alert' | 'warning' | 'info' | 'purple'): string => {
    switch (badgeType) {
      case 'alert':
        return styles.badgeAlert;
      case 'warning':
        return styles.badgeWarning;
      case 'info':
        return styles.badgeInfo;
      case 'purple':
        return styles.badgePurple;
      default:
        return styles.badgeAlert;
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

      {/* Contenedor Principal / Drawer Deslizante / Barra Colapsable */}
      <aside
        className={`
          ${styles.sidebar}
          ${isMobileOpen ? styles.sidebarOpen : ''}
          ${isCollapsed ? `${styles.sidebarCollapsed} w-16` : 'w-64'}
          transition-all duration-300 ease-in-out
          ${className}
        `}
        aria-label="Navegación lateral de la plataforma"
        aria-modal={isMobileOpen ? 'true' : undefined}
        role={isMobileOpen ? 'dialog' : undefined}
      >
        {/* Encabezado Corporativo Enterprise */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLeft}>
            <span className={styles.brandFull}>
              <Logo height={26} />
            </span>
            <span className={styles.brandMark}>
              <Logo variant="mark" height={30} />
            </span>
            <div className={styles.brandInfo}>
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
                  >
                    {group.items.map((item: NavItemConfig) => {
                      const Icon = item.icon;
                      const active = isItemActive(item);
                      const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
                      // En modo colapsado el badge se oculta visualmente (display:none),
                      // así que el conteo se expone a lectores de pantalla vía aria-label.
                      const collapsedA11yLabel = isCollapsed
                        ? `${item.label}${badgeCount > 0 ? `, ${badgeCount} alertas pendientes` : ''}`
                        : undefined;

                      return (
                        <li key={item.id} className={styles.itemListItem}>
                          <Link
                            href={item.href}
                            title={
                              isCollapsed
                                ? `${item.label}${badgeCount > 0 ? ` (${badgeCount > 99 ? '99+' : badgeCount})` : ''}`
                                : item.label
                            }
                            aria-label={collapsedA11yLabel}
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
                              {/* Punto indicador de alerta cuando el sidebar está colapsado a modo icono */}
                              {badgeCount > 0 && (
                                <span className={styles.collapsedBadgeDot} aria-hidden="true" />
                              )}
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

        {/* Footer del Sidebar con Botón de Colapso B2B (Solo Desktop) */}
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            onClick={toggleCollapse}
            className={styles.collapseButton}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} strokeWidth={2} />
            ) : (
              <ChevronLeft size={18} strokeWidth={2} />
            )}
            <span className={styles.collapseLabel}>Colapsar menú</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
