import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      
      {/* Módulos de Alto Impacto (Top Level) */}
      <div className={styles.gridTop}>
        <div className={`${styles.card} ${styles.alertCard}`}>
          <div className={styles.cardHeader}>
            <h3>1. Riesgo de Quiebre</h3>
            <span className={styles.badgeAlert}>Crítico</span>
          </div>
          <div className={styles.cardValue}>12 SKUs</div>
          <p className={styles.cardSub}>S/ 45,200 en ventas en riesgo (próximos 7 días)</p>
          <button className={styles.btnAction}>Ver detalles</button>
        </div>

        <div className={`${styles.card} ${styles.warnCard}`}>
          <div className={styles.cardHeader}>
            <h3>2. Inventario Inmovilizado</h3>
            <span className={styles.badgeWarn}>Atención</span>
          </div>
          <div className={styles.cardValue}>S/ 128,400</div>
          <p className={styles.cardSub}>+15% vs mes anterior (Capital estancado &gt; 90d)</p>
          <button className={styles.btnActionSecondary}>Liquidar stock</button>
        </div>

        <div className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.cardHeader}>
            <h3>3. Compras Recomendadas</h3>
            <span className={styles.badgeSuccess}>Óptimo</span>
          </div>
          <div className={styles.cardValue}>5 Órdenes</div>
          <p className={styles.cardSub}>Para cubrir forecast de 30 días (Confianza: 94%)</p>
          <button className={styles.btnAction}>Aprobar con 1-clic</button>
        </div>
      </div>

      {/* Módulos Financieros */}
      <div className={styles.gridMid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>4. Capital Requerido</h3>
            <span className={styles.badgeNeutral}>30 días</span>
          </div>
          <div className={styles.cardValue}>S/ 85,000</div>
          <div className={styles.progressBar}><div className={styles.progressFill} style={{width: '65%'}}></div></div>
          <p className={styles.cardSub}>Para ejecutar compras recomendadas</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>5. Financiamiento Disponible</h3>
            <span className={styles.badgeNeutral}>Aprobado</span>
          </div>
          <div className={styles.cardValue}>S/ 150,000</div>
          <p className={styles.cardSub}>Tasa: 1.45% mensual • Línea activa Pichincha</p>
          <button className={styles.btnActionSecondary}>Usar línea</button>
        </div>
      </div>

      {/* Módulos Analíticos Avanzados */}
      <div className={styles.gridBottom}>
        <div className={`${styles.card} ${styles.span2}`}>
          <div className={styles.cardHeader}>
            <h3>6. Forecast de 90 días</h3>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartBars}>
              <div className={styles.bar} style={{height: '40%'}}><span>Oct</span></div>
              <div className={styles.bar} style={{height: '65%'}}><span>Nov</span></div>
              <div className={styles.bar} style={{height: '90%'}}><span>Dic</span></div>
            </div>
          </div>
          <p className={styles.cardSub}>Proyección ajustada por estacionalidad y campañas Q4.</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>7. Rentabilidad por SKU</h3>
          </div>
          <ul className={styles.list}>
            <li>
              <span>Aceite Primor 1L</span>
              <span className={styles.positive}>32% GMROI</span>
            </li>
            <li>
              <span>Arroz Costeño 5kg</span>
              <span className={styles.positive}>28% GMROI</span>
            </li>
            <li>
              <span>Azúcar Cartavio</span>
              <span className={styles.negative}>8% GMROI</span>
            </li>
          </ul>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>8. Proveedores Críticos</h3>
          </div>
          <ul className={styles.list}>
            <li>
              <span>Alicorp (Lim)</span>
              <span className={styles.neutral}>Lead: 4 días</span>
            </li>
            <li>
              <span>Gloria (Aqp)</span>
              <span className={styles.warning}>Lead: 12 días</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
