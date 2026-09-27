import styles from './AccessLanding.module.css';

/** Niveles de llenado por estante del motivo SVG (0-1), de arriba hacia abajo. */
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

/**
 * Motivo del panel de marca: una rack de bins con distintos niveles, una
 * unidad viajando entre dos almacenes y el lector de conteo. Es la escena que
 * resume el producto — stock, transferencias y niveles — y sus tres
 * animaciones cuentan esa misma historia.
 */
export function WarehouseMotif() {
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

export default WarehouseMotif;
