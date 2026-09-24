'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShieldCheck, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import styles from '../page.module.css';

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
    <div className={styles.card}>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <Logo height={30} tone="light" />
        </span>
        <span className={styles.badge}>Enterprise B2B</span>
      </div>

      <h1 className={styles.title}>Verificación en dos pasos</h1>
      <p className={styles.subtitle}>
        Tu cuenta exige un segundo factor. Abre tu autenticador (Google Authenticator, Authy)
        e ingresa el código actual de 6 dígitos.
      </p>

      {errorMessage && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          <div className={styles.errorContent}>
            <AlertCircle size={16} />
            <span className={styles.errorText}>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className={styles.errorClose} aria-label="Cerrar alerta">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            {useBackup ? 'Código de respaldo' : 'Código del autenticador'}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(useBackup ? e.target.value.toUpperCase().slice(0, 9) : e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder={useBackup ? 'XXXX-XXXX' : '••••••'}
            autoComplete="one-time-code"
            inputMode={useBackup ? 'text' : 'numeric'}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '20px',
              letterSpacing: useBackup ? '2px' : '8px',
              textAlign: 'center',
              fontWeight: 700,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={verifying || !code.trim()}
          className={styles.btnGoogle}
          style={{ justifyContent: 'center' }}
        >
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
          style={{
            background: 'transparent',
            border: 'none',
            color: '#2563eb',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <KeyRound size={14} />
          {useBackup ? 'Usar código del autenticador' : 'Usar un código de respaldo'}
        </button>

        <Link href="/login" style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>
          ← Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <div className={styles.container}>
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
      <Suspense fallback={<div className={styles.loadingFallback}>Cargando…</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
