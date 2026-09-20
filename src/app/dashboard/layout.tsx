import Link from 'next/link';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>I.AI</div>
          <span className={styles.company}>Distribuidora San Martín</span>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
            Centro de Control
          </Link>
          <Link href="/dashboard/inventario" className={styles.navItem}>
            Inventario & Riesgo
          </Link>
          <Link href="/dashboard/compras" className={styles.navItem}>
            Órdenes de Compra
          </Link>
          <Link href="/dashboard/financiamiento" className={styles.navItem}>
            Capital & Financiamiento
          </Link>
          <Link href="/dashboard/proveedores" className={styles.navItem}>
            Proveedores
          </Link>
        </nav>
        
        <div className={styles.bottomNav}>
          <button className={styles.navItem}>Ajustes</button>
          <button className={styles.navItem}>Cerrar Sesión</button>
        </div>
      </aside>
      
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>Resumen Ejecutivo</div>
          <div className={styles.userMenu}>
            <span className={styles.status}>
              <span className={styles.statusDot}></span>
              Sincronizado hace 2m (Shopify)
            </span>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
