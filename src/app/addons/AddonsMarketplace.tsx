'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  ShoppingBag,
  Package,
  ArrowLeftRight,
  HeartPulse,
  Blocks,
  BarChart3,
  Wallet,
  BrainCircuit,
  Store,
  Landmark,
  Wrench,
  Bot,
  Check,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';

interface AddonVM {
  id: string;
  name: string;
  icon: string;
  plan: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
  description: string;
  features: string[];
  mode: 'self-service' | 'sales-led';
  monthlyPrice: number | null;
  annualPrice: number | null;
}

const ICONS: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  ShoppingBag,
  Package,
  ArrowLeftRight,
  HeartPulse,
  Blocks,
  BarChart3,
  Wallet,
  BrainCircuit,
  Store,
  Landmark,
  Wrench,
  Bot,
};

const PLAN_LABEL: Record<string, string> = {
  ESSENTIAL: 'DISPONIBLE EN ESSENTIAL',
  PRO: 'DISPONIBLE EN PRO',
  ENTERPRISE: 'DISPONIBLE EN ENTERPRISE',
};

const PLAN_NAME_ES: Record<string, string> = {
  ESSENTIAL: 'Essential',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

function formatPrice(n: number): string {
  return `PEN ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddonsMarketplace() {
  const router = useRouter();
  const [addons, setAddons] = useState<AddonVM[]>([]);
  const [cycle, setCycle] = useState<'mensual' | 'anual'>('mensual');
  const [loading, setLoading] = useState(true);

  const [showContact, setShowContact] = useState<AddonVM | null>(null);
  const [sending, setSending] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cMessage, setCMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/addons', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAddons(data.addons || []);
        if (data.billing?.billingCycle) setCycle(data.billing.billingCycle);
      }
    } catch (err) {
      console.error('Error al cargar complementos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCycle = async (next: 'mensual' | 'anual') => {
    if (next === cycle) return;
    setCycle(next);
    try {
      const res = await fetch('/api/billing/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle: next }),
      });
      if (res.ok) {
        setBanner({ type: 'success', text: `Preferencia guardada: facturación ${next} (−20 % en anual).` });
        setTimeout(() => setBanner(null), 4000);
      }
    } catch {
      // la preferencia visual se mantiene; el backend reintentará al guardar
    }
  };

  const openContact = (addon: AddonVM) => {
    setShowContact(addon);
    setCName('');
    setCEmail('');
    setCCompany('');
    setCMessage(`Me interesa "${addon.name}" para mi workspace.`);
    setFormError(null);
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showContact) return;
    setFormError(null);
    setSending(true);
    try {
      const res = await fetch('/api/billing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId: showContact.id,
          name: cName,
          email: cEmail,
          company: cCompany,
          message: cMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar.');
      setShowContact(null);
      setBanner({ type: 'success', text: data?.message || 'Solicitud enviada. El equipo comercial te contactará.' });
      setTimeout(() => setBanner(null), 6000);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo enviar.');
    } finally {
      setSending(false);
    }
  };

  const handleBuy = async (addon: AddonVM) => {
    setBuying(addon.id);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId: addon.id, cycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar la compra.');
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Sin URL de checkout.');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo iniciar la compra.' });
    } finally {
      setBuying(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Breadcrumb */}
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--color-slate)' }}>
        FACTURACIÓN / COMPLEMENTOS
      </span>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-charcoal)', flexShrink: 0 }}>
          <CreditCard size={20} />
        </span>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--color-pebble)' }}>SUSCRIPCIÓN</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: '2px 0 0 0' }}>Complementos</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '4px' }} role="group" aria-label="Ciclo de facturación">
          {(['mensual', 'anual'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCycle(c)}
              aria-pressed={cycle === c}
              style={{
                border: 'none',
                background: cycle === c ? '#ffffff' : 'transparent',
                boxShadow: cycle === c ? '0 1px 2px rgba(15,23,42,0.12)' : 'none',
                borderRadius: '7px',
                padding: '8px 14px',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: cycle === c ? 700 : 500,
                color: cycle === c ? 'var(--color-obsidian)' : 'var(--color-slate)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {c}
            </button>
          ))}
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
            AHORRA HASTA UN 20 %
          </span>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: 0, lineHeight: 1.6, maxWidth: '900px' }}>
        Los complementos con la compra de Stripe configurada aparecen primero. Los módulos sin ID de precio de Stripe
        asignados permanecen como asistidos por ventas hasta que se configure la compra para ese complemento en este entorno.
      </p>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          style={{ background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2', border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid var(--color-alarm-red)', color: banner.type === 'success' ? '#166534' : '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Cerrar aviso" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
            ×
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-pebble)', fontSize: '13px' }}>
          Cargando complementos…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
          {addons.map((addon) => {
            const Icon = ICONS[addon.icon] || Blocks;
            const selfService = addon.mode === 'self-service';
            const price = cycle === 'anual' ? addon.annualPrice : addon.monthlyPrice;
            return (
              <article
                key={addon.id}
                style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-fog)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fff7ed', border: '1px solid var(--color-alarm-red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-alarm-red)', flexShrink: 0 }}>
                      <Icon size={18} />
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-obsidian)', flex: 1, minWidth: '120px' }}>{addon.name}</strong>
                    <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--color-alarm-red)', background: '#fff7ed', padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                      {PLAN_LABEL[addon.plan]}
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', marginTop: '10px' }}>
                    {selfService && price !== null ? (
                      <>
                        {formatPrice(price)}
                        <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-slate)' }}> /{cycle === 'anual' ? 'año' : 'mes'}</span>
                      </>
                    ) : (
                      'Presupuesto personalizado'
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.6, margin: 0 }}>{addon.description}</p>

                  {!selfService && (
                    <div style={{ borderLeft: '3px solid var(--color-forest-ink)', background: 'var(--color-paper)', borderRadius: '0 8px 8px 0', padding: '12px 14px', fontSize: '13px', color: 'var(--color-obsidian)', lineHeight: 1.6 }}>
                      Este complemento está disponible en el plan {PLAN_NAME_ES[addon.plan]}, pero la compra de
                      autoservicio aún no está configurada en este entorno. Contacta con ventas para tratar el acceso.
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-pebble)', marginBottom: '8px' }}>
                      CARACTERÍSTICAS INCLUIDAS
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {addon.features.map((f) => (
                        <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                          <Check size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-fog)' }}>
                  {selfService ? (
                    <button
                      type="button"
                      onClick={() => handleBuy(addon)}
                      disabled={buying === addon.id}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: buying === addon.id ? 'var(--color-fog)' : 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: buying === addon.id ? 'not-allowed' : 'pointer' }}
                    >
                      {buying === addon.id && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                      {buying === addon.id ? 'Abriendo checkout…' : `Comprar · ${price !== null ? formatPrice(price) : ''}`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openContact(addon)}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ffffff', color: 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <ExternalLink size={14} /> Contactar ventas
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer comparar planes */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
            ¿BUSCAS MÁS CARACTERÍSTICAS?
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-slate)', marginTop: '2px' }}>
            Compara Pro y Enterprise para ver qué módulos están incluidos y qué flujos de trabajo se acotan con un despliegue personalizado.
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/plans')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '10px 16px', minHeight: '44px', fontSize: '13px', fontWeight: 700, color: 'var(--color-obsidian)', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Comparar Planes <ExternalLink size={14} />
        </button>
      </div>

      {/* Modal contactar ventas */}
      {showContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Contactar ventas por ${showContact.name}`}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !sending) setShowContact(null);
          }}
        >
          <form
            onSubmit={handleContact}
            style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, flex: 1 }}>
                Contactar ventas
              </h2>
              <button type="button" onClick={() => !sending && setShowContact(null)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: 0 }}>
              Solicita acceso a <strong style={{ color: 'var(--color-obsidian)' }}>{showContact.name}</strong>. Registramos tu
              solicitud y el equipo comercial te contactará.
            </p>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-alarm-red)', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <label style={labelStyle}>
              Nombre *
              <input value={cName} onChange={(e) => setCName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Correo corporativo *
              <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Empresa
              <input value={cCompany} onChange={(e) => setCCompany(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Mensaje
              <textarea value={cMessage} onChange={(e) => setCMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => !sending && setShowContact(null)} style={{ background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: sending ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: sending ? 'var(--color-pebble)' : 'var(--color-alarm-red)', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                {sending && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {sending ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-charcoal)',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '4px',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid var(--color-pebble)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 400,
  minHeight: '44px',
  fontFamily: 'inherit',
};
