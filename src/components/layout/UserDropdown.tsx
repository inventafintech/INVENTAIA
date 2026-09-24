'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  User,
  Shield,
  IdCard,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import styles from './UserDropdown.module.css';
import { subscribeProfileUpdates } from '@/lib/profileEvents';

/**
 * Función robusta para calcular iniciales:
 * - Para 1 palabra ("Admin") => "AD"
 * - Para 2 palabras ("José González") => "JG"
 * - Para 3 o más palabras ("María del Carmen") => "MC" (primera y última palabra)
 * - Fallback a prefijo de email o "U"
 */
export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const clean = name.trim().replace(/\s+/g, ' ');
    const parts = clean.split(' ');
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const firstChar = parts[0][0];
    const lastChar = parts[parts.length - 1][0];
    return (firstChar + lastChar).toUpperCase();
  }

  if (email && email.trim()) {
    const userPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (userPart.length >= 2) {
      return userPart.slice(0, 2).toUpperCase();
    }
    if (userPart.length === 1) {
      return userPart.toUpperCase();
    }
  }

  return 'U';
}

export function UserDropdown() {
  const { data: nextAuthSession, status: authStatus } = useSession();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado local para enriquecer con la sesión real de base de datos / cookies
  const [dbUser, setDbUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    avatar_url?: string | null;
    role?: string;
  } | null>(null);

  // Carga reactiva de datos reales de sesión de base de datos si NextAuth aún no los tiene
  useEffect(() => {
    let isMounted = true;

    async function loadRealSession() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.user && isMounted) {
            setDbUser(data.user);
          }
        }
      } catch (err) {
        console.error('Error al sincronizar datos reales de usuario:', err);
      }
    }

    loadRealSession();

    // Refrescar en caliente cuando el perfil se actualiza (sin recargar)
    const unsubscribe = subscribeProfileUpdates(() => {
      loadRealSession();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Consolidación de datos reales de sesión (sin datos inventados ni mocks)
  const userName =
    nextAuthSession?.user?.name ||
    dbUser?.name ||
    (authStatus === 'loading' ? 'Cargando...' : 'Usuario');

  const userEmail =
    nextAuthSession?.user?.email ||
    dbUser?.email ||
    '';

  // La BD manda: el JWT de NextAuth nunca transporta data URLs (límite de cookies/494)
  const userAvatar =
    dbUser?.avatar_url ||
    nextAuthSession?.user?.image ||
    null;

  const initials = getInitials(
    nextAuthSession?.user?.name || dbUser?.name,
    nextAuthSession?.user?.email || dbUser?.email
  );

  // Click-away listener y atajo tecla Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Manejador real de cierre de sesión
  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      // 1. Destruir sesión en el backend (cookies seguras HTTP-only)
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error al destruir sesión backend:', err);
    }

    try {
      // 2. Destruir sesión NextAuth y redirigir al landing principal
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (err) {
      console.error('Error en signOut de NextAuth:', err);
      window.location.href = '/';
    }
  }, [isSigningOut]);

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Botón Disparador del Header */}
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Menú de perfil de usuario"
      >
        <div className={styles.triggerAvatar}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className={styles.avatarImage}
              onError={(e) => {
                // Si la imagen falla al cargar, mostrar iniciales
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <span className={styles.triggerName}>{userName}</span>

        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`${styles.triggerChevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-label="Opciones de usuario"
        >
          {/* Bloque de Identidad */}
          <div className={styles.identityBlock}>
            <div className={styles.identityAvatar}>
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className={styles.avatarImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.identityDetails}>
              <span className={styles.identityName}>{userName}</span>
              {userEmail && (
                <span className={styles.identityEmail} title={userEmail}>
                  {userEmail}
                </span>
              )}
            </div>
          </div>

          {/* Enlaces de Navegación */}
          <ul className={styles.menuList} role="none">
            <li role="none">
              <Link
                href="/users/user-profile"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <User size={16} strokeWidth={1.5} className={styles.itemIcon} />
                <span>Mi perfil</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/users/user-profile?tab=security"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Shield size={16} strokeWidth={1.5} className={styles.itemIcon} />
                <span>Seguridad</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/users/user-profile?tab=roles"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <IdCard size={16} strokeWidth={1.5} className={styles.itemIcon} />
                <span>Mis roles</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/settings/general-settings"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} strokeWidth={1.5} className={styles.itemIcon} />
                <span>Configuración</span>
              </Link>
            </li>
          </ul>

          {/* Separador Visual */}
          <div className={styles.divider} />

          {/* Acción Destructiva: Cerrar Sesión */}
          <button
            type="button"
            className={styles.logoutButton}
            role="menuitem"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            <LogOut size={16} strokeWidth={1.5} className={styles.logoutIcon} />
            <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
