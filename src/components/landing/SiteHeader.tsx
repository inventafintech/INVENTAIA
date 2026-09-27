'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Moon, Sun, Menu, X } from 'lucide-react';
import type { LandingCopy, LandingLang } from '@/lib/landingCopy';
import styles from './AccessLanding.module.css';

interface SiteHeaderProps {
  t: LandingCopy;
  lang: LandingLang;
  onToggleLang: () => void;
  /** La cabecera vive sobre el landing: el tema es local a la página. */
  light: boolean;
  onToggleTheme: () => void;
  isAuthenticated: boolean;
}

function CaretIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5L6 8.5L10 4.5" />
    </svg>
  );
}

type MenuId = 'plataforma' | 'soluciones' | null;

/**
 * Cabecera del landing: isotipo + badge, navegación con menús reales,
 * píldora de idioma, alternador de tema del landing y CTA.
 */
export function SiteHeader({ t, lang, onToggleLang, light, onToggleTheme, isAuthenticated }: SiteHeaderProps) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenu]);

  const toggleMenu = (id: Exclude<MenuId, null>) =>
    setOpenMenu((prev) => (prev === id ? null : id));

  const plataformaItems = [
    { href: '/login', title: t.nav_login, desc: t.acc_sub },
    { href: '/dashboard', title: t.nav_dashboard, desc: t.acc_eyebrow },
    { href: '/plans', title: t.nav_precios, desc: t.hero_trust2 },
  ];

  const solucionesItems = [
    { href: '/ayuda/guia', title: t.nav_guide, desc: t.acc_tagline },
    { href: '/ayuda/aprender', title: t.nav_learn, desc: t.hero_cta_how },
    { href: '/ayuda/soporte', title: t.acc_support, desc: t.modal_sub },
  ];

  return (
    <header className={styles.siteHeader}>
      <div className={styles.siteHeaderInner}>
        <nav className={styles.siteNav} aria-label="Principal">
          <div className={styles.navItemWrap} onMouseLeave={() => setOpenMenu(null)}>
            <button
              type="button"
              className={styles.navButton}
              aria-expanded={openMenu === 'plataforma'}
              aria-haspopup="true"
              onClick={() => toggleMenu('plataforma')}
            >
              {t.nav_plataforma}
              <CaretIcon />
            </button>
            {openMenu === 'plataforma' && (
              <div className={styles.navMenu} role="menu">
                {plataformaItems.map((item) => (
                  <Link key={item.href} href={item.href} className={styles.navMenuLink} role="menuitem" onClick={() => setOpenMenu(null)}>
                    <span className={styles.navMenuTitle}>{item.title}</span>
                    <span className={styles.navMenuDesc}>{item.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={styles.navItemWrap} onMouseLeave={() => setOpenMenu(null)}>
            <button
              type="button"
              className={styles.navButton}
              aria-expanded={openMenu === 'soluciones'}
              aria-haspopup="true"
              onClick={() => toggleMenu('soluciones')}
            >
              {t.nav_soluciones}
              <CaretIcon />
            </button>
            {openMenu === 'soluciones' && (
              <div className={styles.navMenu} role="menu">
                {solucionesItems.map((item) => (
                  <Link key={item.href} href={item.href} className={styles.navMenuLink} role="menuitem" onClick={() => setOpenMenu(null)}>
                    <span className={styles.navMenuTitle}>{item.title}</span>
                    <span className={styles.navMenuDesc}>{item.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/plans" className={styles.navLink}>
            {t.nav_precios}
          </Link>
          <Link href="/ayuda/aprender" className={styles.navLink}>
            {t.nav_recursos}
          </Link>
        </nav>

        <div className={styles.siteActions}>
          <button
            type="button"
            className={styles.pill}
            aria-label={t.nav_lang_label}
            onClick={onToggleLang}
          >
            <Globe size={13} aria-hidden="true" />
            <span>{lang === 'es' ? t.acc_lang_es : t.acc_lang_en}</span>
            <CaretIcon />
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.themeBtn}`}
            aria-label={light ? 'Tema oscuro' : 'Tema claro'}
            onClick={onToggleTheme}
          >
            {light ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
          </button>

          {isAuthenticated ? (
            <Link href="/dashboard" className={styles.ctaAmber}>
              {t.nav_dashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.loginLink}>
                {t.nav_login}
              </Link>
              <Link href="/login" className={styles.ctaAmber}>
                {t.nav_trial}
              </Link>
            </>
          )}

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.menuButton}`}
            aria-label="Menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={styles.mobilePanel}>
          <Link href="/login" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            {t.nav_plataforma}
          </Link>
          <Link href="/dashboard" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            {t.nav_dashboard}
          </Link>
          <Link href="/plans" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            {t.nav_precios}
          </Link>
          <Link href="/ayuda/guia" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            {t.nav_guide}
          </Link>
          <Link href="/ayuda/soporte" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            {t.acc_support}
          </Link>
          <div className={styles.mobileCtaRow}>
            <button type="button" className={styles.pill} onClick={onToggleLang}>
              <Globe size={13} aria-hidden="true" />
              <span>{lang === 'es' ? t.acc_lang_es : t.acc_lang_en}</span>
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={light ? 'Tema oscuro' : 'Tema claro'}
              onClick={onToggleTheme}
            >
              {light ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
            </button>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.ctaAmber} onClick={() => setMobileOpen(false)}>
                {t.nav_dashboard}
              </Link>
            ) : (
              <Link href="/login" className={styles.ctaAmber} onClick={() => setMobileOpen(false)}>
                {t.nav_trial}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default SiteHeader;
