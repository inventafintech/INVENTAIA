'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Package,
  ReceiptText,
  Download,
  FileUp,
  UploadCloud,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';

type TabKey = 'stock' | 'ventas';

interface ImportError {
  row: number;
  message: string;
}

interface LocationItem {
  ref: string;
  name: string;
  status: string;
  storageType: string;
  branch: string;
  description: string;
  area: string;
}

interface BranchGroup {
  name: string;
  count: number;
  locations: LocationItem[];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ImportsView() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('stock');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [locationRef, setLocationRef] = useState('');
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsTotal, setLocationsTotal] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; applied?: number; errors?: ImportError[] } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Paso 1: ubicaciones reales agrupadas por sucursal (workspace autenticado).
  // grouped=1 devuelve { branches: [{ name, locations }] }; vacío real → estado CTA.
  useEffect(() => {
    let cancelled = false;
    setLocationsLoading(true);
    fetch('/api/locations?grouped=1&pageSize=100', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const branches: BranchGroup[] = Array.isArray(data?.branches) ? data.branches : [];
        const flat: LocationItem[] = [];
        for (const b of branches) {
          for (const l of b.locations || []) {
            flat.push({
              ref: String(l.ref || ''),
              name: String(l.name || l.ref || ''),
              status: String(l.status || ''),
              storageType: String(l.storageType || ''),
              branch: String(l.branch || b.name || ''),
              description: String(l.description || ''),
              area: String(l.area || ''),
            });
          }
        }
        setLocations(flat.filter((l) => l.ref));
        setLocationsTotal(typeof data?.total === 'number' ? data.total : flat.length);
      })
      .catch(() => {
        if (!cancelled) {
          setLocations([]);
          setLocationsTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = locations.map((l) => ({
    value: l.ref,
    label: l.name,
    hint: [l.storageType, l.status].filter(Boolean).join(' · ') || undefined,
    group: (l.branch || '').toUpperCase() || undefined,
  }));

  const dropLocked = !locationRef;

  const acceptFile = (f: File | undefined | null) => {
    setFileError(null);
    setResult(null);
    if (!f) return;
    if (dropLocked) {
      setFileError('Selecciona primero la ubicación del Paso 1.');
      return;
    }
    const isCsv = /\.csv$/i.test(f.name) || f.type === 'text/csv';
    if (!isCsv) {
      setFileError('Formato no válido: solo archivos .csv.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError('El archivo supera el máximo de 5 MB.');
      return;
    }
    setFile(f);
  };

  const handleTemplate = async () => {
    try {
      const res = await fetch('/api/products?pageSize=100', { cache: 'no-store' });
      const data = res.ok ? await res.json() : { items: [] };
      const skus = (data.items || []).map((p: any) => p.sku);
      const header = tab === 'stock' ? 'ProductSKU,Quantity' : 'ProductSKU,Quantity,Date,Type';
      const example =
        tab === 'stock'
          ? skus.slice(0, 3).map((s: string) => `${s},`).join('\n')
          : skus.slice(0, 2).map((s: string, i: number) => `${s},,2026-09-${24 + i},VENTA`).join('\n');
      downloadCSV(tab === 'stock' ? 'plantilla-stock-inicial.csv' : 'plantilla-ventas.csv', `${header}\n${example}\n`);
    } catch {
      setFileError('No se pudo generar la plantilla.');
    }
  };

  const handleExport = async () => {
    if (!locationRef) return;
    try {
      const [prodRes, itemRes] = await Promise.all([
        fetch('/api/products?pageSize=500', { cache: 'no-store' }),
        fetch('/api/inventory/items?pageSize=500', { cache: 'no-store' }),
      ]);
      const pj = prodRes.ok ? await prodRes.json() : { items: [] };
      const ij = itemRes.ok ? await itemRes.json() : { items: [] };
      const qtyById = new Map((ij.items || []).map((i: any) => [i.id, i.qty]));
      const lines = ['ProductSKU,Quantity'];
      for (const p of pj.items || []) {
        lines.push(`${p.sku},${qtyById.get(p.id) ?? 0}`);
      }
      downloadCSV(`productos-${locationRef}.csv`, lines.join('\n') + '\n');
    } catch {
      setFileError('No se pudo exportar.');
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    if (!locationRef) {
      setFileError('Selecciona primero la ubicación del Paso 1.');
      return;
    }
    setFileError(null);
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('locationRef', locationRef);
      form.append('mode', tab === 'stock' ? 'stock' : 'ventas');
      const res = await fetch('/api/inventory/import', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          ok: false,
          message: data?.error || 'No se pudo procesar el archivo.',
          errors: data?.errors || [],
        });
      } else {
        setResult({ ok: true, message: data?.message || 'Importación completa.', applied: data?.applied || 0 });
        setFile(null);
      }
    } catch (err: any) {
      setResult({ ok: false, message: `Error de conexión: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" onClick={() => router.back()} aria-label="Volver" style={{ border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '8px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: '#64748b' }}>
          INVENTARIO / IMPORTACIONES
        </span>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Importaciones</h1>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '-8px 0 0 0' }}>
        Incorpora el stock inicial y las ventas pasadas a tu inventario desde un archivo CSV
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 12px' }} role="tablist" aria-label="Tipo de importación">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stock'}
          onClick={() => {
            setTab('stock');
            setResult(null);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', color: tab === 'stock' ? '#2563eb' : '#64748b', fontSize: '14px', fontWeight: tab === 'stock' ? 700 : 500, padding: '10px 16px', minHeight: '44px', borderBottom: tab === 'stock' ? '2.5px solid #2563eb' : '2.5px solid transparent', cursor: 'pointer' }}
        >
          <Package size={16} /> Stock Inicial
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ventas'}
          onClick={() => {
            setTab('ventas');
            setResult(null);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', color: tab === 'ventas' ? '#2563eb' : '#64748b', fontSize: '14px', fontWeight: tab === 'ventas' ? 700 : 500, padding: '10px 16px', minHeight: '44px', borderBottom: tab === 'ventas' ? '2.5px solid #2563eb' : '2.5px solid transparent', cursor: 'pointer' }}
        >
          <ReceiptText size={16} /> Ventas y devoluciones
        </button>
      </div>

      {/* Paso 1 */}
      <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#334155', flexShrink: 0 }}>
            1
          </span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#334155' }}>SELECCIONAR UBICACIÓN</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Dónde se registra el stock inicial</div>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {!locationsLoading && locationsTotal === 0 ? (
            <div
              role="alert"
              style={{ borderLeft: '3px solid #2563eb', background: '#eff6ff', borderRadius: '0 8px 8px 0', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}
            >
              <div style={{ flex: '1 1 220px', fontSize: '13px', color: '#1e3a8a', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800 }}>No hay ubicaciones configuradas. Crea una ubicación primero.</div>
                <div style={{ color: '#3b82f6' }}>La importación necesita un destino válido para registrar el stock.</div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/inventory/locations')}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}
              >
                Crear ubicación
              </button>
            </div>
          ) : (
            <Dropdown
              options={locationOptions}
              value={locationRef}
              onChange={setLocationRef}
              placeholder="Select ubicación"
              ariaLabel="Ubicación destino de la importación"
              loading={locationsLoading}
              loadingText="Cargando ubicaciones…"
            />
          )}
        </div>
      </section>

      {/* Paso 2 */}
      <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#334155', flexShrink: 0 }}>
            2
          </span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#334155' }}>PREPARA TU ARCHIVO</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Descarga la plantilla y rellena tus cantidades de stock</div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTemplate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer', minHeight: '44px' }}
          >
            <Download size={15} /> Descargar plantilla
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!locationRef}
            title={locationRef ? 'Exportar catálogo con stock actual' : 'Selecciona una ubicación para exportar sus productos'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: locationRef ? '#334155' : '#cbd5e1', cursor: locationRef ? 'pointer' : 'not-allowed', minHeight: '44px' }}
          >
            <FileUp size={15} /> Exportar productos
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {locationRef ? 'Exporta el catálogo con su stock actual' : 'Selecciona una ubicación para exportar sus productos'}
          </span>
        </div>
      </section>

      {/* Paso 3 */}
      <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#334155', flexShrink: 0 }}>
            3
          </span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#334155' }}>SUBIR ARCHIVO CSV</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>El archivo se comprueba antes de escribir nada</div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            role="alert"
            style={{ borderLeft: '3px solid #f59e0b', background: '#fffbeb', borderRadius: '0 8px 8px 0', padding: '12px 14px', display: 'flex', gap: '10px' }}
          >
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: '11px' }}>FORMATO DEL ARCHIVO</div>
              <div>
                <strong>Columnas requeridas:</strong>{' '}
                <code style={{ fontFamily: 'monospace' }}>ProductId o ProductSKU, Quantity{tab === 'ventas' ? ', Date, Type' : ''}</code>
              </div>
              <div>
                <strong>Formatos de fecha:</strong> <code style={{ fontFamily: 'monospace' }}>YYYY-MM-DD, DD/MM/YYYY</code>
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!dropLocked) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (dropLocked) {
                setFileError('Selecciona primero la ubicación del Paso 1.');
                return;
              }
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => {
              if (dropLocked) {
                setFileError('Selecciona primero la ubicación del Paso 1.');
                return;
              }
              inputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label="Subir archivo CSV"
            aria-disabled={dropLocked}
            title={dropLocked ? 'Selecciona primero la ubicación del Paso 1' : 'Subir archivo CSV'}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              if (dropLocked) {
                setFileError('Selecciona primero la ubicación del Paso 1.');
                return;
              }
              inputRef.current?.click();
            }}
            style={{
              border: `1.5px dashed ${dragOver && !dropLocked ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '10px',
              background: dropLocked ? '#f1f5f9' : dragOver ? '#eff6ff' : '#f8fafc',
              opacity: dropLocked ? 0.75 : 1,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: dropLocked ? 'not-allowed' : 'pointer',
            }}
          >
            <UploadCloud size={28} color={dropLocked ? '#cbd5e1' : '#94a3b8'} style={{ margin: '0 auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: dropLocked ? '#64748b' : '#0f172a', marginTop: '10px' }}>
              {dropLocked ? 'Selecciona una ubicación en el Paso 1 para habilitar la subida' : 'Arrastra tu archivo CSV aquí o haz clic para buscar'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Formato soportado: .csv</div>
            <span
              style={{ display: 'inline-block', marginTop: '12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
            >
              Explorar archivos
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => acceptFile(e.target.files?.[0])}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
              <FileText size={16} color="#2563eb" />
              <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>{(file.size / 1024).toFixed(1)} KB</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                aria-label="Quitar archivo"
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {fileError && (
            <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
              {fileError}
            </div>
          )}

          {file && !fileError && (
            <div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: uploading ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', minHeight: '44px' }}
              >
                {uploading && <Loader2 size={16} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {uploading ? 'Procesando archivo…' : 'Procesar archivo'}
              </button>
            </div>
          )}

          {result && (
            <div
              role={result.ok ? 'status' : 'alert'}
              style={{ borderRadius: '8px', padding: '12px 14px', fontSize: '13px', background: result.ok ? '#f0fdf4' : '#fef2f2', border: result.ok ? '1px solid #bbf7d0' : '1px solid #fecaca', color: result.ok ? '#166534' : '#991b1b' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                {result.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{result.message}</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <ul style={{ margin: '10px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                  {result.errors.slice(0, 50).map((e, idx) => (
                    <li key={idx} style={{ fontSize: '12px', fontWeight: 400 }}>
                      Fila {e.row}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 50 && <li style={{ fontSize: '12px' }}>…y {result.errors.length - 50} errores más.</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
