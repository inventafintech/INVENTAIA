'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams ? searchParams.get('error') : null;
  const notice = searchParams ? searchParams.get('notice') : null;

  return (
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

      {error && (
        <div className={styles.errorBanner}>
          <strong>Error de autenticación:</strong> {error}
        </div>
      )}

      {/* Botón oficial de Google OAuth */}
      <a href="/api/auth/google" className={styles.btnGoogle}>
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
        Continuar con Google
      </a>

      {/* Fallback de modo desarrollo/demo para validación inmediata */}
      <div className={styles.noticeBox}>
        <div className={styles.noticeTitle}>Modo de Verificación Inmediata</div>
        <p style={{ margin: 0, fontSize: '12px' }}>
          Puedes probar el flujo de Onboarding Multi-Tenant con una cuenta Google verificada:
        </p>
        <a href="/api/auth/google?dev=true" className={styles.btnDemo}>
          Acceder como José González (Google)
        </a>
      </div>

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
