'use client';

import styles from './TopBar.module.css';

interface TopBarProps {
  pageTitle?: string;
  hasActive?: boolean;
  statusText?: string;
}

export function TopBar({
  pageTitle = 'Cerebro de Compras',
  hasActive = false,
  statusText = 'Pendiente de configuración',
}: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.pageTitle}>{pageTitle}</div>
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
