'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/brand/Logo';
import styles from './page.module.css';

// Diccionario empresarial de traducción de errores OAuth y NextAuth
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'El acceso fue denegado. Por favor, autoriza los permisos de Google.',
  Configuration: 'Error de configuración en el servidor. Contacta a soporte.',
  Verification: 'El token de verificación ha expirado o ya fue utilizado.',
  OAuthSignin: 'Hubo un problema al conectar con Google. Inténtalo de nuevo.',
  OAuthCallback: 'Hubo un problema al iniciar sesión con Google. Inténtalo de nuevo.',
  OAuthCreateAccount: 'No se pudo crear la cuenta con este proveedor.',
  EmailCreateAccount: 'No se pudo crear la cuenta con el correo proporcionado.',
  Callback: 'Error durante la redirección de autenticación. Inténtalo de nuevo.',
  OAuthAccountNotLinked: 'Este correo ya está registrado con otro método de acceso.',
  Default: 'Hubo un problema al iniciar sesión con Google. Inténtalo de nuevo.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Intercepción y limpieza inmediata de URL (?error=)
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      setErrorMessage('Hubo un problema al conectar con Google. Inténtalo de nuevo.');

      // Limpieza estricta e inmediata de la barra de direcciones para evitar persistencia al recargar
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [searchParams]);

  // 2. Manejo de inicio de sesión real con Google OAuth 2.0 y prevención de múltiples clics
  const handleGoogleLogin = async () => {
    if (loading) return; // Prevención de doble clic
    try {
      setLoading(true);
      setErrorMessage(null);
      const targetUrl = searchParams?.get('callbackUrl') || '/dashboard';
      await signIn('google', { callbackUrl: targetUrl });
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setErrorMessage('Hubo un problema al conectar con Google. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Banner de alerta de error - Renderizado condicional idéntico al diseño */}
      {errorMessage && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          <div className={styles.errorContent}>
            <svg
              className={styles.errorIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className={styles.errorText}>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className={styles.errorClose}
            aria-label="Cerrar alerta"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.logo}>
            <Logo height={30} tone="light" />
          </span>
          <span className={styles.badge}>Enterprise B2B</span>
        </div>

        <h1 className={styles.title}>Iniciar sesión en INVENTA.AI</h1>
        <p className={styles.subtitle}>
          Accede al Cerebro de Compras para gestionar tu inventario, predicción y financiamiento.
        </p>

        {/* Botón oficial de Google OAuth 2.0 con protección de múltiples clics y spinner SVG */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={styles.btnGoogle}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <svg className={styles.spinnerSvg} viewBox="0 0 24 24" fill="none">
                <circle
                  className={styles.spinnerTrack}
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className={styles.spinnerHead}
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
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
      <Suspense fallback={<div className={styles.loadingFallback}>Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
