'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Globe, Moon, Sun, Menu, X, Search, TrendingUp, Users, Wallet, ShieldCheck, Plug, FileCheck } from 'lucide-react';
import { GoogleMark } from '@/components/landing/GoogleMark';
import { LANDING_COPY, LANDING_LANG_KEY, LandingLang } from '@/lib/landingCopy';
import styles from './page.module.css';

/** Tema local del landing (no toca el tema global): Wise es light por defecto. */
const LANDING_THEME_KEY = 'inventa_landing_theme';

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
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LandingLang>('es');
  const [googleLoading, setGoogleLoading] = useState(false);
  // Wise Theme: light. El toggle invierte solo esta página a Forest.
  const [light, setLight] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LANDING_THEME_KEY) === 'dark') {
        setLight(false);
      }
    } catch {
      // storage bloqueado: queda el claro por defecto
    }
  }, []);

  const toggleLandingTheme = () => {
    setLight((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LANDING_THEME_KEY, next ? 'light' : 'dark');
      } catch {
        // sin persistencia, el DOM ya quedó aplicado
      }
      return next;
    });
  };

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

  const openDemo = () => {
    setDemoSubmitted(false);
    setIsDemoModalOpen(true);
    setMobileOpen(false);
  };

  const [demoForm, setDemoForm] = useState({
    nombre: '', email: '', empresa: '', telefono: '', volumen: VOLUMENES[0]
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  const trustChips = [t.sec_shopify, t.sec_meli, t.sec_amazon, t.sec_sunat, t.sec_soc, t.sec_aes, t.sec_uptime, t.sec_cloud];

  const features = [
    { icon: <TrendingUp aria-hidden="true" />, title: t.feat1_t, body: t.feat1_d, checks: [t.feat1_a, t.feat1_b, t.feat1_c] },
    { icon: <Users aria-hidden="true" />, title: t.feat2_t, body: t.feat2_d, checks: [t.feat2_a, t.feat2_b, t.feat2_c] },
    { icon: <Wallet aria-hidden="true" />, title: t.feat3_t, body: t.feat3_d, checks: [t.feat3_a, t.feat3_b, t.feat3_c] },
  ];

  const techs = [
    { icon: <ShieldCheck aria-hidden="true" />, title: t.tech1_t, body: t.tech1_d },
    { icon: <ShieldCheck aria-hidden="true" />, title: t.tech2_t, body: t.tech2_d },
    { icon: <Plug aria-hidden="true" />, title: t.tech3_t, body: t.tech3_d },
    { icon: <FileCheck aria-hidden="true" />, title: t.tech4_t, body: t.tech4_d },
  ];

  return (
    <div className={light ? styles.shell : `${styles.shell} ${styles.shellDark}`} style={{ colorScheme: light ? 'light' : 'dark' }}>
      {/* ------------------------------------------------ Top Navigation Bar */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="INVENTA.AI">
            <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
              <rect x="8" y="34" width="12" height="20" rx="2" fill="#054d28" />
              <rect x="26" y="22" width="12" height="32" rx="2" fill="#163300" />
              <rect x="44" y="10" width="12" height="44" rx="2" fill="#9fe870" />
            </svg>
            <span className={styles.wordmark}>INVENTA<span className={styles.wordmarkAi}>.AI</span></span>
          </Link>

          <nav className={styles.segments} aria-label={t.nav_menu}>
            <Link href="/login" className={`${styles.segLink} ${styles.segActive}`}>{t.nav_plataforma}</Link>
            <Link href="/ayuda/guia" className={styles.segLink}>{t.nav_soluciones}</Link>
            <Link href="/plans" className={styles.segLink}>{t.nav_precios}</Link>
          </nav>

          <nav className={styles.nav} aria-label="Principal">
            <Link href="/ayuda/aprender" className={styles.navLink}>{t.nav_recursos}</Link>
            <Link href="/ayuda/soporte" className={styles.navLink}>{t.acc_support}</Link>
          </nav>

          <div className={styles.actions}>
            <button type="button" className={styles.langPill} aria-label={t.nav_lang_label} onClick={() => changeLang(selectedLang === 'es' ? 'en' : 'es')}>
              <Globe size={13} aria-hidden="true" />
              <span>{selectedLang === 'es' ? t.acc_lang_es : t.acc_lang_en}</span>
              <CaretIcon />
            </button>
            <button
              type="button"
              className={styles.iconPill}
              aria-label={light ? 'Tema oscuro' : 'Tema claro'}
              onClick={toggleLandingTheme}
            >
              {light ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
            </button>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.btnPrimary}>{t.nav_dashboard}</Link>
            ) : (
              <>
                <Link href="/login" className={styles.loginLink}>{t.nav_login}</Link>
                <Link href="/login" className={`${styles.btnPrimary} ${styles.headerCta}`}>{t.nav_trial}</Link>
              </>
            )}
            <button
              type="button"
              className={`${styles.iconPill} ${styles.menuBtn}`}
              aria-label={t.nav_menu}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className={styles.mobilePanel}>
            <Link href="/login" onClick={() => setMobileOpen(false)}>{t.nav_plataforma}</Link>
            <Link href="/ayuda/guia" onClick={() => setMobileOpen(false)}>{t.nav_soluciones}</Link>
            <Link href="/plans" onClick={() => setMobileOpen(false)}>{t.nav_precios}</Link>
            <Link href="/ayuda/aprender" onClick={() => setMobileOpen(false)}>{t.nav_recursos}</Link>
            <div className={styles.mobileCtaRow}>
              <button type="button" className={styles.btnPrimary} onClick={openDemo}>{t.hero_cta_demo}</button>
              <Link href="/login" className={styles.textLink} onClick={() => setMobileOpen(false)}>{t.nav_login}</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ---------------------------------------------------------------- hero */}
        <section className={styles.container}>
          <div className={styles.hero}>
            <span className={styles.badge}><span className={styles.dot} aria-hidden="true" />{t.hero_eyebrow}</span>
            <h1 className={styles.display}>{t.hero_title}</h1>
            <p className={styles.lead}>{t.hero_sub}</p>
            <div className={styles.ctaRow}>
              <button type="button" className={styles.btnPrimary} onClick={openDemo}>{t.hero_cta_demo}</button>
              <a href="#como-funciona" className={styles.textLink}>{t.hero_cta_how}</a>
            </div>
            <p className={styles.micro}>{t.hero_light} · {t.hero_trust1} · {t.hero_trust2} · {t.hero_trust3}</p>

            <div className={styles.heroCard} role="img" aria-label={t.mockup_chart}>
              <div className={styles.heroCardHead}>
                <span className={styles.searchPill}><Search size={15} aria-hidden="true" />{t.mockup_search}</span>
                <span className={styles.liveTag}><span className={styles.pulse} aria-hidden="true" />{t.mockup_live}</span>
              </div>
              <div className={styles.kpis}>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t.mockup_kpi1}</div>
                  <div className={styles.kpiValue}>S/ 1.2M</div>
                  <div className={styles.kpiDelta}>+12.4%</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t.mockup_kpi2}</div>
                  <div className={styles.kpiValue}>8,431</div>
                  <div className={styles.kpiDelta}>+8.1%</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t.mockup_kpi3}</div>
                  <div className={styles.kpiValue}>85/100</div>
                  <div className={styles.kpiDelta}>{t.mockup_optimo}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t.mockup_kpi4}</div>
                  <div className={styles.kpiValue}>4</div>
                  <div className={styles.kpiDelta}>{t.mockup_enstock}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- trust band */}
        <section className={styles.band} aria-label={t.trust_title}>
          <div className={styles.container}>
            <p className={styles.bandTitle}>{t.trust_title}</p>
            <div className={styles.chips}>
              {trustChips.map((chip) => (
                <span key={chip} className={styles.chip}><span className={styles.chipDot} aria-hidden="true" />{chip}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------- problema / solución */}
        <section id="como-funciona" className={styles.section}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.prob_pre}</p>
            <h2 className={styles.h2}>{t.prob_title}</h2>
            <p className={styles.sub}>{t.prob_sub}</p>
            <div className={styles.grid2}>
              <div className={`${styles.panel} ${styles.panelRisk}`}>
                <span className={styles.panelTag}>{t.prob_badge}</span>
                <h3 className={styles.panelTitle}>{t.prob_h}</h3>
                <ul className={styles.panelList}>
                  <li><strong>{t.prob_1t}</strong> {t.prob_1}</li>
                  <li><strong>{t.prob_2t}</strong> {t.prob_2}</li>
                  <li><strong>{t.prob_3t}</strong> {t.prob_3}</li>
                  <li><strong>{t.prob_4t}</strong> {t.prob_4}</li>
                </ul>
              </div>
              <div className={`${styles.panel} ${styles.panelOk}`}>
                <span className={styles.panelTag}>{t.sol_badge}</span>
                <h3 className={styles.panelTitle}>{t.sol_h}</h3>
                <ul className={styles.panelList}>
                  <li><strong>{t.sol_1t}</strong> {t.sol_1}</li>
                  <li><strong>{t.sol_2t}</strong> {t.sol_2}</li>
                  <li><strong>{t.sol_3t}</strong> {t.sol_3}</li>
                  <li><strong>{t.sol_4t}</strong> {t.sol_4}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ pilares */}
        <section className={`${styles.section} ${styles.sectionTint}`}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.feat_pre}</p>
            <h2 className={styles.h2}>{t.feat_title}</h2>
            <p className={styles.sub}>{t.feat_sub}</p>
            <div className={styles.grid3}>
              {features.map((f) => (
                <article key={f.title} className={styles.feature}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                  <ul className={styles.featureChecks}>
                    {f.checks.map((c) => (
                      <li key={c}><span className={styles.check} aria-hidden="true">✓</span>{c}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- ROI */}
        <section className={styles.section}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.roi_pre}</p>
            <h2 className={styles.h2}>{t.roi_title}</h2>
            <p className={styles.sub}>{t.roi_sub}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statValue}>+18%</div>
                <div className={styles.statTitle}>{t.roi1_t}</div>
                <p className={styles.statBody}>{t.roi1_d}</p>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>−52%</div>
                <div className={styles.statTitle}>{t.roi2_t}</div>
                <p className={styles.statBody}>{t.roi2_d}</p>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>94.5%</div>
                <div className={styles.statTitle}>{t.roi3_t}</div>
                <p className={styles.statBody}>{t.roi3_d}</p>
              </div>
            </div>

            <div className={styles.quote}>
              <span className={styles.badge}>{t.case_tag}</span>
              <p className={styles.quoteText} style={{ marginTop: 20 }}>{t.case_quote}</p>
              <p className={styles.quoteMeta}>{t.case_company} · {t.case_cat}</p>
              <div className={styles.quoteStats}>
                <span className={styles.chip}>{t.case_stat1} −52%</span>
                <span className={styles.chip}>{t.case_stat2} S/ 120,000</span>
                <span className={styles.chip}>{t.case_stat3} 90 días</span>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- tech */}
        <section className={`${styles.section} ${styles.sectionTint}`}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.tech_pre}</p>
            <h2 className={styles.h2}>{t.tech_title}</h2>
            <p className={styles.sub}>{t.tech_sub}</p>
            <div className={styles.techGrid}>
              {techs.map((f) => (
                <article key={f.title} className={styles.feature}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------- dark section card + acceso */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.darkCard}>
              <div>
                <h2 className={styles.darkTitle}>{t.cta_title}</h2>
                <p className={styles.darkBody}>{t.cta_sub}</p>
                <div className={styles.darkCtaRow}>
                  <button type="button" className={styles.btnPrimary} onClick={openDemo}>{t.cta_demo}</button>
                  <Link href="/dashboard" className={styles.textLink}>{t.cta_explore}</Link>
                </div>
                <p className={styles.darkBody} style={{ fontSize: 14, marginTop: 16 }}>{t.cta_micro}</p>
              </div>
              <div className={styles.accessCard}>
                <div className={styles.accessEyebrow}>{t.acc_eyebrow}</div>
                <h3 className={styles.accessTitle}>{isAuthenticated ? t.nav_dashboard : t.acc_title}</h3>
                <p className={styles.accessSub}>{t.acc_sub}</p>
                {isAuthenticated ? (
                  <Link href="/dashboard" className={styles.btnPrimary}>{t.nav_dashboard}</Link>
                ) : (
                  <>
                    <button type="button" onClick={openDemo} className={styles.btnPrimary}>
                      {t.hero_cta_demo}
                    </button>
                    <div className={styles.divider} aria-hidden="true">
                      <span className={styles.dividerRule} />
                      <span className={styles.dividerText}>{t.acc_divider}</span>
                      <span className={styles.dividerRule} />
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className={styles.googleBtn}
                      aria-busy={googleLoading}
                    >
                      {googleLoading ? (
                        <>
                          <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                <p className={styles.trialNote}>
                  <Link href="/login">{t.acc_trial}</Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <span className={styles.wordmark}>INVENTA<span className={styles.wordmarkAi}>.AI</span></span>
              <p className={styles.footerTagline}>{t.foot_tagline}</p>
            </div>
            <div>
              <div className={styles.footerH}>{t.foot_prod}</div>
              <div className={styles.footerLinks}>
                <Link href="/ayuda/guia">{t.foot_f1}</Link>
                <Link href="/ayuda/guia">{t.foot_f2}</Link>
                <Link href="/ayuda/guia">{t.foot_f3}</Link>
                <Link href="/ayuda/guia">{t.foot_f4}</Link>
              </div>
            </div>
            <div>
              <div className={styles.footerH}>{t.foot_emp}</div>
              <div className={styles.footerLinks}>
                <Link href="/ayuda/aprender">{t.foot_e1}</Link>
                <Link href="/ayuda/aprender">{t.foot_e2}</Link>
                <Link href="/ayuda/aprender">{t.foot_e3}</Link>
                <Link href="/ayuda/aprender">{t.foot_e4}</Link>
              </div>
            </div>
            <div>
              <div className={styles.footerH}>{t.foot_sup}</div>
              <div className={styles.footerLinks}>
                <Link href="/ayuda/soporte">{t.acc_support}</Link>
                <Link href="/terms">{t.foot_terms}</Link>
                <Link href="/privacy">{t.foot_priv}</Link>
                <Link href="/ayuda/soporte">{t.foot_status}</Link>
              </div>
            </div>
          </div>
          <div className={styles.footerBase}>
            <span>{t.foot_rights}</span>
            <span>{t.foot_built}</span>
          </div>
        </div>
      </footer>

      {/* Floating badge */}
      <button type="button" className={styles.floatBadge} onClick={openDemo} aria-label={t.floating_aria}>
        {t.floating}
      </button>

      {/* Modal de demo */}
      {isDemoModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsDemoModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.modal_title}>
            {!demoSubmitted ? (
              <>
                <div className={styles.modalPre}>{t.modal_pre}</div>
                <h3 className={styles.modalTitle}>{t.modal_title}</h3>
                <p className={styles.modalSub}>{t.modal_sub}</p>
                <form onSubmit={handleDemoSubmit}>
                  <input
                    type="text"
                    required
                    value={demoForm.nombre}
                    onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                    placeholder={`${t.modal_nombre} · ${t.modal_nombre_ph}`}
                    className={styles.modalField}
                    aria-label={t.modal_nombre}
                  />
                  <input
                    type="email"
                    required
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    placeholder={t.modal_email}
                    className={styles.modalField}
                    aria-label={t.modal_email}
                  />
                  <input
                    type="text"
                    required
                    value={demoForm.empresa}
                    onChange={(e) => setDemoForm({ ...demoForm, empresa: e.target.value })}
                    placeholder={`${t.modal_empresa} · ${t.modal_empresa_ph}`}
                    className={styles.modalField}
                    aria-label={t.modal_empresa}
                  />
                  <input
                    type="tel"
                    required
                    value={demoForm.telefono}
                    onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                    placeholder={t.modal_tel}
                    className={styles.modalField}
                    aria-label={t.modal_tel}
                  />
                  <label className={styles.modalSub} htmlFor="demo-volumen" style={{ margin: '4px 0 8px', display: 'block' }}>
                    {t.modal_vol}
                  </label>
                  <select
                    id="demo-volumen"
                    value={demoForm.volumen}
                    onChange={(e) => setDemoForm({ ...demoForm, volumen: e.target.value })}
                    className={styles.modalField}
                    aria-label={t.modal_vol}
                  >
                    {VOLUMENES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <button type="submit" className={styles.btnPrimary}>
                    {t.modal_submit}
                  </button>
                </form>
                <p className={styles.modalPriv}>{t.modal_priv}</p>
              </>
            ) : (
              <div className={styles.modalOk}>
                <div className={styles.modalOkBadge} aria-hidden="true">✓</div>
                <h3 className={styles.modalTitle}>{t.modal_ok}</h3>
                <p className={styles.modalSub}>
                  {t.modal_ok_p1} {demoForm.nombre || ''}, {t.modal_ok_p2} {demoForm.email || ''} {t.modal_ok_p3} {demoForm.telefono || ''} {t.modal_ok_p4}
                </p>
                <Link href="/dashboard" className={styles.btnPrimary}>
                  {t.modal_dashboard}
                </Link>
                <button type="button" onClick={() => setIsDemoModalOpen(false)} className={styles.modalClose}>
                  {t.modal_close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
