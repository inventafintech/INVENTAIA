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

/**
 * Algoritmo robusto para calcular iniciales:
 * - 1 palabra ("Admin") => "AD"
 * - 2 palabras ("José González") => "JG"
 * - 3 o más palabras ("María del Carmen") => "MC" (primera y última palabra)
 * - Fallback a las 2 primeras letras del email ("jmgonzalez..." => "JM")
 * - Fallback universal => "U"
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

export function UserProfileDropdown() {
  const { data: nextAuthSession, status: authStatus } = useSession();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado local sincronizado con la base de datos real (Supabase / cookies firmadas)
  const [dbUser, setDbUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    avatar_url?: string | null;
    role?: string;
  } | null>(null);

  // Sincronización con la sesión real de base de datos
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

    return () => {
      isMounted = false;
    };
  }, []);

  // Consolidación de datos reales de sesión (cero datos inventados o mocks)
  const userName =
    nextAuthSession?.user?.name ||
    dbUser?.name ||
    (authStatus === 'loading' ? 'Cargando...' : 'Usuario');

  const userEmail =
    nextAuthSession?.user?.email ||
    dbUser?.email ||
    '';

  const userAvatar =
    nextAuthSession?.user?.image ||
    dbUser?.avatar_url ||
    null;

  const initials = getInitials(
    nextAuthSession?.user?.name || dbUser?.name,
    nextAuthSession?.user?.email || dbUser?.email
  );

  // Click-away listener y atajo con tecla Escape para cerrar el menú
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
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
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Cierre de sesión real: destruye cookie en backend y token JWT en NextAuth
  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      // 1. Destruir sesión en el backend (cookies HTTP-only)
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error al destruir sesión backend:', err);
    }

    try {
      // 2. Destruir sesión NextAuth y redirigir inmediatamente a /login
      await signOut({ callbackUrl: '/login', redirect: true });
    } catch (err) {
      console.error('Error en signOut de NextAuth:', err);
      window.location.href = '/login';
    }
  }, [isSigningOut]);

  return (
    <div className={`${styles.container} relative inline-block`} ref={containerRef}>
      {/* 1. Botón Disparador (Trigger) */}
      <button
        type="button"
        className={`${styles.trigger} flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Menú de perfil de usuario"
      >
        <div className={`${styles.triggerAvatar} w-7 h-7 rounded-md bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0`}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className={`${styles.avatarImage} w-full h-full object-cover rounded-md`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <span className={`${styles.triggerName} text-xs font-semibold text-slate-900 truncate max-w-[140px]`}>
          {userName}
        </span>

        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`${styles.triggerChevron} text-slate-500 transition-transform duration-200 ${
            isOpen ? `${styles.chevronOpen} rotate-180 text-slate-900` : ''
          }`}
        />
      </button>

      {/* 2. Menú Desplegable (Flyout) */}
      {isOpen && (
        <div
          className={`${styles.dropdown} absolute top-[calc(100%+8px)] right-0 w-[250px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150`}
          role="menu"
          aria-label="Opciones de usuario"
        >
          {/* Cabecera de Identidad */}
          <div className={`${styles.identityBlock} flex items-center gap-3 p-3.5 bg-white`}>
            <div className={`${styles.identityAvatar} w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center flex-shrink-0`}>
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className={`${styles.avatarImage} w-full h-full object-cover rounded-lg`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={`${styles.identityDetails} flex flex-col min-w-0 flex-1`}>
              <span className={`${styles.identityName} text-sm font-bold text-slate-900 truncate leading-tight`}>
                {userName}
              </span>
              {userEmail && (
                <span className={`${styles.identityEmail} text-xs text-slate-500 truncate leading-tight mt-0.5`} title={userEmail}>
                  {userEmail}
                </span>
              )}
            </div>
          </div>

          {/* Enlaces de Navegación */}
          <ul className={`${styles.menuList} list-none p-1.5 m-0 flex flex-col gap-0.5`} role="none">
            <li role="none">
              <Link
                href="/configuracion/general"
                className={`${styles.menuItem} flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <User size={16} strokeWidth={1.5} className={`${styles.itemIcon} text-slate-500`} />
                <span>Mi perfil</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/configuracion/general"
                className={`${styles.menuItem} flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Shield size={16} strokeWidth={1.5} className={`${styles.itemIcon} text-slate-500`} />
                <span>Seguridad</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/configuracion/general"
                className={`${styles.menuItem} flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <IdCard size={16} strokeWidth={1.5} className={`${styles.itemIcon} text-slate-500`} />
                <span>Mis roles</span>
              </Link>
            </li>
            <li role="none">
              <Link
                href="/configuracion/general"
                className={`${styles.menuItem} flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} strokeWidth={1.5} className={`${styles.itemIcon} text-slate-500`} />
                <span>Configuración</span>
              </Link>
            </li>
          </ul>

          {/* Separador Visual */}
          <div className={`${styles.divider} h-px bg-slate-100 my-1 mx-2`} />

          {/* Acción Destructiva: Cerrar Sesión */}
          <button
            type="button"
            className={`${styles.logoutButton} w-[calc(100%-16px)] mx-2 mb-2 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
            role="menuitem"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            <LogOut size={16} strokeWidth={1.5} className={`${styles.logoutIcon} text-red-600`} />
            <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfileDropdown;
