'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState<'30d' | '60d' | '180d'>('60d');
  
  // Demo Form State
  const [demoForm, setDemoForm] = useState({
    nombre: '',
    email: '',
    empresa: '',
    telefono: '',
    volumen: 'S/ 50,000 - S/ 200,000'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <div className={styles.container}>
      {/* 1. Navigation Bar - Refactorizado con jerarquía clara y limpia */}
      <header className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logoGroup}>
            <Link href="/" className={styles.logo}>
              INVENTA<span className={styles.logoAccent}>.AI</span>
            </Link>
            <span className={styles.tagEnterprise}>Enterprise B2B</span>
          </div>

          {/* Enlaces de navegación centrados/izquierdos */}
          <nav className={styles.links}>
            <a href="#problema">El Desafío</a>
            <a href="#soluciones">Solución</a>
            <a href="#roi">Prueba de ROI</a>
            <a href="#tecnologia">Infraestructura</a>
            <a href="#casos">Casos de Éxito</a>
          </nav>

          {/* Extremo derecho: EXACTAMENTE DOS ELEMENTOS */}
          <div className={styles.actions}>
            <Link href="/login" className={styles.navLoginLink}>
              Iniciar Sesión
            </Link>
            <button 
              className={styles.btnPrimaryNav} 
              onClick={() => setIsDemoModalOpen(true)}
            >
              Solicitar Demo
            </button>
          </div>

          {/* Botón menú hamburguesa en móvil */}
          <button 
            className={styles.hamburgerBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú principal"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Menú desplegable en móvil */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNavLinks}>
              <a href="#problema" onClick={() => setMobileMenuOpen(false)}>El Desafío</a>
              <a href="#soluciones" onClick={() => setMobileMenuOpen(false)}>Solución</a>
              <a href="#roi" onClick={() => setMobileMenuOpen(false)}>Prueba de ROI</a>
              <a href="#tecnologia" onClick={() => setMobileMenuOpen(false)}>Infraestructura</a>
              <a href="#casos" onClick={() => setMobileMenuOpen(false)}>Casos de Éxito</a>
            </nav>
            <div className={styles.mobileMenuDivider} />
            <div className={styles.mobileMenuActions}>
              <Link href="/login" className={styles.mobileLoginLink} onClick={() => setMobileMenuOpen(false)}>
                Iniciar Sesión
              </Link>
              <button 
                className={styles.btnPrimaryNav} 
                onClick={() => { setMobileMenuOpen(false); setIsDemoModalOpen(true); }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Solicitar Demo
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={styles.main}>
        {/* 2. Hero Section (Primer Pantallazo con Alta Jerarquía) */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDotPulse} />
            <span>Motor Predictivo 180 días · Compras B2B · Financiamiento Activo</span>
          </div>

          <h1 className={styles.title}>
            El Cerebro de Compras para tu Empresa
          </h1>

          <p className={styles.subtitle}>
            Anticipa la demanda con <strong>94.5% de precisión</strong>, automatiza órdenes de reabastecimiento antes del quiebre y financia inventario sin inmovilizar capital de trabajo.
          </p>

          <div className={styles.heroCtaBlock}>
            <div className={styles.heroActions}>
              <button 
                className={styles.btnPrimaryCta} 
                onClick={() => setIsDemoModalOpen(true)}
              >
                Solicitar Demo 1:1
              </button>
              <Link href="/dashboard" className={styles.btnSecondaryCta}>
                Explorar Dashboard en Vivo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <p className={styles.microCopy}>
              ✓ Sin compromiso · Agenda tu demo personalizada en 15 min · Implementación en 14 días
            </p>
          </div>

          {/* 3. Señales de Confianza Inmediatas (Intercalada antes del mockup) */}
          <div className={styles.heroTrustBar}>
            <span className={styles.heroTrustLabel}>
              CONECTIVIDAD EMPRESARIAL VERIFICADA CON LÍDERES EN COMERCIO, ERP Y NUBE B2B:
            </span>
            <div className={styles.heroTrustLogos}>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>SAP</span>
                <span className={styles.trustLogoLight}>S/4HANA</span>
              </div>
              <span className={styles.heroTrustDivider}>·</span>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>Mercado</span>
                <span className={styles.trustLogoLight}>Libre</span>
              </div>
              <span className={styles.heroTrustDivider}>·</span>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>Shopify</span>
                <span className={styles.trustLogoTag}>Plus</span>
              </div>
              <span className={styles.heroTrustDivider}>·</span>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>Amazon</span>
                <span className={styles.trustLogoLight}>Business</span>
              </div>
              <span className={styles.heroTrustDivider}>·</span>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>AWS</span>
                <span className={styles.trustLogoLight}>Cloud</span>
              </div>
              <span className={styles.heroTrustDivider}>·</span>
              <div className={styles.heroTrustItem}>
                <span className={styles.trustLogoBold}>Banco</span>
                <span className={styles.trustLogoLight}>Pichincha B2B</span>
              </div>
            </div>
          </div>

          {/* Real AI Dashboard Preview (Visual IA en Acción) */}
          <div className={styles.dashboardVisualWrapper}>
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardHeader}>
                <div className={styles.dashboardHeaderLeft}>
                  <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    <span>MOTOR PREDICTIVO EN VIVO</span>
                  </div>
                  <h3 className={styles.skuTitle}>Aceite Vegetal Primor 1L · SKU-ALI-001</h3>
                  <span className={styles.skuSub}>Almacén Central Callao · Proveedor: Alicorp S.A.A.</span>
                </div>

                <div className={styles.dashboardHeaderRight}>
                  <div className={styles.horizonSelector}>
                    <button 
                      className={`${styles.horizonBtn} ${forecastHorizon === '30d' ? styles.horizonBtnActive : ''}`}
                      onClick={() => setForecastHorizon('30d')}
                    >
                      30 días
                    </button>
                    <button 
                      className={`${styles.horizonBtn} ${forecastHorizon === '60d' ? styles.horizonBtnActive : ''}`}
                      onClick={() => setForecastHorizon('60d')}
                    >
                      60 días
                    </button>
                    <button 
                      className={`${styles.horizonBtn} ${forecastHorizon === '180d' ? styles.horizonBtnActive : ''}`}
                      onClick={() => setForecastHorizon('180d')}
                    >
                      180 días
                    </button>
                  </div>
                  <div className={styles.accuracyTag}>
                    <span>Exactitud Forecast:</span>
                    <strong>94.8%</strong>
                  </div>
                </div>
              </div>

              {/* Chart SVG Graphic */}
              <div className={styles.chartContainer}>
                <div className={styles.chartTelemetry}>
                  <div className={styles.telemetryItem}>
                    <span className={styles.telemetryLabel}>Stock Disponible</span>
                    <span className={styles.telemetryVal}>450 uds <small>(3.8 días)</small></span>
                    <span className={styles.telemetryStatusBad}>● Quiebre en 4 días</span>
                  </div>
                  <div className={styles.telemetryItem}>
                    <span className={styles.telemetryLabel}>Demanda Proyectada ({forecastHorizon})</span>
                    <span className={styles.telemetryVal}>
                      {forecastHorizon === '30d' ? '1,840 uds' : forecastHorizon === '60d' ? '3,620 uds' : '10,800 uds'}
                    </span>
                    <span className={styles.telemetryStatusOk}>+14% vs mes anterior</span>
                  </div>
                  <div className={styles.telemetryItem}>
                    <span className={styles.telemetryLabel}>Reorden Sugerido</span>
                    <span className={styles.telemetryVal}>1,200 uds</span>
                    <span className={styles.telemetryStatusBlue}>Ahorro PO: S/ 14,200</span>
                  </div>
                </div>

                {/* SVG Forecast Curve */}
                <div className={styles.svgWrapper}>
                  <svg viewBox="0 0 800 220" className={styles.forecastSvg} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="forecastAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="actualAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <line x1="0" y1="160" x2="800" y2="160" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                    {/* Historical Curve */}
                    <path 
                      d="M 0 170 Q 100 160 200 140 T 400 110 L 400 220 L 0 220 Z" 
                      fill="url(#actualAreaGrad)" 
                    />
                    <path 
                      d="M 0 170 Q 100 160 200 140 T 400 110" 
                      fill="none" 
                      stroke="#059669" 
                      strokeWidth="3" 
                    />

                    {/* Future Prediction Curve (with confidence cone) */}
                    <path 
                      d="M 400 110 Q 500 80 600 70 T 800 45 L 800 220 L 400 220 Z" 
                      fill="url(#forecastAreaGrad)" 
                    />
                    <path 
                      d="M 400 110 Q 500 80 600 70 T 800 45" 
                      fill="none" 
                      stroke="#2563eb" 
                      strokeWidth="3" 
                      strokeDasharray="6 4"
                    />

                    {/* Threshold Line (Safety Stock) */}
                    <line x1="0" y1="180" x2="800" y2="180" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 4" />

                    {/* Event Marker */}
                    <circle cx="400" cy="110" r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    <rect x="340" y="80" width="120" height="24" rx="4" fill="#0f172a" stroke="#334155" />
                    <text x="400" y="96" fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">HOY · Reordenar</text>
                  </svg>
                </div>

                <div className={styles.chartFoot}>
                  <span className={styles.chartLegend}><span style={{ color: '#059669' }}>―</span> Demanda Real Conciliada</span>
                  <span className={styles.chartLegend}><span style={{ color: '#2563eb' }}>┄</span> Forecast Predictivo IA (94.8% conf.)</span>
                  <span className={styles.chartLegend}><span style={{ color: '#dc2626' }}>┄</span> Stock Mínimo de Seguridad (Buffer)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Confianza Inmediata & Partners */}
        <section className={styles.trustSection}>
          <p className={styles.trustTitle}>
            CONECTIVIDAD OFICIAL & COMPATIBILIDAD EMPRESARIAL VERIFICADA
          </p>
          <div className={styles.trustLogosGrid}>
            <div className={styles.partnerChip}>
              <strong>SAP S/4HANA</strong>
              <span>OData v4 & RFC</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Shopify Plus</strong>
              <span>API Admin 2026</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Mercado Libre</strong>
              <span>OAuth 2.0 Oficial</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>Amazon Business</strong>
              <span>SP-API v2</span>
            </div>
            <div className={styles.partnerChip}>
              <strong>SUNAT / OSE</strong>
              <span>Facturas & GRE</span>
            </div>
          </div>

          <div className={styles.securityBadges}>
            <span className={styles.securityPill}>🛡️ SOC 2 Type II Compliant</span>
            <span className={styles.securityPill}>🔒 Cifrado AES-256 en Reposo</span>
            <span className={styles.securityPill}>⚡ 99.99% Uptime SLA</span>
            <span className={styles.securityPill}>☁️ Multi-Cloud AWS & GCP</span>
          </div>
        </section>

        {/* 4. El Costo del Problema (Rational Drowning) vs La Nueva Forma */}
        <section id="problema" className={styles.sectionDark}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>EL COSTO OCULTO DEL MODELO TRADICIONAL</span>
            <h2 className={styles.sectionTitle}>
              El 34% del capital de trabajo de una empresa queda atrapado en inventario inmóvil
            </h2>
            <p className={styles.sectionSubtitle}>
              Gestionar compras con intuición y tablas de Excel desactualizadas genera pérdidas silenciosas en quiebres de stock y sobrecostos financieros de almacenamiento.
            </p>
          </div>

          <div className={styles.comparisonGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemHeader}>
                <span className={styles.problemBadge}>El Riesgo Tradicional</span>
                <h3>Compras Reactivas en Excel</h3>
              </div>
              <ul className={styles.problemList}>
                <li>
                  <strong>Quiebres de stock imprevistos:</strong> Te enteras de que un producto clave se agotó cuando el cliente ya le compró a tu competidor.
                </li>
                <li>
                  <strong>Sobrestock y obsolescencia:</strong> Comprar lotes grandes para "aprovechar el precio" inmoviliza miles de soles en productos que no rotan.
                </li>
                <li>
                  <strong>Pérdida de poder de negociación:</strong> Comprar solo como empresa individual te obliga a aceptar los precios más altos del fabricante.
                </li>
                <li>
                  <strong>Desconexión con finanzas:</strong> El área de compras pide sin visibilidad de las líneas de crédito ni del flujo de caja proyectado.
                </li>
              </ul>
            </div>

            <div className={styles.solutionCard}>
              <div className={styles.solutionHeader}>
                <span className={styles.solutionBadge}>Con INVENTA.AI</span>
                <h3>Operación Autónoma & Predictiva</h3>
              </div>
              <ul className={styles.solutionList}>
                <li>
                  <strong>Forecast con 94.5% de exactitud:</strong> Algoritmos de Machine Learning anticipan la demanda a 30, 60 y 180 días considerando estacionalidad y tendencias.
                </li>
                <li>
                  <strong>Reabastecimiento Just-in-Time:</strong> Órdenes de compra generadas automáticamente en el momento exacto para no acumular inventario innecesario.
                </li>
                <li>
                  <strong>Poder de Compra Consolidada:</strong> Agrupación algorítmica de compras con otras empresas para acceder a descuentos por escala de hasta 18%.
                </li>
                <li>
                  <strong>Financiamiento de Inventario:</strong> Desbloqueo de líneas de crédito rotativas vinculadas directamente a la rotación de tus productos.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Sección de Beneficios & Características Específicas */}
        <section id="soluciones" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>PILIS TECNOLÓGICOS</span>
            <h2 className={styles.sectionTitle}>
              Tres módulos diseñados para maximizar tu rentabilidad
            </h2>
            <p className={styles.sectionSubtitle}>
              Una plataforma integral que une predicción de demanda, negociación de escala y liquidez inmediata para distribuidores y retailers.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </div>
              <h3>Pronóstico Automático de Demanda</h3>
              <p>
                Modelos de Deep Learning entrenados con tu histórico de ventas, estacionalidad, inflación y comportamiento de mercado. Genera predicciones precisas SKU por SKU a 30, 60 y 180 días.
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ Alertas de quiebre preventivas</span>
                <span>✓ Buffer de seguridad dinámico</span>
                <span>✓ Sugerencias de OC con 1 clic</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Compras Conjuntas (Consorcios B2B)</h3>
              <p>
                Unimos la demanda de múltiples distribuidores y PYMES para formar lotes de compra mayores. Accede a los precios y condiciones preferenciales que solo obtienen las corporaciones gigantes.
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ Hasta 18% ahorro en costo de producto</span>
                <span>✓ Negociación directa con fabricantes</span>
                <span>✓ Reducción de costos de flete</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
              <h3>Financiamiento de Inventarios</h3>
              <p>
                Líneas de crédito rotativas de capital de trabajo aprobadas en tiempo real en función de la rotación comprobada de tus SKUs y tus órdenes de compra en firme. Paga el inventario a medida que lo vendes.
              </p>
              <div className={styles.featureHighlight}>
                <span>✓ Evaluación crediticia con datos de venta</span>
                <span>✓ Plazos de 30 a 90 días</span>
                <span>✓ Cero trámites bancarios tradicionales</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Prueba de ROI & Caso de Estudio Real */}
        <section id="roi" className={styles.sectionDark}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>IMPACTO MEDIBLE Y COMPROBADO</span>
            <h2 className={styles.sectionTitle}>
              Retorno de inversión garantizado desde el primer mes
            </h2>
            <p className={styles.sectionSubtitle}>
              Métricas auditadas de empresas que reemplazaron hojas de cálculo por el motor de compras autónomo de INVENTA.AI.
            </p>
          </div>

          <div className={styles.roiMetricsGrid}>
            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>S/ 48,600</span>
              <span className={styles.roiTitle}>Ahorro Promedio Generado (30d)</span>
              <p className={styles.roiDesc}>
                Ahorro directo derivado de compras consolidadas, eliminación de fletes urgentes y optimización de capital inmovilizado.
              </p>
            </div>

            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>-42%</span>
              <span className={styles.roiTitle}>Inventario Muerto</span>
              <p className={styles.roiDesc}>
                Reducción de productos estancados en bodega gracias al rebalanceo preventivo y ajustes automáticos de lote económico.
              </p>
            </div>

            <div className={styles.roiMetricCard}>
              <span className={styles.roiValue}>94.5%</span>
              <span className={styles.roiTitle}>Precisión de Forecast</span>
              <p className={styles.roiDesc}>
                Exactitud comprobada frente a métodos basados en promedios móviles y hojas de cálculo (que promedian 61%).
              </p>
            </div>
          </div>

          {/* Case Study Card */}
          <div id="casos" className={styles.caseStudyBox}>
            <div className={styles.caseStudyContent}>
              <span className={styles.caseStudyTag}>CASO DE ÉXITO VERIFICADO</span>
              <h3 className={styles.caseStudyCompany}>Distribuidora San Martín S.A.C.</h3>
              <p className={styles.caseStudyCategory}>Distribución de Consumo Masivo · 1,200 SKUs · 4 Almacenes</p>
              <blockquote className={styles.caseStudyQuote}>
                &ldquo;Antes de INVENTA.AI perdíamos ventas todas las semanas por quiebres en nuestros 40 productos estrella, mientras teníamos S/ 300,000 atrapados en productos de baja rotación. En menos de 90 días redujimos los quiebres en 52% y liberamos S/ 120,000 en liquidez inmediata.&rdquo;
              </blockquote>
              <div className={styles.caseStudyAuthor}>
                <strong>Javier González</strong>
                <span>Director de Operaciones & Logística</span>
              </div>
            </div>
            <div className={styles.caseStudyStats}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>-52%</span>
                <span className={styles.statLabel}>Quiebres de Stock</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>S/ 120k</span>
                <span className={styles.statLabel}>Liquidez Liberada</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>14 días</span>
                <span className={styles.statLabel}>Tiempo de Adopción</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Credibilidad Técnica e Integraciones (Para CTOs, COOs e Inversores) */}
        <section id="tecnologia" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPre}>INFRAESTRUCTURA & SEGURIDAD ENTERPRISE</span>
            <h2 className={styles.sectionTitle}>
              Diseñado para escalar con los requerimientos técnicos más exigentes
            </h2>
            <p className={styles.sectionSubtitle}>
              Arquitectura en la nube de alta disponibilidad, APIs abiertas y cumplimiento de estándares internacionales de protección de datos.
            </p>
          </div>

          <div className={styles.techSpecsGrid}>
            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}>⚡</div>
              <h4>99.99% Uptime SLA</h4>
              <p>Infraestructura redundante multi-región en AWS y Google Cloud con failover automático y balanceo de carga.</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}>🔒</div>
              <h4>Seguridad de Grado Bancario</h4>
              <p>Cifrado AES-256 en reposo, TLS 1.3 en tránsito, autenticación OAuth 2.0 y compatibilidad con Single Sign-On (SSO).</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}>🔌</div>
              <h4>APIs REST & Webhooks</h4>
              <p>Endpoints documentados con OpenAPI 3.0, webhooks firmados criptográficamente (HMAC-SHA256) y sincronización cada 5 min.</p>
            </div>

            <div className={styles.techSpecCard}>
              <div className={styles.techSpecIcon}>🏛️</div>
              <h4>Cumplimiento Fiscal SUNAT</h4>
              <p>Integración directa con los Web Services de SUNAT y OSE para consulta de RUC, validación de CPEs y emisión de GRE.</p>
            </div>
          </div>
        </section>

        {/* 8. Bottom CTA Banner */}
        <section className={styles.bottomCtaSection}>
          <div className={styles.bottomCtaCard}>
            <h2>¿Listo para transformar las compras de tu empresa?</h2>
            <p>Agenda una sesión estratégica de 15 minutos con nuestros especialistas de producto e ingeniería de datos.</p>
            <div className={styles.bottomCtaActions}>
              <button 
                className={styles.btnPrimaryCta} 
                onClick={() => setIsDemoModalOpen(true)}
              >
                Solicitar Demo 1:1
              </button>
              <Link href="/dashboard" className={styles.btnSecondaryCta}>
                Explorar Dashboard
              </Link>
            </div>
            <span className={styles.bottomCtaMicro}>Sin tarjeta de crédito requerida · Onboarding asistido</span>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>INVENTA<span className={styles.logoAccent}>.AI</span></span>
            <p>El cerebro de compras y financiamiento de inventario para empresas en América Latina.</p>
          </div>

          <div className={styles.footerLinksGrid}>
            <div>
              <h5>Producto</h5>
              <a href="#soluciones">Pronóstico de Demanda</a>
              <a href="#soluciones">Compras Conjuntas</a>
              <a href="#soluciones">Financiamiento de Stock</a>
              <Link href="/dashboard/integraciones">Integraciones ERP</Link>
            </div>
            <div>
              <h5>Empresa</h5>
              <a href="#roi">Prueba de ROI</a>
              <a href="#casos">Casos de Éxito</a>
              <a href="#tecnologia">Seguridad & SLA</a>
              <a href="#problema">El Desafío</a>
            </div>
            <div>
              <h5>Soporte & Legal</h5>
              <a href="mailto:contacto@inventa.ai">contacto@inventa.ai</a>
              <a href="#">Términos de Servicio</a>
              <a href="#">Política de Privacidad</a>
              <a href="#">Estado del Sistema (Status)</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© 2026 INVENTA.AI Technologies Inc. Todos los derechos reservados.</span>
          <span>Desarrollado con estándares Enterprise B2B.</span>
        </div>
      </footer>

      {/* 10. MODAL SOLICITAR DEMO 1:1 */}
      {isDemoModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsDemoModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setIsDemoModalOpen(false)}>✕</button>

            {!demoSubmitted ? (
              <>
                <div className={styles.modalHeader}>
                  <span className={styles.modalPre}>SESIÓN ESTRATÉGICA 1:1</span>
                  <h3>Solicitar Demo de INVENTA.AI</h3>
                  <p>Descubre en 15 minutos cómo optimizar tu inventario y acceder a financiamiento rotativo.</p>
                </div>

                <form onSubmit={handleDemoSubmit} className={styles.demoForm}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Nombre y Apellido *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej: Carlos Mendoza" 
                        value={demoForm.nombre}
                        onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Correo Corporativo *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="carlos@empresa.com" 
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Empresa *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nombre de tu empresa" 
                        value={demoForm.empresa}
                        onChange={(e) => setDemoForm({ ...demoForm, empresa: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Teléfono / WhatsApp *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="+51 987 654 321" 
                        value={demoForm.telefono}
                        onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Volumen Mensual de Compras de Inventario</label>
                    <select 
                      value={demoForm.volumen}
                      onChange={(e) => setDemoForm({ ...demoForm, volumen: e.target.value })}
                    >
                      <option value="Menos de S/ 50,000">Menos de S/ 50,000 / mes</option>
                      <option value="S/ 50,000 - S/ 200,000">S/ 50,000 a S/ 200,000 / mes</option>
                      <option value="S/ 200,000 - S/ 1,000,000">S/ 200,000 a S/ 1,000,000 / mes</option>
                      <option value="Más de S/ 1,000,000">Más de S/ 1,000,000 / mes</option>
                    </select>
                  </div>

                  <button type="submit" className={styles.btnSubmitDemo}>
                    Confirmar y Agendar Demo 1:1
                  </button>
                  <span className={styles.formDisclaimer}>
                    🔒 Respetamos tu privacidad. Tus datos están protegidos con cifrado y nunca serán compartidos con terceros.
                  </span>
                </form>
              </>
            ) : (
              <div className={styles.modalSuccess}>
                <div className={styles.successIcon}>✓</div>
                <h3>¡Solicitud Recibida con Éxito!</h3>
                <p>
                  Gracias <strong>{demoForm.nombre}</strong>. Uno de nuestros Directores de Producto te contactará a <strong>{demoForm.email}</strong> y por WhatsApp a <strong>{demoForm.telefono}</strong> para coordinar tu demo personalizada.
                </p>
                <div className={styles.successDetails}>
                  <span>Empresa: <strong>{demoForm.empresa}</strong></span>
                  <span>Rango: <strong>{demoForm.volumen}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <Link href="/dashboard" className={styles.btnPrimaryCta} style={{ flex: 1, textAlign: 'center' }}>
                    Ir al Dashboard mientras tanto
                  </Link>
                  <button className={styles.btnSecondaryCta} onClick={() => { setIsDemoModalOpen(false); setDemoSubmitted(false); }}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
