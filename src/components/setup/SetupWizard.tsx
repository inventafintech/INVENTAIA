'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import {
  Globe,
  Building2,
  Boxes,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  ShoppingBag,
  Sparkles,
  Package,
  Check,
  Store,
  Factory,
  Pill,
  HardHat,
  Laptop,
} from 'lucide-react';
import styles from './SetupWizard.module.css';

interface IndustryOption {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  defaultCategories: string[];
}

const INDUSTRIES: IndustryOption[] = [
  {
    id: 'cpg',
    name: 'Consumo Masivo / Abarrotes',
    desc: 'Alimentos, bebidas, aceites, granos y productos de alta rotación.',
    icon: ShoppingBag,
    defaultCategories: ['Abarrotes', 'Lácteos', 'Bebidas & Licores', 'Cuidado del Hogar', 'Snacks & Golosinas'],
  },
  {
    id: 'retail',
    name: 'Retail & Tiendas de Conveniencia',
    desc: 'Minimarkets, cadenas comerciales y tiendas de paso.',
    icon: Store,
    defaultCategories: ['Bebidas Frías', 'Confitería', 'Cigarrillos & Vaper', 'Aseo Personal', 'Panadería'],
  },
  {
    id: 'farma',
    name: 'Farmacia & Cuidado Personal',
    desc: 'Medicamentos, dermocosmética, suplementos y cuidado de la salud.',
    icon: Pill,
    defaultCategories: ['Medicamentos OTC', 'Dermocosmética', 'Cuidado Infantil', 'Vitaminas & Suplementos', 'Ortopedia'],
  },
  {
    id: 'construccion',
    name: 'Ferretería & Construcción',
    desc: 'Materiales pesados, herramientas, pinturas y acabados.',
    icon: HardHat,
    defaultCategories: ['Materiales Básicos', 'Herramientas Eléctricas', 'Pinturas & Acabados', 'Gasfitería', 'Electricidad'],
  },
  {
    id: 'tech',
    name: 'Tecnología & Electrónica',
    desc: 'Smartphones, accesorios, cómputo y periféricos.',
    icon: Laptop,
    defaultCategories: ['Computadoras & Laptops', 'Smartphones & Telefonía', 'Accesorios & Cables', 'Audio & Video', 'Impresión'],
  },
  {
    id: 'manufactura',
    name: 'Manufactura & B2B Industrial',
    desc: 'Materia prima, insumos industriales, envases y repuestos.',
    icon: Factory,
    defaultCategories: ['Materia Prima', 'Empaques & Envases', 'Repuestos Maquinaria', 'Químicos Industriales'],
  },
];

const DEMO_PRODUCTS = [
  { sku: 'SKU-DEMO-001', name: 'Aceite Primor Premium 1L', category: 'Abarrotes', cost: 7.20, price: 9.50, stock: 450, safetyStock: 120 },
  { sku: 'SKU-DEMO-002', name: 'Arroz Costeño Extra 5kg', category: 'Abarrotes', cost: 18.50, price: 23.90, stock: 320, safetyStock: 80 },
  { sku: 'SKU-DEMO-003', name: 'Leche Gloria Azul 400g (Pack x6)', category: 'Lácteos', cost: 21.00, price: 26.50, stock: 240, safetyStock: 60 },
  { sku: 'SKU-DEMO-004', name: 'Detergente Bolívar Floral 800g', category: 'Cuidado del Hogar', cost: 5.80, price: 7.80, stock: 500, safetyStock: 150 },
  { sku: 'SKU-DEMO-005', name: 'Inca Kola Sin Azúcar 1.5L', category: 'Bebidas & Licores', cost: 4.20, price: 6.00, stock: 600, safetyStock: 100 },
];

