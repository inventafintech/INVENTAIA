'use client';

import React from 'react';
import { Menu, Bell, Moon, Sun } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { GlobalSearch } from './GlobalSearch';
import { useTheme } from '@/hooks/useTheme';
import styles from './TopBar.module.css';

interface TopBarProps {
  pageTitle?: string;
  hasActive?: boolean;
  statusText?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export function TopBar({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <header className={styles.topbar}>
      {/* Sección Izquierda: Menú Hamburguesa en móvil + Barra de Búsqueda Global */}
      <div className={styles.leftSection}>
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className={styles.menuButton}
            aria-label="Abrir menú de navegación"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={20} strokeWidth={2} />
          </button>
        )}

        <GlobalSearch />
      </div>

      {/* Sección Derecha: Notificaciones, Modo Oscuro, Idioma, y Dropdown de Perfil */}
      <div className={styles.rightSection}>
        {/* Botón de Notificaciones */}
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Ver notificaciones"
          title="Notificaciones"
        >
          <Bell size={18} strokeWidth={1.5} />
        </button>

        {/* Botón de Modo Oscuro / Claro */}
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.iconButton}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
          aria-pressed={isDark}
        >
          {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>

        {/* Selector de Idioma (Bandera España) */}
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Idioma: Español"
          title="Idioma: Español"
        >
          <div className={styles.flagCircle}>
            <svg width="22" height="22" viewBox="0 0 512 512">
              <mask id="flag-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
                <circle cx="256" cy="256" r="256" fill="#fff" />
              </mask>
              <g mask="url(#flag-mask)">
                <rect width="512" height="128" fill="#AA151B" />
                <rect y="128" width="512" height="256" fill="#F1BF00" />
                <rect y="384" width="512" height="128" fill="#AA151B" />
              </g>
            </svg>
          </div>
        </button>

        {/* Dropdown de Perfil de Usuario Dinámico */}
        <UserDropdown />
      </div>
    </header>
  );
}
