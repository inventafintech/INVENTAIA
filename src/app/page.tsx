'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { AccessLanding } from '@/components/landing/AccessLanding';
import landingStyles from '@/components/landing/AccessLanding.module.css';
import { GoogleMark } from '@/components/landing/GoogleMark';
import { LANDING_COPY, LANDING_LANG_KEY, LandingLang } from '@/lib/landingCopy';

function CaretIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5L6 8.5L10 4.5" />
    </svg>
  );
}

const VOLUMENES = [
  'S/ 50,000 - S/ 200,000',
  'S/ 200,000 - S/ 500,000',
  'S/ 500,000 - S/ 1,000,000',
  'Más de S/ 1,000,000',
];

export default function LandingPage() {
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LandingLang>('es');
  const [googleLoading, setGoogleLoading] = useState(false);

  const t = LANDING_COPY[selectedLang];

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'es' || urlLang === 'en') {
        setSelectedLang(urlLang);
        window.localStorage.setItem(LANDING_LANG_KEY, urlLang);
        document.documentElement.lang = urlLang;
        return;
      }
      const saved = window.localStorage.getItem(LANDING_LANG_KEY);
      if (saved === 'es' || saved === 'en') {
        setSelectedLang(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // fallback
    }
  }, []);

  const changeLang = (lang: LandingLang) => {
    setSelectedLang(lang);
    try {
      window.localStorage.setItem(LANDING_LANG_KEY, lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    try {
      setGoogleLoading(true);
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setGoogleLoading(false);
    }
  };

  const [demoForm, setDemoForm] = useState({
    nombre: '', email: '', empresa: '', telefono: '', volumen: VOLUMENES[0]
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <>
      <AccessLanding
        tagline={t.acc_tagline}
        headline={t.hero_title}
        description={t.hero_sub}
        capabilities={[t.acc_cap1, t.acc_cap2, t.acc_cap3, t.acc_cap4, t.acc_cap5]}
        topbar={
          <>
            <span className={landingStyles.pillLabel} aria-hidden="true">
              {selectedLang === 'es' ? 'Idioma' : 'Language'}
            </span>
            <button
              type="button"
              className={landingStyles.pill}
              aria-label={t.nav_lang_label}
              aria-live="polite"
              onClick={() => changeLang(selectedLang === 'es' ? 'en' : 'es')}
            >
              <span>{selectedLang === 'es' ? t.acc_lang_es : t.acc_lang_en}</span>
              <CaretIcon />
            </button>
          </>
        }
        eyebrow={t.acc_eyebrow}
        title={isAuthenticated ? t.nav_dashboard : t.acc_title}
        subtitle={t.acc_sub}
        footerNote={
          <Link href="/login" className={landingStyles.asideLink}>
            {t.acc_trial}
          </Link>
        }
        footerLeft={t.acc_footer_left}
        footerLinks={[
          { href: '/ayuda/guia', label: t.acc_help },
          { href: '/ayuda/soporte', label: t.acc_support },
        ]}
      >
        {isAuthenticated ? (
          <div className={landingStyles.stack}>
            <Link href="/dashboard" className={landingStyles.btnPrimary}>
              {t.nav_dashboard}
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setDemoSubmitted(false); setIsDemoModalOpen(true); }}
              className={landingStyles.btnPrimary}
            >
              {t.hero_cta_demo}
            </button>

            <div className={landingStyles.divider} aria-hidden="true">
              <span className={landingStyles.dividerRule} />
              <span className={landingStyles.dividerText}>{t.acc_divider}</span>
              <span className={landingStyles.dividerRule} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className={landingStyles.idp}
              aria-busy={googleLoading}
            >
              {googleLoading ? (
                <>
                  <svg className={landingStyles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>…</span>
                </>
              ) : (
                <>
                  <GoogleMark />
                  <span>{t.acc_google}</span>
                </>
              )}
            </button>
          </>
        )}
      </AccessLanding>

      {/* Modal de demo (oscuro fijo, como la página) */}
      {isDemoModalOpen && (
        <div className={landingStyles.modalOverlay} onClick={() => setIsDemoModalOpen(false)}>
          <div className={landingStyles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.modal_title}>
            {!demoSubmitted ? (
              <>
                <h3 className={landingStyles.modalTitle}>{t.modal_title}</h3>
                <p className={landingStyles.modalSub}>{t.modal_sub}</p>
                <form onSubmit={handleDemoSubmit}>
                  <input
                    type="text"
                    required
                    value={demoForm.nombre}
                    onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                    placeholder={`${t.modal_nombre} · ${t.modal_nombre_ph}`}
                    className={landingStyles.modalField}
                    aria-label={t.modal_nombre}
                  />
                  <input
                    type="email"
                    required
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    placeholder={t.modal_email}
                    className={landingStyles.modalField}
                    aria-label={t.modal_email}
                  />
                  <input
                    type="text"
                    required
                    value={demoForm.empresa}
                    onChange={(e) => setDemoForm({ ...demoForm, empresa: e.target.value })}
                    placeholder={`${t.modal_empresa} · ${t.modal_empresa_ph}`}
                    className={landingStyles.modalField}
                    aria-label={t.modal_empresa}
                  />
                  <input
                    type="tel"
                    required
                    value={demoForm.telefono}
                    onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                    placeholder={t.modal_tel}
                    className={landingStyles.modalField}
                    aria-label={t.modal_tel}
                  />
                  <button type="submit" className={landingStyles.btnPrimary}>
                    {t.modal_submit}
                  </button>
                </form>
                <p className={landingStyles.modalSub} style={{ margin: '16px 0 0', fontSize: 12 }}>
                  {t.modal_priv}
                </p>
              </>
            ) : (
              <div className={landingStyles.modalOk}>
                <div className={landingStyles.modalOkBadge} aria-hidden="true">✓</div>
                <h3 className={landingStyles.modalTitle}>{t.modal_ok}</h3>
                <p className={landingStyles.modalSub}>
                  {t.modal_ok_p1} {demoForm.nombre || ''}, {t.modal_ok_p2} {demoForm.email || ''} {t.modal_ok_p3} {demoForm.telefono || ''} {t.modal_ok_p4}
                </p>
                <Link href="/dashboard" className={landingStyles.btnPrimary}>
                  {t.modal_dashboard}
                </Link>
                <button type="button" onClick={() => setIsDemoModalOpen(false)} className={landingStyles.modalClose}>
                  {t.modal_close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
