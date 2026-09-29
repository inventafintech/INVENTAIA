'use client';

import styles from '@/app/dashboard/inventario/page.module.css';

const COURSES = [
  {
    category: 'MÉTRICAS CLAVE',
    title: 'Cómo calcular y maximizar el GMROI en retail',
    desc: 'El Gross Margin Return on Investment mide cuántos soles de margen bruto genera cada sol invertido en inventario. Descubre cómo identificar qué SKUs están financiando tu operación.',
    readTime: '5 min de lectura',
  },
  {
    category: 'GESTIÓN DE STOCK',
    title: 'Fórmula de Stock de Seguridad & Variabilidad de Demanda',
    desc: 'Aprende a calibrar el factor Z y la desviación estándar de tus ventas semanales para calcular un stock de seguridad que proteja tus ventas sin estancar capital de trabajo.',
    readTime: '7 min de lectura',
  },
  {
    category: 'LOGÍSTICA JIT',
    title: 'Cálculo del Punto de Reorden (ROP) con Lead Time Variable',
    desc: 'Cómo programar órdenes de compra antes de que ocurra un quiebre de stock considerando demoras de aduanas y tiempos de entrega de tus proveedores principales.',
    readTime: '6 min de lectura',
  },
  {
    category: 'FINANZAS B2B',
    title: 'Estrategias de Financiamiento Rotativo para Compras al por Mayor',
    desc: 'Aprovecha descuentos por pronto pago o volumen utilizando líneas de crédito revolvente bancarias sin afectar tu flujo de caja operativo.',
    readTime: '4 min de lectura',
  },
];

export default function AprenderPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Centro de Aprendizaje & Académico</h1>
          <p className={styles.subtitle}>
            Mejores prácticas internacionales en supply chain, optimización de capital de trabajo y analítica predictiva.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {COURSES.map((course, idx) => (
          <div key={idx} className={styles.tableCard} style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-forest-ink)', letterSpacing: '0.05em' }}>
                {course.category}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: '8px 0', lineHeight: 1.3 }}>
                {course.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.6 }}>
                {course.desc}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-fog)', paddingTop: '12px', fontSize: '12px', color: 'var(--color-slate)' }}>
              <span>{course.readTime}</span>
              <span style={{ color: 'var(--color-obsidian)', fontWeight: 600 }}>Leer artículo →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
