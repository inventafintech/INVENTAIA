import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { WarehouseMotif } from './WarehouseMotif';
import styles from './AccessLanding.module.css';

export interface AccessFooterLink {
  href: string;
  label: string;
}

interface AccessLandingProps {
  /** Tagline mono junto al isotipo, p. ej. "Inventario, pronóstico, …". */
  tagline: string;
  /** Titular grande del panel de marca. */
  headline: React.ReactNode;
  /** Párrafo bajo el titular. */
  description: React.ReactNode;
  /** Rail de módulos en mayúsculas mono. */
  capabilities: string[];
  /** Slot superior derecho (selector de idioma, ayuda, …). */
  topbar: React.ReactNode;
  /** Eyebrow mono sobre el título ("Plataforma de operaciones"). */
  eyebrow: string;
  /** Tiñe el eyebrow de error cuando hay alerta visible. */
  eyebrowError?: boolean;
  /** Título de la tarjeta ("Iniciar sesión"). */
  title: string;
  /** Subtítulo de la tarjeta. */
  subtitle: React.ReactNode;
  /** Alerta opcional entre el subtítulo y el cuerpo. */
  alert?: React.ReactNode;
  /** Cuerpo de la tarjeta (botones, divisores, …). */
  children: React.ReactNode;
  /** Línea legal bajo el cuerpo (términos, prueba gratis, …). */
  footerNote?: React.ReactNode;
  /** Texto inferior izquierdo ("INVENTA.AI Operaciones"). */
  footerLeft: string;
  footerLinks: AccessFooterLink[];
  /** Variante clara del landing (oscuro por defecto, como la referencia). */
  light?: boolean;
  /** Rellena el alto restante cuando vive bajo una cabecera. */
  fill?: boolean;
}

/**
 * Pantalla de acceso de dos columnas y tema oscuro fijo: panel de marca a la
 * izquierda (isotipo, motivo SVG animado, propuesta de valor) y tarjeta de
 * acceso a la derecha. Es standalone — no sigue el tema claro/oscuro de la
 * app, siempre se ve igual.
 */
export function AccessLanding({
  tagline,
  headline,
  description,
  capabilities,
  topbar,
  eyebrow,
  eyebrowError = false,
  title,
  subtitle,
  alert,
  children,
  footerNote,
  footerLeft,
  footerLinks,
  light = false,
  fill = false,
}: AccessLandingProps) {
  const pageClass = [styles.page, light ? styles.pageLight : '', fill ? styles.pageFill : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={pageClass}>
      {/* ------------------------------------------- panel de marca */}
      <aside className={styles.brandSide}>
        <div className={styles.brandMark}>
          <Logo height={26} tone={light ? 'light' : 'dark'} />
          <span className={styles.brandRule} aria-hidden="true" />
          <span className={styles.tagline}>{tagline}</span>
        </div>

        <WarehouseMotif />

        <div className={styles.brandCopy}>
          <h2 className={styles.brandH2}>{headline}</h2>
          <p className={styles.brandP}>{description}</p>
          <div className={styles.brandRail}>
            {capabilities.map((capability) => (
              <span key={capability}>{capability}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* --------------------------------------------- panel de acceso */}
      <main className={styles.formSide}>
        <div className={styles.topbar}>{topbar}</div>

        <div className={styles.formWrap}>
          <div className={styles.card}>
            <div className={eyebrowError ? `${styles.eyebrow} ${styles.eyebrowError}` : styles.eyebrow}>
              {eyebrow}
            </div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>

            {alert}

            {children}

            {footerNote && <p className={styles.aside}>{footerNote}</p>}
          </div>
        </div>

        <div className={styles.footer}>
          <span>{footerLeft}</span>
          <span className={styles.footerLinks}>
            {footerLinks.map((link) => (
              <Link key={link.href + link.label} href={link.href} className={styles.footerLink}>
                {link.label}
              </Link>
            ))}
          </span>
        </div>
      </main>
    </div>
  );
}

export default AccessLanding;
