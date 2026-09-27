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

/** Niveles de llenado por estante del motivo SVG (0-1), de abajo hacia arriba. */
const SHELVES: { fill: number[]; opacity: number }[] = [
  { fill: [0.68, 0.37, 0.84, 0.21], opacity: 0.35 },
  { fill: [0.53, 0.89, 0.32, 0.74], opacity: 0.53 },
  { fill: [0.47, 0.79, 0.26, 0.63], opacity: 0.71 },
];

/** Barras del lector de conteo: [ancho relativo, opacidad]. */
const READOUT: { width: number; opacity: number }[] = [
  { width: 64, opacity: 0.75 },
  { width: 44, opacity: 0.57 },
  { width: 78, opacity: 0.39 },
];

const CAPABILITIES = [
  'Inventario',
  'Pronóstico',
  'Reabastecimiento',
  'Financiamiento',
  'Analítica',
];

const TAGLINE = 'Inventario, pronóstico, reabastecimiento y finanzas';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Motivo del panel de marca: una rack de bins con distintos niveles, una
 * unidad viajando entre dos almacenes y el lector de conteo. Es la escena que
 * resume el producto — stock, transferencias y qué se está por quedarse sin
 * reponer — y sus tres animaciones cuentan esa misma historia.
 */
function WarehouseMotif() {
  let binIndex = 0;

  return (
    <div className={styles.motif} aria-hidden="true">
      <svg className={styles.motifSvg} viewBox="0 0 520 240" role="presentation" focusable="false">
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--brand-press)" />
            <stop offset="100%" stopColor="var(--brand-hover)" />
          </linearGradient>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--brand)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="siteGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ------------------------------------------------ la rack de stock */}
        <g transform="translate(24 30)">
          {SHELVES.map((shelf, s) => {
            const offset = s * 56;
            return (
              <g key={s}>
                <rect
                  x="0"
                  y={offset + 44}
                  width="212"
                  height="5"
                  rx="1"
                  fill="var(--surface-2)"
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                />
                {shelf.fill.map((ratio, i) => {
                  const binX = 4 + i * 52;
                  const binY = offset + 6;
                  const contentH = Math.round(38 * ratio);
                  const delay = 0.05 + binIndex * 0.07;
                  binIndex += 1;
                  return (
                    <g key={i}>
                      <rect
                        x={binX}
                        y={binY}
                        width="42"
                        height="38"
                        rx="2"
                        fill="none"
                        stroke="var(--line-strong)"
                        strokeWidth="1.2"
                      />
                      <rect
                        className={styles.bin}
                        style={{ animationDelay: `${delay.toFixed(2)}s` }}
                        x={binX + 2}
                        y={binY + 38 - contentH}
                        width="38"
                        height={contentH}
                        rx="1"
                        fill="url(#fillGrad)"
                        opacity={shelf.opacity}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          <line x1="0" y1="0" x2="0" y2="161" stroke="var(--line-strong)" strokeWidth="2" />
          <line x1="212" y1="0" x2="212" y2="161" stroke="var(--line-strong)" strokeWidth="2" />
        </g>

        {/* ------------------------------------------- transferencia entre sedes */}
        <g transform="translate(280 74)">
          <circle cx="16" cy="34" r="26" fill="url(#siteGlow)" />
          <rect
            x="2"
            y="22"
            width="28"
            height="24"
            rx="2"
            fill="var(--surface-2)"
            stroke="var(--brand-line)"
            strokeWidth="1.5"
          />
          <path d="M2 22 l14 -10 l14 10" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round" />

          <circle cx="186" cy="34" r="26" fill="url(#siteGlow)" />
          <rect
            x="172"
            y="22"
            width="28"
            height="24"
            rx="2"
            fill="var(--surface-2)"
            stroke="var(--brand-line)"
            strokeWidth="1.5"
          />
          <path d="M172 22 l14 -10 l14 10" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round" />

          <line x1="36" y1="34" x2="166" y2="34" stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 5" />
          <line
            className={styles.route}
            x1="36"
            y1="34"
            x2="166"
            y2="34"
            stroke="url(#routeGrad)"
            strokeWidth="2"
          />

          <g className={styles.unit}>
            <rect x="-7" y="27" width="14" height="14" rx="2" fill="var(--brand)" opacity="0.95" />
            <line
              x1="-7"
              y1="34"
              x2="7"
              y2="34"
              stroke="var(--brand-contrast)"
              strokeWidth="1"
              opacity="0.45"
            />
          </g>
        </g>

        {/* ------------------------------------------------ lector de conteo */}
        <g transform="translate(280 148)">
          <line x1="0" y1="0" x2="202" y2="0" stroke="var(--line)" strokeWidth="1" />
          {READOUT.map((bar, i) => (
            <g key={i}>
              <rect x="0" y={12 + i * 14} width="202" height="4" rx="2" fill="var(--surface-2)" />
              <rect
                className={styles.level}
                style={{ animationDelay: `${(0.3 + i * 0.1).toFixed(2)}s` }}
                x="0"
                y={12 + i * 14}
                width={bar.width}
                height="4"
                rx="2"
                fill="var(--brand)"
                opacity={bar.opacity}
              />
            </g>
          ))}
        </g>

        <line x1="24" y1="216" x2="498" y2="216" stroke="var(--line)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Intercepción y limpieza inmediata de URL (?error=)
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      setErrorMessage(AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default);

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
      setErrorMessage(AUTH_ERROR_MESSAGES.Default);
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ------------------------------------------- panel de marca */}
      <aside className={styles.brandSide}>
        <div className={styles.brandMark}>
          <Logo height={26} tone="dark" />
          <span className={styles.brandRule} aria-hidden="true" />
          <span className={styles.tagline}>{TAGLINE}</span>
        </div>

        <WarehouseMotif />

        <div className={styles.brandCopy}>
          <h2 className={styles.brandH2}>Gestione todo el inventario, no solo el almacén.</h2>
          <p className={styles.brandP}>
            INVENTA.AI conecta inventario, pronóstico, órdenes de compra y financiamiento en
            cada sucursal y proveedor. Un único registro en vivo, desde la orden de compra
            hasta el cobro.
          </p>
          <div className={styles.brandRail}>
            {CAPABILITIES.map((capability) => (
              <span key={capability}>{capability}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* --------------------------------------------- panel de acceso */}
      <main className={styles.formSide}>
        <div className={styles.topbar}>
          <Link href="/ayuda/guia" className={styles.helpPill}>
            <HelpIcon />
            Centro de ayuda
          </Link>
        </div>

        <div className={styles.formWrap}>
          <div className={styles.card}>
            <div className={errorMessage ? `${styles.eyebrow} ${styles.eyebrowError}` : styles.eyebrow}>
              Plataforma de operaciones
            </div>
            <h1 className={styles.title}>Iniciar sesión</h1>
            <p className={styles.subtitle}>
              Use su cuenta de INVENTA.AI. El acceso depende de su empresa y su rol.
            </p>

            {errorMessage && (
              <div className={styles.alert} role="alert" aria-live="assertive">
                <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className={styles.alertBody}>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className={styles.alertClose}
                  aria-label="Cerrar alerta"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            <div className={styles.divider} aria-hidden="true">
              <span className={styles.dividerRule} />
              <span className={styles.dividerText}>Inicie sesión con</span>
              <span className={styles.dividerRule} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={styles.idp}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>Conectando con Google…</span>
                </>
              ) : (
                <>
                  <GoogleMark />
                  <span>Google</span>
                </>
              )}
            </button>

            <p className={styles.aside}>
              Al continuar, aceptas nuestros{' '}
              <Link href="#" className={styles.asideLink}>
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="#" className={styles.asideLink}>
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <span>INVENTA.AI Operaciones</span>
          <span className={styles.footerLinks}>
            <Link href="/ayuda/guia" className={styles.footerLink}>
              Ayuda
            </Link>
            <Link href="/ayuda/soporte" className={styles.footerLink}>
              Soporte
            </Link>
          </span>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.formWrap} style={{ minHeight: '100dvh' }} />}>
      <LoginContent />
    </Suspense>
  );
}
