'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/brand/Logo';
import styles from './page.module.css';
import {
  IconGlobe,
  IconShieldCheck,
  IconLock,
  IconZap,
  IconCloud,
  IconBuilding,
  IconCode,
  IconHelpCircle
} from '@/components/ui/icons';
import { LANDING_COPY, LANDING_LANG_KEY, LandingLang } from '@/lib/landingCopy';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LandingLang>('es');
  const [forecastHorizon, setForecastHorizon] = useState<'30d' | '60d' | '180d'>('60d');

  const t = LANDING_COPY[selectedLang];

  // Idioma: ?lang= compartible > localStorage > 'es'. Sincroniza <html lang>.
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
      // entorno sin storage/DOM: se mantiene español
    }
  }, []);

  const changeLang = (lang: LandingLang) => {
    setSelectedLang(lang);
    try {
      window.localStorage.setItem(LANDING_LANG_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // solo sesión
    }
    setLangDropdownOpen(false);
  };

  // Cierre accesible de desplegables: clic fuera + Escape
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const el = event.target as HTMLElement | null;
      if (el && typeof el.closest === 'function' && el.closest('[data-dropdown]')) return;
      setPlatformDropdownOpen(false);
      setSolutionsDropdownOpen(false);
      setLangDropdownOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPlatformDropdownOpen(false);
        setSolutionsDropdownOpen(false);
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Demo Form State
  const [demoForm, setDemoForm] = useState({
    nombre: '',
    email: '',
    empresa: '',
    telefono: '',
    volumen: 'S/ 50,000 - S/ 200,000'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <div className={styles.containerDark}>
      {/* 1. Barra de Navegación Superior */}
      <header className={styles.navDark}>
        <div className={styles.navContent}>
          {/* Logo a la izquierda */}
          <div className={styles.logoGroup}>
            <Link href="/" className={styles.logoDark} aria-label="INVENTA.AI - Inicio">
              <Logo height={26} />
            </Link>
            <span className={styles.tagEnterpriseDark}>Enterprise B2B</span>
          </div>

          {/* Enlaces de navegación centrales con dropdowns */}
          <nav className={styles.linksDark}>
            {/* Plataforma */}
            <div className={styles.navDropdownWrapper} data-dropdown="platform">
              <button
                type="button"
                className={styles.navDropdownTrigger}
                aria-haspopup="true"
                aria-expanded={platformDropdownOpen}
                onClick={() => {
                  setPlatformDropdownOpen(!platformDropdownOpen);
                  setSolutionsDropdownOpen(false);
                }}
              >
                <span>{t.nav_plataforma}</span>
                <span className={styles.chevronIcon}>⌄</span>
              </button>
              {platformDropdownOpen && (
                <div className={styles.dropdownMenuDark}>
                  <a href="#soluciones" onClick={() => setPlatformDropdownOpen(false)}>
                    <strong>{t.nav_motor}</strong>
                    <span>{t.nav_motor_desc}</span>
                  </a>
                  <a href="#soluciones" onClick={() => setPlatformDropdownOpen(false)}>
                    <strong>{t.nav_jit}</strong>
                    <span>{t.nav_jit_desc}</span>
                  </a>
                  <a href="#tecnologia" onClick={() => setPlatformDropdownOpen(false)}>
                    <strong>{t.nav_erp}</strong>
                    <span>{t.nav_erp_desc}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Soluciones */}
            <div className={styles.navDropdownWrapper} data-dropdown="solutions">
              <button
                type="button"
                className={styles.navDropdownTrigger}
                aria-haspopup="true"
                aria-expanded={solutionsDropdownOpen}
                onClick={() => {
                  setSolutionsDropdownOpen(!solutionsDropdownOpen);
                  setPlatformDropdownOpen(false);
                }}
              >
                <span>{t.nav_soluciones}</span>
                <span className={styles.chevronIcon}>⌄</span>
              </button>
              {solutionsDropdownOpen && (
                <div className={styles.dropdownMenuDark}>
                  <a href="#problema" onClick={() => setSolutionsDropdownOpen(false)}>
                    <strong>{t.nav_dist}</strong>
                    <span>{t.nav_dist_desc}</span>
                  </a>
                  <a href="#roi" onClick={() => setSolutionsDropdownOpen(false)}>
                    <strong>{t.nav_fin}</strong>
                    <span>{t.nav_fin_desc}</span>
                  </a>
                  <a href="#casos" onClick={() => setSolutionsDropdownOpen(false)}>
                    <strong>{t.nav_consorcios}</strong>
                    <span>{t.nav_consorcios_desc}</span>
                  </a>
                </div>
              )}
            </div>

            <a href="#roi" className={styles.navLinkDark}>{t.nav_precios}</a>
            <a href="#tecnologia" className={styles.navLinkDark}>{t.nav_recursos}</a>
          </nav>

          {/* Extremo derecho: idioma, tema, login/CTAs */}
          <div className={styles.actionsDark}>
            {/* Selector de idioma con ícono vectorial */}
            <div className={styles.langSelectorWrapper} data-dropdown="lang">
              <button
                type="button"
                className={styles.langSelectorBtn}
                aria-haspopup="true"
                aria-expanded={langDropdownOpen}
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                aria-label={t.nav_lang_label}
              >
                <IconGlobe size={14} className={styles.langGlobeIcon} />
                <span>{selectedLang === 'es' ? 'Español' : 'English'}</span>
                <span className={styles.chevronIcon}>⌄</span>
              </button>
              {langDropdownOpen && (
                <div className={styles.langDropdownMenu}>
                  <button
                    type="button"
                    className={`${styles.langOption} ${selectedLang === 'es' ? styles.langActive : ''}`}
                    onClick={() => changeLang('es')}
                  >
                    Español
                  </button>
                  <button
                    type="button"
                    className={`${styles.langOption} ${selectedLang === 'en' ? styles.langActive : ''}`}
                    onClick={() => changeLang('en')}
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            {/* Tema claro/oscuro (mismo sistema que el dashboard) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.langSelectorBtn}
              aria-label={theme === 'dark' ? (selectedLang === 'es' ? 'Cambiar a modo claro' : 'Switch to light mode') : (selectedLang === 'es' ? 'Cambiar a modo oscuro' : 'Switch to dark mode')}
              title={theme === 'dark' ? '☀' : '☾'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {isAuthenticated ? (
              <Link href="/overview" className={styles.btnAmberNav}>
                {t.nav_dashboard}
              </Link>
            ) : (
              <>
                {/* Iniciar sesión */}
                <Link href="/login" className={styles.navLoginLinkDark}>
                  {t.nav_login}
                </Link>

                {/* Reservar una demo */}
                <button
                  type="button"
                  className={styles.btnOutlineNav}
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  {t.nav_demo}
                </button>

                {/* Iniciar prueba gratis de 7 días (Botón principal destacado) */}
                <Link href="/login" className={styles.btnAmberNav}>
                  {t.nav_trial}
                </Link>

                {/* Empezar gratis (Enlace sutil) */}
                <Link href="/login" className={styles.linkEmpezarGratis}>
                  {t.nav_start}
                </Link>
              </>
            )}
          </div>

          {/* Botón menú hamburguesa en móvil */}
          <button
            type="button"
            className={styles.hamburgerBtnDark}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={t.nav_menu}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Menú móvil desplegable */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenuDark}>
            <nav className={styles.mobileNavLinksDark}>
              <a href="#soluciones" onClick={() => setMobileMenuOpen(false)}>{t.nav_plataforma}</a>
              <a href="#problema" onClick={() => setMobileMenuOpen(false)}>{t.nav_soluciones}</a>
              <a href="#roi" onClick={() => setMobileMenuOpen(false)}>{t.nav_precios}</a>
              <a href="#tecnologia" onClick={() => setMobileMenuOpen(false)}>{t.nav_recursos}</a>
            </nav>
            <div className={styles.mobileMenuDividerDark} />
            <div className={styles.mobileMenuActionsDark}>
              {isAuthenticated ? (
                <Link href="/overview" className={styles.btnAmberNav} onClick={() => setMobileMenuOpen(false)} style={{ textAlign: 'center' }}>
                  {t.nav_dashboard}
                </Link>
              ) : (
                <>
                  <Link href="/login" className={styles.btnAmberNav} onClick={() => setMobileMenuOpen(false)} style={{ textAlign: 'center' }}>
                    {t.nav_trial}
                  </Link>
                  <button
                    type="button"
                    className={styles.btnOutlineNav}
                    onClick={() => { setMobileMenuOpen(false); setIsDemoModalOpen(true); }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {t.nav_demo}
                  </button>
                  <Link href="/login" className={styles.navLoginLinkDark} onClick={() => setMobileMenuOpen(false)} style={{ textAlign: 'center' }}>
                    {t.nav_login}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className={styles.main}>
        {/* 2. Hero Section - Layout de 2 Columnas Exacto al Diseño Panthor */}
        <section className={styles.heroTwoColsSection}>
          <div className={styles.heroTwoColsContainer}>
            {/* Columna Izquierda: Contenido y Conversión */}
            <div className={styles.heroLeftCol}>
              {/* Eyebrow Text */}
              <div className={styles.eyebrowAmber}>
                {t.hero_eyebrow}
              </div>

              {/* Titular Principal */}
              <h1 className={styles.heroMainTitle}>
                {t.hero_title}
              </h1>

              {/* Subtitular */}
              <p className={styles.heroSubTitle}>
                {t.hero_sub}
              </p>

              {/* Botones de Acción (CTAs) */}
              <div className={styles.heroBtnGroup}>
                <button
                  type="button"
                  className={styles.btnAmberHero}
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  <span>{t.hero_cta_demo}</span>
                  <span className={styles.btnArrowIcon}>→</span>
                </button>
                <a
                  href="#problema"
                  className={styles.btnOutlineHero}
                >
                  {t.hero_cta_how}
                </a>
              </div>

              {/* Micro-copy y Señales de Confianza */}
              <div className={styles.heroMicroTrust}>
                <Link href="/login" className={styles.planLightLink}>
                  {t.hero_light}
                </Link>

                <div className={styles.trustBulletsList}>
                  <div className={styles.trustBulletItem}>
                    <span className={styles.checkCircleAmber}>✓</span>
                    <span>{t.hero_trust1}</span>
                  </div>
                  <div className={styles.trustBulletItem}>
                    <span className={styles.checkCircleAmber}>✓</span>
                    <span>{t.hero_trust2}</span>
                  </div>
                  <div className={styles.trustBulletItem}>
                    <span className={styles.checkCircleAmber}>✓</span>
                    <span>{t.hero_trust3}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Visualización del Producto (Ventana macOS con Dashboard) */}
            <div className={styles.heroRightCol}>
              <div className={styles.macWindow}>
                {/* Barra de control macOS */}
                <div className={styles.macTitlebar}>
                  <div className={styles.macControls}>
                    <span className={styles.macDotRed} />
                    <span className={styles.macDotYellow} />
                    <span className={styles.macDotGreen} />
                  </div>
                  <div className={styles.macSearchBar}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>{t.mockup_search}</span>
                  </div>
                  <div className={styles.macLiveStatus}>
                    <span className={styles.macLiveDot} />
                    <span>{t.mockup_live}</span>
                  </div>
                </div>

                {/* Interior de la ventana: Mockup de Alta Fidelidad */}
                <div className={styles.macMockupContent}>
                  {/* Encabezado del Dashboard */}
                  <div className={styles.mockupHeaderRow}>
                    <div>
                      <div className={styles.mockupBreadcrumb}>{t.mockup_crumb}</div>
                      <h3 className={styles.mockupHeading}>{t.mockup_heading}</h3>
                      <p className={styles.mockupSubtext}>{t.mockup_sub}</p>
                    </div>
                    <div className={styles.mockupHeaderTools}>
                      <span className={styles.mockupDateTag}>30d · 90d · 180d</span>
                      <button type="button" className={styles.mockupToolBtn}>{t.mockup_filter}</button>
                    </div>
                  </div>

                  <p className={styles.mockupInsightText}>
                    {t.mockup_insight}
                  </p>

                  {/* Tarjetas de Resumen KPI */}
                  <div className={styles.mockupKpiGrid}>
                    <div className={styles.mockupKpiItem}>
                      <span className={styles.mockupKpiLabel}>{t.mockup_kpi1}</span>
                      <div className={styles.mockupKpiValue}>$812,450</div>
                      <span className={styles.mockupKpiBadgeUp}>↑ +4.2%</span>
                    </div>
                    <div className={styles.mockupKpiItem}>
                      <span className={styles.mockupKpiLabel}>{t.mockup_kpi2}</span>
                      <div className={styles.mockupKpiValue}>12,847</div>
                      <span className={styles.mockupKpiBadgeUp}>↑ 99.8% a tiempo</span>
                    </div>
                    <div className={styles.mockupKpiItem}>
                      <span className={styles.mockupKpiLabel}>{t.mockup_kpi3}</span>
                      <div className={styles.mockupKpiValue}>85%</div>
                      <span className={styles.mockupKpiBadgeNeutral}>Óptimo</span>
                    </div>
                    <div className={styles.mockupKpiItem}>
                      <span className={styles.mockupKpiLabel}>{t.mockup_kpi4}</span>
                      <div className={styles.mockupKpiValue}>8</div>
                      <span className={styles.mockupKpiBadgeUp}>100% online</span>
                    </div>
                  </div>

                  {/* Gráficos del Mockup */}
                  <div className={styles.mockupVisualsSplit}>
                    {/* Gráfico de Forecast y Demanda */}
                    <div className={styles.mockupChartCard}>
                      <div className={styles.mockupChartHeader}>
                        <span>{t.mockup_chart}</span>
                        <div className={styles.mockupLegend}>
                          <span style={{ color: '#10b981' }}>―</span> {t.mockup_real}
                          <span style={{ color: '#3b82f6' }}>┄</span> {t.mockup_forecast}
                        </div>
                      </div>
                      <div className={styles.mockupSvgWrap}>
                        <svg viewBox="0 0 380 130" className={styles.mockupSvg} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="mockupBlueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="mockupGreenGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="30" x2="380" y2="30" stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                          <line x1="0" y1="65" x2="380" y2="65" stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                          <line x1="0" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                          <path d="M 0 95 Q 45 85 90 75 T 190 60 L 190 130 L 0 130 Z" fill="url(#mockupGreenGrad)" />
                          <path d="M 0 95 Q 45 85 90 75 T 190 60" fill="none" stroke="#10b981" strokeWidth="2.5" />
                          <path d="M 190 60 Q 240 45 290 38 T 380 20 L 380 130 L 190 130 Z" fill="url(#mockupBlueGrad)" />
                          <path d="M 190 60 Q 240 45 290 38 T 380 20" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 3" />
                          <circle cx="190" cy="60" r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Gráfico Radial de Salud */}
                    <div className={styles.mockupGaugeCard}>
                      <div className={styles.mockupChartHeader}>
                        <span>{t.mockup_avail}</span>
                      </div>
                      <div className={styles.mockupGaugeCircle}>
                        <svg viewBox="0 0 90 90" className={styles.mockupDonut}>
                          <circle cx="45" cy="45" r="34" fill="none" stroke="#1e293b" strokeWidth="7" />
                          <circle
                            cx="45"
                            cy="45"
                            r="34"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="7"
                            strokeDasharray="213.6"
                            strokeDashoffset="32"
                            strokeLinecap="round"
                            transform="rotate(-90 45 45)"
                          />
                          <text x="45" y="47" fill="#ffffff" fontSize="15" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">85%</text>
                          <text x="45" y="60" fill="#94a3b8" fontSize="7" textAnchor="middle">{t.mockup_optimo}</text>
                        </svg>
                      </div>
                      <div className={styles.mockupGaugeLegend}>
                        <div><span style={{ color: '#10b981' }}>●</span> {t.mockup_enstock}</div>
                        <div><span style={{ color: '#f59e0b' }}>●</span> {t.mockup_bajostock}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Action Button (Esquina inferior derecha) */}
        <button
          type="button"
          className={styles.floatingBusinessFitBtn}
          onClick={() => setIsDemoModalOpen(true)}
          aria-label={t.floating_aria}
        >
          <IconHelpCircle size={16} className={styles.sparkleIcon} />
          <span>{t.floating}</span>
        </button>


        {/* 3. Confianza Inmediata & Partners */}
        <section className={styles.trustSection}>
          <p className={styles.trustTitle}>
            {t.trust_title}
          </p>
          <div className={styles.trustLogosGrid}>
            <div className={styles.partnerChip}>
              <strong>SAP S/4HANA</strong>
              <span>OData v4 & RFC</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Shopify Plus</strong>
              <span>{t.sec_shopify}</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Mercado Libre</strong>
              <span>{t.sec_meli}</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Amazon Business</strong>
              <span>{t.sec_amazon}</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>SUNAT / OSE</strong>
              <span>{t.sec_sunat}</span>
            </div>
          </div>

          <div className={styles.securityBadges}>
            <span className={styles.securityPill}><IconShieldCheck size={14} /> {t.sec_soc}</span>
            <span className={styles.securityPill}><IconLock size={14} /> {t.sec_aes}</span>
            <span className={styles.securityPill}><IconZap size={14} /> {t.sec_uptime}</span>
            <span className={styles.securityPill}><IconCloud size={14} /> {t.sec_cloud}</span>
          </div>
        </section>

        {/* 4. El Costo del Problema (Rational Drowning) vs La Nueva Forma */}
        <section id="problema" className={styles.sectionDark}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>{t.prob_pre}</span>
            <h2 className={styles.sectionTitle}>
              {t.prob_title}
            </h2>
            <p className={styles.sectionSubtitle}>
              {t.prob_sub}
            </p>
          </div>

          <div className={styles.comparisonGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemHeader}>
                <span className={styles.problemBadge}>{t.prob_badge}</span>
                <h3>{t.prob_h}</h3>
              </div>
              <ul className={styles.problemList}>
                <li>
                  <strong>{t.prob_1t}</strong> {t.prob_1}
                </li>
                <li>
                  <strong>{t.prob_2t}</strong> {t.prob_2}
                </li>
                <li>
                  <strong>{t.prob_3t}</strong> {t.prob_3}
                </li>
                <li>
                  <strong>{t.prob_4t}</strong> {t.prob_4}
                </li>
              </ul>
            </div>

            <div className={styles.solutionCard}>
              <div className={styles.solutionHeader}>
                <span className={styles.solutionBadge}>{t.sol_badge}</span>
                <h3>{t.sol_h}</h3>
              </div>
              <ul className={styles.solutionList}>
                <li>
                  <strong>{t.sol_1t}</strong> {t.sol_1}
                </li>
                <li>
                  <strong>{t.sol_2t}</strong> {t.sol_2}
                </li>
                <li>
                  <strong>{t.sol_3t}</strong> {t.sol_3}
                </li>
                <li>
                  <strong>{t.sol_4t}</strong> {t.sol_4}
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Sección de Beneficios & Características Específicas */}
        <section id="soluciones" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>{t.feat_pre}</span>
            <h2 className={styles.sectionTitle}>
              {t.feat_title}
            </h2>
            <p className={styles.sectionSubtitle}>
              {t.feat_sub}
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              </div>
              <h3>{t.feat1_t}</h3>
              <p>
                {t.feat1_d}
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ {t.feat1_a}</span>
                <span>✓ {t.feat1_b}</span>
                <span>✓ {t.feat1_c}</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <h3>{t.feat2_t}</h3>
              <p>
                {t.feat2_d}
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ {t.feat2_a}</span>
                <span>✓ {t.feat2_b}</span>
                <span>✓ {t.feat2_c}</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
              </div>
              <h3>{t.feat3_t}</h3>
              <p>
                {t.feat3_d}
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ {t.feat3_a}</span>
                <span>✓ {t.feat3_b}</span>
                <span>✓ {t.feat3_c}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Prueba de ROI & Caso de Estudio Real */}
        <section id="roi" className={styles.sectionDark}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>{t.roi_pre}</span>
            <h2 className={styles.sectionTitle}>
              {t.roi_title}
            </h2>
            <p className={styles.sectionSubtitle}>
              {t.roi_sub}
            </p>
          </div>

          <div className={styles.roiMetricsGrid}>
            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>S/ 48,600</span>
              <span className={styles.roiTitle}>{t.roi1_t}</span>
              <p className={styles.roiDesc}>
                {t.roi1_d}
              </p>
            </div>

            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>-42%</span>
              <span className={styles.roiTitle}>{t.roi2_t}</span>
              <p className={styles.roiDesc}>
                {t.roi2_d}
              </p>
            </div>

            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>94.5%</span>
              <span className={styles.roiTitle}>{t.roi3_t}</span>
              <p className={styles.roiDesc}>
                {t.roi3_d}
              </p>
            </div>
          </div>

          {/* Case Study Card */}
          <div id="casos" className={styles.caseStudyBox}>
            <div className={styles.caseStudyContent}>
              <span className={styles.caseStudyTag}>{t.case_tag}</span>
              <h3 className={styles.caseStudyCompany}>{t.case_company}</h3>
              <p className={styles.caseStudyCategory}>{t.case_cat}</p>
              <blockquote className={styles.caseStudyQuote}>
                {t.case_quote}
              </blockquote>
              <div className={styles.caseStudyAuthor}>
                <strong>Javier González</strong>
                <span>Director de Operaciones & Logística</span>
              </div>
            </div>
            <div className={styles.caseStudyStats}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>-52%</span>
                <span className={styles.statLabel}>{t.case_stat1}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>S/ 120k</span>
                <span className={styles.statLabel}>{t.case_stat2}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>14 días</span>
                <span className={styles.statLabel}>{t.case_stat3}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Credibilidad Técnica e Integraciones (Para CTOs, COOs e Inversores) */}
        <section id="tecnologia" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>{t.tech_pre}</span>
            <h2 className={styles.sectionTitle}>
              {t.tech_title}
            </h2>
            <p className={styles.sectionSubtitle}>
              {t.tech_sub}
            </p>
          </div>

          <div className={styles.techSpecsGrid}>
            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}><IconZap size={22} strokeWidth={2} /></div>
              <h4>{t.tech1_t}</h4>
              <p>{t.tech1_d}</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}><IconLock size={22} strokeWidth={2} /></div>
              <h4>{t.tech2_t}</h4>
              <p>{t.tech2_d}</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}><IconCode size={22} strokeWidth={2} /></div>
              <h4>{t.tech3_t}</h4>
              <p>{t.tech3_d}</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}><IconBuilding size={22} strokeWidth={2} /></div>
              <h4>{t.tech4_t}</h4>
              <p>{t.tech4_d}</p>
            </div>
          </div>
        </section>

        {/* 8. Bottom CTA Banner */}
        <section className={styles.bottomCtaSection}>
          <div className={styles.bottomCtaCard}>
            <h2>{t.cta_title}</h2>
            <p>{t.cta_sub}</p>
            <div className={styles.bottomCtaActions}>
              <button
                className={styles.btnPrimaryCta}
                onClick={() => setIsDemoModalOpen(true)}
              >
                {t.cta_demo}
              </button>
              <Link href="/overview" className={styles.btnSecondaryCta}>
                {t.cta_explore}
              </Link>
            </div>
            <span className={styles.bottomCtaMicro}>{t.cta_micro}</span>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>
              <Logo height={28} />
            </span>
            <p>{t.foot_tagline}</p>
          </div>

          <div className={styles.footerLinksGrid}>
            <div>
              <h5>{t.foot_prod}</h5>
              <a href="#soluciones">{t.foot_f1}</a>
              <a href="#soluciones">{t.foot_f2}</a>
              <a href="#soluciones">{t.foot_f3}</a>
              <Link href="/addons">{t.foot_f4}</Link>
            </div>
            <div>
              <h5>{t.foot_emp}</h5>
              <a href="#roi">{t.foot_e1}</a>
              <a href="#casos">{t.foot_e2}</a>
              <a href="#tecnologia">{t.foot_e3}</a>
              <a href="#problema">{t.foot_e4}</a>
            </div>
            <div>
              <h5>{t.foot_sup}</h5>
              <a href="mailto:contacto@inventa.ai">contacto@inventa.ai</a>
              <span title={selectedLang === 'es' ? 'Disponible próximamente' : 'Coming soon'} style={{ cursor: 'default' }}>{t.foot_terms}</span>
              <span title={selectedLang === 'es' ? 'Disponible próximamente' : 'Coming soon'} style={{ cursor: 'default' }}>{t.foot_priv}</span>
              <a href="/api/health/schema" target="_blank" rel="noreferrer">{t.foot_status}</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>{t.foot_rights}</span>
          <span>{t.foot_built}</span>
        </div>
      </footer>

      {/* 10. MODAL SOLICITAR DEMO 1:1 */}
      {isDemoModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsDemoModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setIsDemoModalOpen(false)}>✕</button>

            {!demoSubmitted ? (
              <>
                <div className={styles.modalHeader}>
                  <span className={styles.modalPre}>{t.modal_pre}</span>
                  <h3>{t.modal_title}</h3>
                  <p>{t.modal_sub}</p>
                </div>

                <form onSubmit={handleDemoSubmit} className={styles.demoForm}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>{t.modal_nombre}</label>
                      <input
                        type="text"
                        required
                        placeholder={t.modal_nombre_ph}
                        value={demoForm.nombre}
                        onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t.modal_email}</label>
                      <input
                        type="email"
                        required
                        placeholder="carlos@empresa.com"
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>{t.modal_empresa}</label>
                      <input
                        type="text"
                        required
                        placeholder={t.modal_empresa_ph}
                        value={demoForm.empresa}
                        onChange={(e) => setDemoForm({ ...demoForm, empresa: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t.modal_tel}</label>
                      <input
                        type="tel"
                        required
                        placeholder="+51 987 654 321"
                        value={demoForm.telefono}
                        onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>{t.modal_vol}</label>
                    <select
                      value={demoForm.volumen}
                      onChange={(e) => setDemoForm({ ...demoForm, volumen: e.target.value })}
                    >
                      <option value="Menos de S/ 50,000">Menos de S/ 50,000 / mes</option>
                      <option value="S/ 50,000 - S/ 200,000">S/ 50,000 a S/ 200,000 / mes</option>
                      <option value="S/ 200,000 - S/ 1,000,000">S/ 200,000 a S/ 1,000,000 / mes</option>
                      <option value="Más de S/ 1,000,000">Más de S/ 1,000,000 / mes</option>
                    </select>
                  </div>

                  <button type="submit" className={styles.btnSubmitDemo}>
                    {t.modal_submit}
                  </button>
                  <span className={styles.formDisclaimer} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconLock size={13} /> {t.modal_priv}
                  </span>
                </form>
              </>
            ) : (
              <div className={styles.modalSuccess}>
                <div className={styles.successIcon}>✓</div>
                <h3>{t.modal_ok}</h3>
                <p>
                  {t.modal_ok_p1} <strong>{demoForm.nombre}</strong>. {t.modal_ok_p2} <strong>{demoForm.email}</strong> {t.modal_ok_p3} <strong>{demoForm.telefono}</strong> {t.modal_ok_p4}
                </p>
                <div className={styles.successDetails}>
                  <span>{t.modal_company} <strong>{demoForm.empresa}</strong></span>
                  <span>{t.modal_range} <strong>{demoForm.volumen}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <Link href="/overview" className={styles.btnPrimaryCta} style={{ flex: 1, textAlign: 'center' }}>
                    {t.modal_dashboard}
                  </Link>
                  <button className={styles.btnSecondaryCta} onClick={() => { setIsDemoModalOpen(false); setDemoSubmitted(false); }}>
                    {t.modal_close}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
