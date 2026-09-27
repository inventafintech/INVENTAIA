'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { AccessLanding } from '@/components/landing/AccessLanding';
import landingStyles from '@/components/landing/AccessLanding.module.css';
import styles from './page.module.css';

const CAPABILITIES = [
  'Inventario',
  'Pronóstico',
  'Reabastecimiento',
  'Financiamiento',
  'Analítica',
];

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update: updateSession } = useSession();

  const callbackUrl = searchParams?.get('callbackUrl') || '/overview';
  const flow = searchParams?.get('flow') || 'nextauth';

  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const clean = code.trim().toUpperCase();
    if (!useBackup && !/^\d{6}$/.test(clean)) {
      setErrorMessage('Ingresa el código de 6 dígitos de tu autenticador.');
      return;
    }
    if (useBackup && !clean) {
      setErrorMessage('Ingresa uno de tus códigos de respaldo.');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(useBackup ? { backupCode: clean } : { token: clean }),
          callbackUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo verificar el código.');
      }
      if (data?.redirect && flow !== 'nextauth') {
        router.push(data.redirect);
        return;
      }
      // Flujo NextAuth: marcar la sesión como verificada y continuar
      try {
        await updateSession({ twoFactorVerified: true });
      } catch {
        // continuar aunque el refresh falle; el middleware reevaluará
      }
      router.push(data?.redirect || callbackUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo verificar el código.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AccessLanding
      tagline="Inventario, pronóstico, reabastecimiento y finanzas"
      headline="Gestione todo el inventario, no solo el almacén."
      description="INVENTA.AI conecta inventario, pronóstico, órdenes de compra y financiamiento en cada sucursal y proveedor. Un único registro en vivo, desde la orden de compra hasta el cobro."
      capabilities={CAPABILITIES}
      topbar={null}
      eyebrow="Seguridad de la cuenta"
      eyebrowError={errorMessage !== null}
      title="Verificación en dos pasos"
      subtitle="Tu cuenta exige un segundo factor. Abre tu autenticador (Google Authenticator, Authy) e ingresa el código actual de 6 dígitos."
      alert={
        errorMessage ? (
          <div className={landingStyles.alert} role="alert" aria-live="assertive">
            <span className={landingStyles.alertBody}>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className={landingStyles.alertClose}
              aria-label="Cerrar alerta"
            >
              ×
            </button>
          </div>
        ) : undefined
      }
      footerNote={
        <Link href="/login" className={styles.backLink}>
          ← Volver al inicio de sesión
        </Link>
      }
      footerLeft="INVENTA.AI Operaciones"
      footerLinks={[
        { href: '/ayuda/guia', label: 'Ayuda' },
        { href: '/ayuda/soporte', label: 'Soporte' },
      ]}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <label className={styles.label} htmlFor="totp-code">
            {useBackup ? 'Código de respaldo' : 'Código del autenticador'}
          </label>
          <input
            id="totp-code"
            type="text"
            value={code}
            onChange={(e) =>
              setCode(useBackup ? e.target.value.toUpperCase().slice(0, 9) : e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder={useBackup ? 'XXXX-XXXX' : '••••••'}
            autoComplete="one-time-code"
            inputMode={useBackup ? 'text' : 'numeric'}
            className={styles.otpInput}
            style={{ letterSpacing: useBackup ? '2px' : '8px' }}
            required
          />
        </div>

        <button type="submit" disabled={verifying || !code.trim()} className={landingStyles.btnPrimary}>
          {verifying ? (
            <>
              <Loader2 size={18} style={{ animation: 'inventa-spin 1s linear infinite' }} />
              <span>Verificando…</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Verificar y continuar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v);
            setCode('');
            setErrorMessage(null);
          }}
          className={styles.textBtn}
        >
          <KeyRound size={14} />
          {useBackup ? 'Usar código del autenticador' : 'Usar un código de respaldo'}
        </button>
      </form>
    </AccessLanding>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div className={landingStyles.formWrap} style={{ minHeight: '100dvh' }} />}>
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
      <VerifyContent />
    </Suspense>
  );
}
