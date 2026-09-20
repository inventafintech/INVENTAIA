'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore';
import styles from './page.module.css';

interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

// Función pura para autogenerar y limpiar el slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos y diacríticos
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar espacios y caracteres especiales por guiones
    .replace(/^-+|-+$/g, '')         // Eliminar guiones al principio y al final
    .slice(0, 35);
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: nextAuthSession, status: nextAuthStatus, update: updateSession } = useSession();

  // 1. Manejo de Estado (React Hooks)
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  const [companyName, setCompanyName] = useState<string>('');
  const [workspaceSlug, setWorkspaceSlug] = useState<string>('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 2. Cargar sesión activa (Google OAuth vía NextAuth o sesión institucional)
  useEffect(() => {
    async function loadSession() {
      if (nextAuthSession?.user) {
        const u = nextAuthSession.user as any;
        if (u.hasWorkspace || u.workspace_id || u.workspace) {
          router.push('/dashboard');
          return;
        }
        setUser({
          id: u.id || 'usr-nextauth',
          name: u.name || 'Usuario',
          email: u.email || '',
          avatar_url: u.image || undefined,
          role: u.workspace?.role || undefined,
        });
        setLoadingSession(false);
        return;
      }

      if (nextAuthStatus === 'unauthenticated') {
        try {
          const res = await fetch('/api/session', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              if (data.workspace) {
                router.push('/dashboard');
                return;
              }
              setUser(data.user);
              setLoadingSession(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error al cargar sesión:', err);
        }
        router.push('/login');
        return;
      }
    }

    if (nextAuthStatus !== 'loading') {
      loadSession();
    }
  }, [nextAuthSession, nextAuthStatus, router]);

  // 3. Autogeneración y Validación del Slug
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyName(value);

    // Si el usuario no ha editado manualmente el slug, autogenerar dinámicamente
    if (!isSlugManuallyEdited) {
      setWorkspaceSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    setWorkspaceSlug(cleaned);
  };

  // 4. Activación Dinámica del Botón (Validación UI: mínimo 3 caracteres en ambos)
  const isFormValid = companyName.trim().length >= 3 && workspaceSlug.trim().length >= 3;

  // 5. Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      router.push('/login');
    }
  };

  // 6. Envío de Datos (Submit Handler)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName.trim(),
          slug: workspaceSlug.trim(),
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          userAvatar: user?.avatar_url,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success || res.status === 200 || res.status === 201)) {
        // 1. Paso Crítico: Actualizar la sesión en el cliente (NextAuth JWT) con el nuevo workspace_id
        if (updateSession) {
          await updateSession({
            workspace_id: data.workspace.id,
            workspace: data.workspace,
            hasWorkspace: true,
          });
        }

        // 2. Inyectar en el store global para reactividad inmediata
        useWorkspaceStore.getState().setWorkspace({
          name: data.workspace.name,
          slug: data.workspace.slug_url,
        });

        // 3. Invalidar la caché de servidor para que el middleware reconozca el nuevo workspace_id
        router.refresh();

        // 4. Redirigir al Setup Wizard completo
        router.push('/setup/wizard');
      } else {
        setSubmitError(data.error || 'No se pudo crear el espacio de trabajo.');
      }
    } catch (err: any) {
      setSubmitError(`Error de conexión: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
          <div className={styles.spinner} style={{ borderTopColor: '#0f172a' }} />
          <span>Verificando credenciales de INVENTA.AI...</span>
        </div>
      </div>
    );
  }

  const userName = user?.name || 'Usuario';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar_url;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Cabecera */}
        <header className={styles.header}>
          <h1 className={styles.title}>Termina de configurar INVENTA.AI</h1>
          <p className={styles.subtitle}>
            Bienvenido, {userName}. Cuéntanos sobre tu empresa para crear tu espacio de trabajo.
          </p>
        </header>

        {/* Tarjeta de Sesión */}
        <div className={styles.sessionCard}>
          <div className={styles.sessionLeft}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.sessionInfo}>
              <span className={styles.sessionLabel}>Sesión iniciada como</span>
              <span className={styles.sessionEmail} title={userEmail}>
                {userEmail}
              </span>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className={styles.btnLogout}>
            Cerrar sesión
          </button>
        </div>

        {/* Mensaje de error general si ocurre */}
        {submitError && <div className={styles.errorMessage}>{submitError}</div>}

        {/* Formulario Controlado de Onboarding */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="companyName" className={styles.label}>
              Nombre de la empresa
            </label>
            <input
              id="companyName"
              type="text"
              className={styles.input}
              placeholder="Acme Inc."
              value={companyName}
              onChange={handleCompanyNameChange}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="workspaceSlug" className={styles.label}>
              Dirección del espacio de trabajo
            </label>
            <div
              className={`${styles.slugInputContainer} ${
                workspaceSlug.trim().length >= 3 ? styles.success : ''
              }`}
            >
              <input
                id="workspaceSlug"
                type="text"
                className={styles.slugInput}
                placeholder="acme"
                value={workspaceSlug}
                onChange={handleSlugChange}
                required
              />
              <span className={styles.slugSuffix}>.inventa.ai</span>
            </div>
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              <>
                <div className={styles.spinner} />
                <span>Cargando...</span>
              </>
            ) : (
              'Crear espacio de trabajo'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
