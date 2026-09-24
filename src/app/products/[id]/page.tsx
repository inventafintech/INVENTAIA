'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Pencil,
  Zap,
  Tag,
  Building2,
  Boxes,
  X,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { triggerNotificationRefresh } from '@/context/NotificationContext';
import { AppShell } from '@/components/layout/AppShell';

interface DetailData {
  item: {
    id: string;
    sku: string;
    name: string;
    price: number;
    cost: number;
    margin: number;
    status: string;
    categoryId: string | null;
    category: string | null;
    updatedAt: string;
  };
  stock: { physical: number; safety: number };
  supplier: { id: string; name: string; type: string; phone: string | null; leadTimeDays: number } | null;
  restock: {
    rop: number;
    coverageDays: number;
    suggestedQty: number;
    investment: number;
    status: string;
    dailyVelocity: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    condition: string;
    total: number;
    status: string;
    createdAt: string;
    lines: Array<{ quantity: number; unitPrice: number }>;
  }>;
}

function formatPEN(n: number): string {
  return `PEN ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#f0fdf4', color: '#15803d', label: 'Activo' },
  paused: { bg: '#fef2f2', color: '#b91c1c', label: 'Pausado' },
  critical: { bg: '#fef2f2', color: '#b91c1c', label: 'Crítico' },
  warning: { bg: '#fffbeb', color: '#b45309', label: 'Alerta' },
  optimal: { bg: '#f0fdf4', color: '#15803d', label: 'Normal' },
};

export default function ProductDetailPage() {
  return (
    <AppShell>
      <ProductDetailContent />
    </AppShell>
  );
}

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params?.id || ''));

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fCost, setFCost] = useState('');
  const [fStatus, setFStatus] = useState('active');
  const [fStock, setFStock] = useState('');
  const [fSafety, setFSafety] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error al cargar ficha:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!data) return;
    setFName(data.item.name);
    setFPrice(String(data.item.price));
    setFCost(String(data.item.cost));
    setFStatus(data.item.status);
    setFStock(String(data.stock.physical));
    setFSafety(String(data.stock.safety));
    setFormError(null);
    setShowEdit(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fName,
          price: fPrice === '' ? NaN : Number(fPrice),
          cost: fCost === '' ? 0 : Number(fCost),
          status: fStatus,
          stock: fStock === '' ? 0 : Number(fStock),
          safetyStock: fSafety === '' ? 0 : Number(fSafety),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'No se pudo guardar.');
      setShowEdit(false);
      setBanner({ type: 'success', text: 'Producto actualizado correctamente.' });
      load();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateOC = async () => {
    if (!data || generating) return;
    setGenerating(true);
    setBanner(null);
    try {
      const res = await fetch('/api/dashboard/reabastecimiento/oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [data.item.sku] }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const first = json.results?.[0];
        setBanner({
          type: first?.status === 'failed' ? 'error' : 'success',
          text: first ? `${first.poNumber}: ${first.message}` : json.summary,
        });
        triggerNotificationRefresh();
        load();
      } else {
        setBanner({ type: 'error', text: json.error || 'No se pudo generar la OC.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Error de conexión: ${err.message}` });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        Cargando ficha del producto…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Producto no encontrado</h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>La referencia solicitada no existe en el catálogo.</p>
        <Link href="/products/products" style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
          ← Volver a Productos
        </Link>
      </div>
    );
  }

  const st = STATUS_STYLE[data.item.status] || STATUS_STYLE.active;
  const rst = STATUS_STYLE[data.restock.status] || STATUS_STYLE.optimal;
  const coveragePct = Math.min(100, Math.max(0, (data.restock.coverageDays / 14) * 100));

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }} aria-label="Miga de pan">
        <Link href="/products/products" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          Productos
        </Link>
        <ChevronRight size={13} />
        <span style={{ fontWeight: 700, color: '#0f172a' }}>{data.item.sku}</span>
      </nav>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
          <Tag size={20} />
        </span>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{data.item.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '12px', fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#334155' }}>
              {data.item.sku}
            </code>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: st.bg, color: st.color }}>
              {st.label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: rst.bg, color: rst.color }}>
              Stock: {rst.label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={openEdit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <Pencil size={14} /> Editar
          </button>
          <button
            type="button"
            onClick={handleGenerateOC}
            disabled={generating || data.restock.suggestedQty <= 0}
            title={data.restock.suggestedQty <= 0 ? 'Sin cantidad sugerida' : 'Generar orden de compra'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: generating || data.restock.suggestedQty <= 0 ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, cursor: generating || data.restock.suggestedQty <= 0 ? 'not-allowed' : 'pointer' }}
          >
            <Zap size={14} /> {generating ? 'Generando…' : 'Generar OC'}
          </button>
        </div>
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          style={{ background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2', border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca', color: banner.type === 'success' ? '#166534' : '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Cerrar aviso" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
            ×
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {[
          { label: 'PRECIO VENTA', value: formatPEN(data.item.price) },
          { label: 'COSTO', value: formatPEN(data.item.cost) },
          { label: 'MARGEN', value: `${data.item.margin}%` },
          { label: 'STOCK ACTUAL', value: `${data.stock.physical} u` },
          { label: 'COBERTURA', value: `${data.restock.coverageDays} días` },
        ].map((k, idx) => (
          <div key={k.label} style={{ padding: '16px 18px', borderLeft: idx === 0 ? 'none' : '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {/* Info general */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={15} color="#2563eb" /> Información general
          </h2>
          {[
            ['Categoría', data.item.category || '—'],
            ['Estado', st.label],
            ['Última actualización', new Date(data.item.updatedAt).toLocaleString('es-PE')],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <strong style={{ color: '#0f172a', textAlign: 'right' }}>{v}</strong>
            </div>
          ))}
        </div>

        {/* Proveedor */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={15} color="#2563eb" /> Proveedor
          </h2>
          {data.supplier ? (
            [
              ['Nombre', data.supplier.name],
              ['Tipo', data.supplier.type === 'corporate' ? 'Corporativo (SAP)' : 'Tradicional (WhatsApp)'],
              ['Contacto', data.supplier.phone || '—'],
              ['Lead time', `${data.supplier.leadTimeDays} días`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <strong style={{ color: '#0f172a', textAlign: 'right' }}>{v}</strong>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sin proveedor asignado.</p>
          )}
        </div>

        {/* Stock y reposición */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={15} color="#2563eb" /> Stock y reposición
          </h2>
          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ width: `${coveragePct}%`, height: '100%', background: data.restock.status === 'critical' ? '#ef4444' : data.restock.status === 'warning' ? '#f59e0b' : '#15803d', borderRadius: '999px' }} />
          </div>
          {[
            ['Stock físico', `${data.stock.physical} u`],
            ['Stock seguridad', `${data.stock.safety} u`],
            ['Punto de reorden (ROP)', `${data.restock.rop} u`],
            ['Velocidad estimada', `${data.restock.dailyVelocity} u/día`],
            ['Compra sugerida', `${data.restock.suggestedQty} u`],
            ['Inversión estimada', formatPEN(data.restock.investment)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <strong style={{ color: '#0f172a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</strong>
            </div>
          ))}
        </div>

        {/* Historial OC */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={15} color="#2563eb" /> Historial de órdenes ({data.orders.length})
          </h2>
          {data.orders.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Aún no hay órdenes de compra para este SKU.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {data.orders.map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '9px 12px', fontSize: '12px' }}>
                  <strong style={{ color: '#0f172a' }}>{o.orderNumber}</strong>
                  <span style={{ color: '#64748b' }}>
                    {o.lines.reduce((a, l) => a + l.quantity, 0)} u · S/ {o.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: o.status === 'sent' ? '#f0fdf4' : '#f1f5f9',
                      color: o.status === 'sent' ? '#15803d' : '#64748b',
                    }}
                  >
                    {o.status === 'sent' ? 'ENVIADA' : 'BORRADOR'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar */}
      {showEdit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Editar producto"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowEdit(false);
          }}
        >
          <form
            onSubmit={handleSave}
            style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 }}>Editar {data.item.sku}</h2>
              <button type="button" onClick={() => !saving && setShowEdit(false)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Nombre *
              <input value={fName} onChange={(e) => setFName(e.target.value)} required style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Precio (PEN) *
                <input value={fPrice} onChange={(e) => setFPrice(e.target.value)} inputMode="decimal" required style={inputStyle} />
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Costo (PEN)
                <input value={fCost} onChange={(e) => setFCost(e.target.value)} inputMode="decimal" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Estado
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={inputStyle}>
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                </select>
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Stock físico
                <input value={fStock} onChange={(e) => setFStock(e.target.value)} inputMode="numeric" style={inputStyle} />
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Stock seguridad
                <input value={fSafety} onChange={(e) => setFSafety(e.target.value)} inputMode="numeric" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => !saving && setShowEdit(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: saving ? 'not-allowed' : 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ background: saving ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '4px',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 400,
};
