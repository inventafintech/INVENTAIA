import styles from './page.module.css';

export default function PredictivaPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Motor de Pronóstico</h1>
          <p className={styles.subtitle}>
            Modelo de series temporales ajustado por tendencia, estacionalidad y lead time.
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.statusBadge}>
            <span className={styles.pulse}></span>
            Modelo Activo
          </div>
          <button className={styles.btnSecondary}>Exportar CSV</button>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.controls}>
          <select className={styles.select}>
            <option>Aceite Primor Premium 1L</option>
            <option>Arroz Costeño 5kg</option>
            <option>Azúcar Rubia Cartavio 1kg</option>
          </select>

          <div className={styles.segmentedControl}>
            <button className={`${styles.segment} ${styles.segmentActive}`}>30d</button>
            <button className={styles.segment}>60d</button>
            <button className={styles.segment}>90d</button>
            <button className={styles.segment}>180d</button>
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <div className={styles.yAxis}>
            <span>150</span>
            <span>120</span>
            <span>90</span>
            <span>60</span>
            <span>30</span>
            <span>0</span>
          </div>
          
          <div className={styles.chartArea}>
            {/* Grid Lines */}
            <div className={styles.gridLines}>
              <div></div><div></div><div></div><div></div><div></div>
            </div>

            {/* SVG Chart for crisp rendering */}
            <svg className={styles.svgChart} viewBox="0 0 1000 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="historicalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Historical Area (Left half) */}
              <path 
                d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150 L 500 300 L 0 300 Z" 
                fill="url(#historicalFill)" 
              />
              {/* Historical Line */}
              <path 
                d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150" 
                fill="none" 
                stroke="var(--muted)" 
                strokeWidth="3" 
                strokeDasharray="6 6"
              />

              {/* Forecast Area (Right half) */}
              <path 
                d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90 L 1000 300 L 500 300 Z" 
                fill="url(#forecastFill)" 
              />
              {/* Forecast Line */}
              <path 
                d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90" 
                fill="none" 
                stroke="var(--accent)" 
                strokeWidth="4" 
              />

              {/* Vertical Divider (Today) */}
              <line x1="500" y1="0" x2="500" y2="300" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="460" y="10" width="80" height="24" rx="12" fill="var(--primary)" />
              <text x="500" y="26" fill="var(--bg)" fontSize="12" fontWeight="600" textAnchor="middle">HOY</text>
            </svg>
            
            {/* X Axis Labels */}
            <div className={styles.xAxis}>
              <span>09-01</span>
              <span>09-08</span>
              <span>09-15</span>
              <span>09-22</span>
              <span className={styles.forecastDate}>09-29</span>
              <span className={styles.forecastDate}>10-06</span>
              <span className={styles.forecastDate}>10-13</span>
              <span className={styles.forecastDate}>10-20</span>
            </div>
          </div>
        </div>

        <div className={styles.insightsBox}>
          <h3 className={styles.insightsTitle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            ¿Por qué predecimos 2,819u en 30 días para Aceite Primor Premium 1L?
          </h3>
          <p className={styles.insightsText}>
            El algoritmo proyecta una <strong>media base de 94.0u/día</strong> ajustada por un <strong>factor de tendencia (+33.5%)</strong> detectado en el último trimestre. 
            Se aplican multiplicadores de estacionalidad por fin de mes (1.28x) y quincena (1.18x). 
            <br/><br/>
            Considerando un <strong>Lead Time de 4 días</strong> del proveedor Alicorp y una volatilidad (CV) del 18%, el <strong>Safety Stock se fijó en 56u</strong>, estableciendo el <strong>Punto de Reorden (ROP) en 432u</strong>. Tu cobertura actual caerá a niveles críticos en 1.9 días.
          </p>
        </div>
      </div>
    </div>
  );
}
