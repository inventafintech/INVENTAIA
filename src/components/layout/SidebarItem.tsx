'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';

export interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  badgeCount?: number;
  alertCount?: number;
}

export function SidebarItem({
  href,
  label,
  icon,
  isActive,
  badgeCount,
  alertCount,
}: SidebarItemProps) {
  // Acepta badgeCount o alertCount
  const count = typeof badgeCount === 'number' ? badgeCount : alertCount;

  return (
    <Link
      href={href}
      className={`${styles.navItem} ${isActive ? styles.active : ''}`}
    >
      {icon}
      <span className={styles.navLabel}>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className={styles.badgeCount}>{count}</span>
      )}
    </Link>
  );
}
