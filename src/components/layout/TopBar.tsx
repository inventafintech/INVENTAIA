'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  pageTitle?: string;
  hasActive?: boolean;
  statusText?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export function TopBar({
  pageTitle = 'Cerebro de Compras',
  hasActive = false,
  statusText = 'Pendiente de configuración',
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        {/* Botón Hamburguesa para Móvil/Tablet (< 1024px) */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className={styles.menuButton}
            aria-label="Abrir menú de navegación"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        )}
        <div className={styles.pageTitle}>{pageTitle}</div>
      </div>

      <div className={styles.userMenu}>
        {hasActive ? (
          <span className={styles.statusActive}>
            <span className={styles.statusDotActive}></span>
            {statusText}
          </span>
        ) : (
          <span className={styles.statusPending}>
            <span className={styles.statusDotPending}></span>
            Pendiente de configuración
          </span>
        )}
      </div>
    </header>
  );
}
