'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SIDEBAR_CONFIG, SidebarGroupConfig, SidebarItemConfig } from '@/config/sidebarConfig';
import { useSafeNotificationStore } from '@/context/NotificationContext';

import styles from './Sidebar.module.css';

export interface SidebarProps {
  className?: string;
  pendingOrdersCount?: number;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname() || '';
  const { counts } = useSafeNotificationStore();

  // Estado del acordeón: todas las secciones abiertas por defecto
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

  const isItemActive = (item: SidebarItemConfig): boolean => {
    if (pathname === item.href) return true;
    if (
      item.aliases &&
      item.aliases.some(
        (alias) => pathname === alias || (alias !== '/' && pathname.startsWith(alias))
      )
    ) {
      return true;
    }
    if (item.href !== '/' && pathname.startsWith(item.href)) return true;
    return false;
  };

  return (
    <aside
      className={`${styles.sidebar} ${className}`}
      aria-label="Navegación lateral de la plataforma"
    >
      <nav className={styles.navContainer} aria-label="Menú principal">
        {SIDEBAR_CONFIG.map((group: SidebarGroupConfig) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className={styles.navGroup}>
              {/* Encabezado del Grupo (Acordeón sin bordes) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                aria-controls={`group-${group.id}`}
                className={styles.groupHeader}
              >
                <span className={styles.groupTitle}>{group.title}</span>
                {isOpen ? (
                  <ChevronUp
                    size={14}
                    strokeWidth={1.5}
                    className={styles.chevron}
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={styles.chevron}
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Lista de Enlaces */}
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
                    const isAlert = item.badgeKey === 'reabastecimiento';

                    return (
                      <li key={item.id} className={styles.itemListItem}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`${styles.navItem} ${active ? styles.active : ''}`}
                        >
                          <span className={styles.itemIcon} aria-hidden="true">
                            <Icon size={18} strokeWidth={1.5} />
                          </span>
                          <span className={styles.navLabel}>{item.label}</span>

                          {/* Badge de Notificación Dinámica */}
                          {badgeCount > 0 && (
                            <span
                              className={`${styles.badge} ${
                                isAlert ? styles.badgeAlert : styles.badgeInfo
                              }`}
                              aria-label={`${badgeCount} pendientes`}
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
  );
}

export default Sidebar;