export function SetupWizard() {
  const router = useRouter();

  // Wizard Step (1 a 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Ubicación y Moneda
  const [country, setCountry] = useState('PE');
  const [currency, setCurrency] = useState('PEN');
  const [taxRate, setTaxRate] = useState('18');
  const [timezone, setTimezone] = useState('America/Lima');

  // Step 2: Sucursal y Almacén
  const [branchName, setBranchName] = useState('Sede Central Lima');
  const [sunatCode, setSunatCode] = useState('0001');
  const [branchAddress, setBranchAddress] = useState('Av. Elmer Faucett 2850, Callao');
  const [warehouseCapacity, setWarehouseCapacity] = useState('2500');
  const [warehouseType, setWarehouseType] = useState('General');

  // Step 3: Industria y Categorías
  const [selectedIndustry, setSelectedIndustry] = useState<string>('cpg');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(INDUSTRIES[0].defaultCategories);
  const [newCatInput, setNewCatInput] = useState('');

  // Step 4: Catálogo y Productos
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Step 5: Estado de Envío
  const [saving, setSaving] = useState(false);

  // Cambiar de industria
  const handleSelectIndustry = (indId: string) => {
    setSelectedIndustry(indId);
    const ind = INDUSTRIES.find((i) => i.id === indId);
    if (ind) {
      setSelectedCategories(ind.defaultCategories);
    }
  };

  // Toggle categoría
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Añadir categoría manual
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim() && !selectedCategories.includes(newCatInput.trim())) {
      setSelectedCategories([...selectedCategories, newCatInput.trim()]);
      setNewCatInput('');
    }
  };

  // Cargar productos demo
  const handleLoadDemo = () => {
    setDemoLoaded(true);
  };

  // Simular subida de archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setDemoLoaded(false);
    }
  };

  // Finalizar Asistente
  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch('/api/setup/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          currency,
          taxRate,
          timezone,
          branchName,
          sunatCode,
          branchAddress,
          warehouseCapacity,
          warehouseType,
          industry: selectedIndustry,
          categories: selectedCategories,
          productsCount: demoLoaded ? DEMO_PRODUCTS.length : uploadedFileName ? 50 : 0,
        }),
      });

      // Redirigir al Resumen del PANEL
      router.push('/overview');
    } catch (err) {
      console.error('Error guardando configuración:', err);
      router.push('/overview');
    } finally {
      setSaving(false);
    }
  };

  const stepsList = [
    'Ubicación & Moneda',
    'Sucursal & Almacén',
    'Industria & Categorías',
    'Productos & Catálogo',
    'Listo',
  ];

  return (
    <div className={styles.wizardWrapper}>
      {/* Header Superior */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo height={24} tone="light" />
          <span className={styles.brandTag}>Asistente de Configuración</span>
        </div>
        <Link href="/overview" className={styles.exitLink}>
          Omitir e ir al Panel →
        </Link>
      </header>

      <main className={styles.mainContent}>
        {/* Stepper / Indicador de Progreso */}
        <div className={styles.stepper}>
          <div className={styles.stepperLine}>
            <div
              className={styles.stepperProgress}
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />
          </div>

          {stepsList.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <div key={stepNum} className={styles.stepItem}>
                <div
                  className={`
                    ${styles.stepCircle}
                    ${isActive ? styles.stepCircleActive : ''}
                    ${isCompleted ? styles.stepCircleCompleted : ''}
                  `}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
                </div>
                <span
                  className={`
                    ${styles.stepLabel}
                    ${isActive ? styles.stepLabelActive : ''}
                  `}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tarjeta del Paso Actual */}
        <div className={styles.card}>
          {/* =========================================================================
              PASO 1: UBICACIÓN Y MONEDA
              ========================================================================= */}
          {currentStep === 1 && (
            <div>
              <h2 className={styles.stepTitle}>Establece tu Ubicación y Moneda Base</h2>
              <p className={styles.stepSubtitle}>
                Configura los parámetros financieros y fiscales para el cálculo de costos, impuestos y valorización de inventario.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>País / Jurisdicción</label>
                  <select
                    className={styles.select}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    <option value="PE">Perú (SUNAT)</option>
                    <option value="CL">Chile (SII)</option>
                    <option value="CO">Colombia (DIAN)</option>
                    <option value="MX">México (SAT)</option>
                    <option value="US">Estados Unidos (IRS)</option>
                  </select>
                  <span className={styles.helperText}>Define las reglas fiscales e identificadores tributarios.</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Moneda Principal</label>
                  <select
                    className={styles.select}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="PEN">PEN - Sol Peruano (S/)</option>
                    <option value="USD">USD - Dólar Estadounidense ($)</option>
                    <option value="CLP">CLP - Peso Chileno ($)</option>
                    <option value="COP">COP - Peso Colombiano ($)</option>
                    <option value="MXN">MXN - Peso Mexicano ($)</option>
                  </select>
                  <span className={styles.helperText}>Moneda base para órdenes de compra y valuación.</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Tasa de Impuesto General (IGV / IVA)</label>
                  <select
                    className={styles.select}
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  >
                    <option value="18">18% (IGV Estándar Perú)</option>
                    <option value="19">19% (IVA Chile / Colombia)</option>
                    <option value="16">16% (IVA México)</option>
                    <option value="0">0% (Exonerado / Régimen Especial)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Zona Horaria Operativa</label>
                  <select
                    className={styles.select}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Santiago">America/Santiago (UTC-3)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 2: SUCURSAL PRINCIPAL Y ALMACÉN
              ========================================================================= */}
          {currentStep === 2 && (
            <div>
              <h2 className={styles.stepTitle}>Crea tu Sucursal y Almacén Principal</h2>
              <p className={styles.stepSubtitle}>
                Define la sede física de acopio donde se recibirán las órdenes de compra y se despachará la mercadería.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de la Sucursal</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="ej. Sede Central Lima"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Código de Establecimiento SUNAT</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={sunatCode}
                    onChange={(e) => setSunatCode(e.target.value)}
                    placeholder="0001"
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.label}>Dirección Física del Almacén</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="ej. Av. Elmer Faucett 2850, Callao, Lima"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Capacidad Total Estimada (m³)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={warehouseCapacity}
                    onChange={(e) => setWarehouseCapacity(e.target.value)}
                    placeholder="2500"
                  />
                  <span className={styles.helperText}>Permite calcular el porcentaje de ocupación física.</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo de Almacenamiento</label>
                  <select
                    className={styles.select}
                    value={warehouseType}
                    onChange={(e) => setWarehouseType(e.target.value)}
                  >
                    <option value="General">Almacén General / Seco</option>
                    <option value="Refrigerado">Cámara Frigorífica / Perecibles</option>
                    <option value="Aduanero">Depósito Aduanero Temporal</option>
                    <option value="CrossDocking">Centro de Cross-Docking</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 3: INDUSTRIA Y CATEGORÍAS
              ========================================================================= */}
          {currentStep === 3 && (
            <div>
              <h2 className={styles.stepTitle}>Selecciona tu Industria y Categorías</h2>
              <p className={styles.stepSubtitle}>
                Esto calibrará las políticas de rotación (GMROI), lead times típicos y familias de productos sugeridas.
              </p>

              <div className={styles.industryGrid}>
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry === ind.id;

                  return (
                    <div
                      key={ind.id}
                      onClick={() => handleSelectIndustry(ind.id)}
                      className={`
                        ${styles.industryCard}
                        ${isSelected ? styles.industryCardActive : ''}
                      `}
                    >
                      <div className={styles.industryIcon}>
                        <Icon size={20} />
                      </div>
                      <div className={styles.industryName}>{ind.name}</div>
                      <div className={styles.industryDesc}>{ind.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.categorySection}>
                <div className={styles.categoryTitle}>
                  Categorías sugeridas para esta industria (haz clic para activar/desactivar):
                </div>
                <div className={styles.categoryGrid}>
                  {selectedCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`${styles.categoryPill} ${styles.categoryPillActive}`}
                    >
                      <Check size={13} strokeWidth={3} />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <input
                    type="text"
                    className={styles.input}
                    style={{ maxWidth: '280px' }}
                    placeholder="+ Añadir otra categoría..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                  />
                  <button type="submit" className={styles.btnBack} style={{ padding: '8px 14px' }}>
                    Agregar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 4: CATÁLOGO DE PRODUCTOS E IMPORTACIÓN
              ========================================================================= */}
          {currentStep === 4 && (
            <div>
              <h2 className={styles.stepTitle}>Carga o Importa tus Productos</h2>
              <p className={styles.stepSubtitle}>
                Puedes iniciar con un catálogo sugerido de prueba, importar un archivo CSV/Excel o continuar para crearlos después.
              </p>

              {/* Opción Demo */}
              <div className={styles.demoBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="#2563eb" />
                  <div className={styles.demoText}>
                    <strong>¿Deseas probar de inmediato?</strong> Carga 5 SKUs demo con demanda simulada y datos de proveedores.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className={styles.demoBtn}
                  disabled={demoLoaded}
                >
                  {demoLoaded ? '✓ Catálogo Demo Cargado' : 'Cargar 5 SKUs Demo'}
                </button>
              </div>

              {/* Opción Dropzone CSV */}
              <label className={styles.dropzone}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div className={styles.dropzoneIcon}>
                  <UploadCloud size={36} />
                </div>
                <div className={styles.dropzoneTitle}>
                  {uploadedFileName ? `Archivo seleccionado: ${uploadedFileName}` : 'Arrastra tu archivo CSV o haz clic para subirlo'}
                </div>
                <div className={styles.dropzoneSubtitle}>
                  Columnas recomendadas: SKU, Nombre, Categoría, Costo, Precio, Stock Inicial, Stock Seguridad
                </div>
              </label>

              {demoLoaded && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Productos demo listos para incorporarse:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#475569' }}>
                    {DEMO_PRODUCTS.map((p) => (
                      <li key={p.sku}>
                        <strong>{p.name}</strong> ({p.sku}) — Stock: {p.stock} u · Costo: S/ {p.cost.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PASO 5: CONFIGURACIÓN LISTA (SETUP COMPLETE)
              ========================================================================= */}
          {currentStep === 5 && (
            <div>
              <h2 className={styles.stepTitle}>¡Configuración Completada con Éxito!</h2>
              <p className={styles.stepSubtitle}>
                Tu espacio de trabajo en INVENTA.AI ha sido preparado con todas las especificaciones operativas.
              </p>

              <div className={styles.checklist}>
                <div className={styles.checkItem}>
                  <CheckCircle2 size={20} className={styles.checkIcon} />
                  <div>
                    <div className={styles.checkTitle}>Ubicación y Parámetros Financieros</div>
                    <div className={styles.checkDesc}>
                      País: {country} · Moneda: {currency} · Tasa Impositiva: {taxRate}% · Zona: {timezone}
                    </div>
                  </div>
                </div>

                <div className={styles.checkItem}>
                  <CheckCircle2 size={20} className={styles.checkIcon} />
                  <div>
                    <div className={styles.checkTitle}>Sucursal y Almacén Principal Activo</div>
                    <div className={styles.checkDesc}>
                      {branchName} (SUNAT {sunatCode}) · {branchAddress} · Capacidad: {warehouseCapacity} m³ ({warehouseType})
                    </div>
                  </div>
                </div>

                <div className={styles.checkItem}>
                  <CheckCircle2 size={20} className={styles.checkIcon} />
                  <div>
                    <div className={styles.checkTitle}>Industria y Familias Comerciales</div>
                    <div className={styles.checkDesc}>
                      {INDUSTRIES.find((i) => i.id === selectedIndustry)?.name} · {selectedCategories.length} categorías configuradas
                    </div>
                  </div>
                </div>

                <div className={styles.checkItem}>
                  <CheckCircle2 size={20} className={styles.checkIcon} />
                  <div>
                    <div className={styles.checkTitle}>Catálogo de Productos</div>
                    <div className={styles.checkDesc}>
                      {demoLoaded
                        ? `${DEMO_PRODUCTS.length} SKUs demo incorporados con historial de demanda y algoritmos de reorden activos.`
                        : uploadedFileName
                        ? `Archivo ${uploadedFileName} listo para procesarse en segundo plano.`
                        : 'Catálogo vacío listo para ingresar productos manualmente o sincronizar vía API.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navegación Inferior (Footer) */}
          <div className={styles.footerNav}>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className={styles.btnBack}
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {currentStep < 5 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className={styles.btnSkip}
                >
                  Omitir este paso
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className={styles.btnNext}
                >
                  <span>Continuar</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className={styles.btnComplete}
                >
                  <span>{saving ? 'Guardando...' : 'Comenzar a usar INVENTA.AI'}</span>
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SetupWizard;
