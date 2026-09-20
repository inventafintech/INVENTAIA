'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from './page.module.css';

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [devLoading, setDevLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Captura de errores desde la URL (ej. ?error=OAuthCallback o el usuario cierra la ventana)
  useEffect(() => {
    const error = searchParams ? searchParams.get('error') : null;
    if (error) {
      setErrorMessage('Hubo un problema al iniciar sesión con Google. Inténtalo de nuevo.');
    }
  }, [searchParams]);

  // Manejo de inicio de sesión real con Google OAuth 2.0
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await signIn('google', { callbackUrl: '/onboarding' });
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setErrorMessage('Hubo un problema al iniciar sesión con Google. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  // Inicio de sesión de desarrollo local (Credentials Provider)
  const handleDevLogin = async () => {
    try {
      setDevLoading(true);
      setErrorMessage(null);
      await signIn('credentials', {
        email: 'jmgonzalez.contact@gmail.com',
        name: 'José González',
        callbackUrl: '/onboarding',
      });
    } catch (err) {
      console.error('Error en login de desarrollo:', err);
      setErrorMessage('Hubo un problema al iniciar sesión de prueba.');
      setDevLoading(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <>
      {/* Toast flotante para errores de autenticación */}
      {errorMessage && (
        <div className={styles.toast} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className={styles.toastClose}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.logo}>
            INVENTA<span className={styles.logoAccent}>.AI</span>
          </span>
          <span className={styles.badge}>Enterprise B2B</span>
        </div>

        <h1 className={styles.title}>Iniciar sesión en INVENTA.AI</h1>
        <p className={styles.subtitle}>
          Accede al Cerebro de Compras para gestionar tu inventario, predicción y financiamiento.
        </p>

        {/* Botón interactivo oficial de Google OAuth 2.0 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || devLoading}
          className={styles.btnGoogle}
        >
          {loading ? (
            <>
              <div className={styles.spinner} />
              <span>Conectando con Google...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className={styles.googleIcon}>
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Sección de desarrollo local (exclusivo para NODE_ENV === 'development') */}
        {isDevelopment && (
          <div className={styles.noticeBox}>
            <div className={styles.noticeTitle}>Modo de Desarrollo Local (Credentials)</div>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Entorno local detectado. Puedes iniciar sesión de prueba con CredentialsProvider:
            </p>
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={loading || devLoading}
              className={styles.btnDemo}
            >
              {devLoading ? 'Autenticando...' : 'Acceder como José González (Local)'}
            </button>
          </div>
        )}

        <div className={styles.footerText}>
          Al continuar, aceptas nuestros{' '}
          <Link href="#" className={styles.footerLink}>
            Términos de Servicio
          </Link>{' '}
          y{' '}
          <Link href="#" className={styles.footerLink}>
            Política de Privacidad
          </Link>
          .
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div>Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
