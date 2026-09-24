import styles from './Logo.module.css';

export interface LogoProps {
  /** `full`: isotipo + INVENTA.AI · `mark`: solo isotipo (sidebar colapsado, favicon) */
  variant?: 'full' | 'mark';
  /**
   * `auto`: responde al tema global [data-theme].
   * `light`: fuerza colores para fondos claros · `dark`: para fondos oscuros.
   */
  tone?: 'auto' | 'light' | 'dark';
  /** Alto en px (el ancho se deriva del viewBox para no deformar). */
  height?: number;
  /** Ancho en px (solo si se quiere forzar; por defecto responde a `height`). */
  width?: number;
  className?: string;
  title?: string;
}

/**
 * Logotipo oficial INVENTA.AI como SVG en línea (cero imágenes, cero red).
 * Server Component: sin JS de cliente, sin FOUC, SEO-friendly.
 *
 * - Isotipo: 3 barras verticales ascendentes en índigo vibrante.
 * - INVENTA: Inter extrabold, azul marino profundo (blanco en dark mode).
 * - .AI: índigo vibrante, peso medio.
 */
export function Logo({ variant = 'full', tone = 'auto', height = 28, width, className = '', title = 'INVENTA.AI' }: LogoProps) {
  const toneClass = tone === 'dark' ? styles.toneDark : tone === 'light' ? styles.toneLight : '';
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 64 64"
        height={height}
        width={width}
        className={`${styles.logo} ${toneClass} ${className}`}
        role="img"
        aria-label={title}
      >
        {title && <title>{title}</title>}
        <rect x="8" y="34" width="12" height="20" className={styles.accent} />
        <rect x="26" y="22" width="12" height="32" className={styles.accent} />
        <rect x="44" y="10" width="12" height="44" className={styles.accent} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 300 64"
      height={height}
      width={width}
      className={`${styles.logo} ${toneClass} ${className}`}
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {/* Isotipo: barras ascendentes */}
      <rect x="6" y="34" width="11" height="18" className={styles.accent} />
      <rect x="24" y="24" width="11" height="28" className={styles.accent} />
      <rect x="42" y="12" width="11" height="40" className={styles.accent} />
      {/* Logotipo tipográfico */}
      <text
        x="64"
        y="50"
        className={styles.wordmark}
        fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="35"
        fontWeight={800}
        letterSpacing="0.5"
      >
        <tspan className={styles.ink}>INVENTA</tspan>
        <tspan className={styles.accentText} fontWeight={500}>
          .AI
        </tspan>
      </text>
    </svg>
  );
}

export default Logo;
