import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <header className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>INVENTA.AI</div>
          <div className={styles.links}>
            <Link href="#producto">Producto</Link>
            <Link href="#roi">ROI</Link>
            <Link href="#casos">Casos de Uso</Link>
          </div>
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.btnSecondary}>
              Ver cómo funciona
            </Link>
            <button className={styles.btnPrimary}>
              Solicitar Demo
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Motor Predictivo 180 días + Financiamiento
          </div>
          <h1 className={styles.title}>
            El Cerebro de Compras para tu Empresa
          </h1>
          <p className={styles.subtitle}>
            Anticipa la demanda, evita quiebres de stock y financia inventario con inteligencia predictiva. No más capital inmovilizado.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.btnPrimaryLarge}>Solicitar Demo</button>
            <Link href="/dashboard" className={styles.btnSecondaryLarge}>
              Ver cómo funciona
            </Link>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>S/ 48,600</span>
              <span className={styles.metricLabel}>Ahorro Generado (30d)</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>-42%</span>
              <span className={styles.metricLabel}>Inventario Muerto</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>94.5%</span>
              <span className={styles.metricLabel}>Precisión de Forecast</span>
            </div>
          </div>
        </section>

        <section className={styles.trust}>
          <p className={styles.trustLabel}>CONFIANZA EMPRESARIAL. INTEGRACIÓN NATIVA CON:</p>
          <div className={styles.logos}>
            <span>Amazon Business</span>
            <span>Shopify Plus</span>
            <span>Mercado Libre</span>
            <span>SAP</span>
          </div>
        </section>
      </main>
    </div>
  );
}
