import styles from './page.module.css';

export default function AnalyticsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inteligencia & Analytics Operacional</h1>
          <p className={styles.subtitle}>
            Métricas de precisión algorítmica, retorno de capital inmovilizado y tasa de quiebre prevenida.
          </p>
        </div>
      </header>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Precisión del Algoritmo</span>
          <span className={styles.kpiValue}>94.5%</span>
          <span className={styles.kpiTrend}>+2.3% vs mes anterior (MAPE: 5.5%)</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Ahorro Generado (30d)</span>
          <span className={styles.kpiValue}>S/ 48,600</span>
          <span className={styles.kpiTrend}>Por consolidación y anticipación</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Inventario Muerto</span>
          <span className={styles.kpiValue}>-42%</span>
          <span className={styles.kpiTrend}>Liberación de capital estancado</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Quiebres Prevenidos</span>
          <span className={styles.kpiValue}>18 SKUs</span>
          <span className={styles.kpiTrend}>100% stockout mitigado</span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Evolución de Precisión de Forecast vs Demanda Real (6 meses)</h2>
          
          <svg className={styles.chartSvg} viewBox="0 0 600 200">
            <defs>
              <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="50" x2="600" y2="50" stroke="var(--line)" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="600" y2="100" stroke="var(--line)" strokeDasharray="3 3" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="var(--line)" strokeDasharray="3 3" />

            {/* Area */}
            <path 
              d="M 50 140 L 150 120 L 250 90 L 350 70 L 450 60 L 550 40 L 550 180 L 50 180 Z" 
              fill="url(#analyticsGradient)" 
            />

            {/* Line */}
            <path 
              d="M 50 140 L 150 120 L 250 90 L 350 70 L 450 60 L 550 40" 
              fill="none" 
              stroke="var(--accent)" 
              strokeWidth="3" 
            />

            {/* Points */}
            <circle cx="50" cy="140" r="4" fill="var(--accent)" />
            <circle cx="150" cy="120" r="4" fill="var(--accent)" />
            <circle cx="250" cy="90" r="4" fill="var(--accent)" />
            <circle cx="350" cy="70" r="4" fill="var(--accent)" />
            <circle cx="450" cy="60" r="4" fill="var(--accent)" />
            <circle cx="550" cy="40" r="5" fill="var(--primary)" />

            {/* Labels */}
            <text x="50" y="195" fill="var(--muted)" fontSize="11" textAnchor="middle">Mayo (88%)</text>
            <text x="150" y="195" fill="var(--muted)" fontSize="11" textAnchor="middle">Junio (89%)</text>
            <text x="250" y="195" fill="var(--muted)" fontSize="11" textAnchor="middle">Julio (91%)</text>
            <text x="350" y="195" fill="var(--muted)" fontSize="11" textAnchor="middle">Ago (93%)</text>
            <text x="450" y="195" fill="var(--muted)" fontSize="11" textAnchor="middle">Sep (94%)</text>
            <text x="550" y="195" fill="var(--ink)" fontWeight="700" fontSize="11" textAnchor="middle">Oct (94.5%)</text>
          </svg>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Precisión por Categoría</h2>
          
          <div className={styles.breakdownList}>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownHeader}>
                <span>Abarrotes & Consumo</span>
                <strong>96.2%</strong>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '96.2%' }}></div>
              </div>
            </div>

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownHeader}>
                <span>Bebidas & Licores</span>
                <strong>94.8%</strong>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '94.8%' }}></div>
              </div>
            </div>

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownHeader}>
                <span>Materiales Construcción</span>
                <strong>93.1%</strong>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '93.1%' }}></div>
              </div>
            </div>

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownHeader}>
                <span>Lácteos & Refrigerados</span>
                <strong>91.4%</strong>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '91.4%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
