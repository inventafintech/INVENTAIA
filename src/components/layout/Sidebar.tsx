'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SIDEBAR_CONFIG, SidebarGroupConfig, SidebarItemConfig } from '@/config/sidebarConfig';

import styles from './Sidebar.module.css';

interface SidebarProps {
  className?: string;
  pendingOrdersCount?: number;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname() || '';

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
      aria-label="Navegación lateral"
    >
      <nav className={styles.navContainer}>
        {SIDEBAR_CONFIG.map((group: SidebarGroupConfig) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className={styles.navGroup}>
              {/* Encabezado del Grupo (Acordeón) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className={styles.groupHeader}
              >
                <span className={styles.groupTitle}>
                  {group.title}
                </span>
                {isOpen ? (
                  <ChevronUp
                    size={15}
                    strokeWidth={1.8}
                    className={styles.chevron}
                  />
                ) : (
                  <ChevronDown
                    size={15}
                    strokeWidth={1.8}
                    className={styles.chevron}
                  />
                )}
              </button>

              {/* Lista de Enlaces */}
              {isOpen && (
                <ul className={styles.itemList}>
                  {group.items.map((item: SidebarItemConfig) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);

                    return (
                      <li key={item.id} className={styles.itemListItem}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`${styles.navItem} ${active ? styles.active : ''}`}
                        >
                          <span className={styles.itemIcon}>
                            <Icon
                              size={18}
                              strokeWidth={1.6}
                            />
                          </span>
                          <span className={styles.navLabel}>{item.label}</span>
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
