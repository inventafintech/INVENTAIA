'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './page.module.css';

interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();

  // Estados de sesión
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  // Estados del formulario
  const [companyName, setCompanyName] = useState<string>('');
  const [workspaceSlug, setWorkspaceSlug] = useState<string>('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);

  // Estados de validación de slug
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');

  // Estados de envío
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Cargar sesión activa (NextAuth o sesión institucional)
  useEffect(() => {
    async function loadSession() {
      // Si NextAuth ya tiene sesión cargada
      if (nextAuthSession?.user) {
        const u = nextAuthSession.user as any;
        if (u.hasWorkspace) {
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

      // Si NextAuth terminó de cargar y no hay sesión, o como fallback
      if (nextAuthStatus === 'unauthenticated') {
        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
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

  // 2. Validación de slug en tiempo real contra el backend
  const validateSlugOnServer = useCallback(async (slugToTest: string) => {
    if (!slugToTest || slugToTest.length < 3) {
      setSlugStatus('invalid');
      setSlugMessage('El identificador debe tener al menos 3 caracteres.');
      return;
    }

    setSlugStatus('checking');
    try {
      const res = await fetch(`/api/workspaces/validate-slug?slug=${encodeURIComponent(slugToTest)}`);
      const data = await res.json();

      if (data.valid && data.available) {
        setSlugStatus('valid');
        setSlugMessage(`Espacio de trabajo disponible: ${data.slug}.inventa.ai`);
      } else {
        setSlugStatus('invalid');
        setSlugMessage(data.error || 'Identificador no disponible.');
      }
    } catch {
      setSlugStatus('invalid');
      setSlugMessage('Error al verificar disponibilidad.');
    }
  }, []);

  // 3. Manejar cambio en nombre de la empresa
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCompanyName(name);

    // Auto-generar slug si no se ha editado manualmente
    if (!isSlugManuallyEdited) {
      const autoSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);

      setWorkspaceSlug(autoSlug);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        validateSlugOnServer(autoSlug);
      }, 350);
    }
  };

  // 4. Manejar cambio manual en slug
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setWorkspaceSlug(raw);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      validateSlugOnServer(raw);
    }, 350);
  };

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

  // 6. Enviar creación de espacio de trabajo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!companyName.trim()) {
      setSubmitError('Por favor, ingresa el nombre de tu empresa.');
      return;
    }

    if (slugStatus !== 'valid') {
      setSubmitError('Por favor, ingresa una dirección de espacio de trabajo válida y disponible.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName.trim(),
          slug: workspaceSlug.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Redirigir al dashboard oficial
        router.push(data.redirectUrl || '/dashboard');
      } else {
        setSubmitError(data.error || 'No se pudo crear el espacio de trabajo.');
      }
    } catch (err: any) {
      setSubmitError(`Error de conexión: ${err.message}`);
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

        {/* Mensaje de error general */}
        {submitError && <div className={styles.errorMessage}>{submitError}</div>}

        {/* Formulario Multi-Tenant */}
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
                slugStatus === 'valid'
                  ? styles.success
                  : slugStatus === 'invalid'
                  ? styles.error
                  : ''
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

            {slugMessage && (
              <div
                className={`${styles.slugFeedback} ${
                  slugStatus === 'valid' ? styles.valid : styles.invalid
                }`}
              >
                {slugStatus === 'valid' ? '✓ ' : slugStatus === 'invalid' ? '✕ ' : ''}
                {slugMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={submitting || slugStatus !== 'valid'}
          >
            {submitting ? (
              <>
                <div className={styles.spinner} />
                <span>Creando espacio...</span>
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
