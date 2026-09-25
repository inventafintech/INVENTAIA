'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, X, Send, Loader2, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { triggerNotificationRefresh } from '@/context/NotificationContext';
import type { NexoCard, NexoAction } from '@/services/NexoEngineService';

interface NexoToolCall {
  tool: 'navigate_to_module';
  args: { destination_path: string; label: string };
}

interface ChatMsg {
  id: string;
  from: 'user' | 'nexo';
  text: string;
  cards?: NexoCard[];
  ok?: boolean;
}

let msgSeq = 0;
const nextId = () => `nexo-msg-${Date.now()}-${msgSeq++}`;

/**
 * Orbe animado de Nexo (Image-to-Video: Runway/Luma/Kling).
 * Coloca los archivos generados en `public/` y el widget los adopta solo:
 * - `public/nexo-orb.webm` (VP9 con alfa, loop 6-10s, <1MB)
 * - `public/nexo-orb.png` (póster: tu PNG con fondo removido)
 * Si no existen, se usa el orbe en gradiente CSS (cero errores 404 visibles).
 */
const ORB_VIDEO_SRC = '/nexo-orb.webm';
const ORB_POSTER_SRC = '/nexo-orb.png';

/**
 * NexoCopilot — copiloto transversal de INVENTA.AI.
 * Widget flotante + Command Palette (Cmd+K / Ctrl+K), consciente de la
 * pantalla (usePathname) y con tarjetas de acción que ejecutan servicios
 * reales con confirmación explícita del usuario. Sin mocks: cada número
 * viene del backend y cada acción se audita como "Asistida por Nexo".
 */
export function NexoCopilot() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [greetedFor, setGreetedFor] = useState<string | null>(null);
  const [orbVideoOk, setOrbVideoOk] = useState(true);
  const [orbPosterOk, setOrbPosterOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K global + Esc para cerrar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const push = useCallback((m: ChatMsg) => {
    setMsgs((prev) => [...prev.slice(-29), m]);
  }, []);

  // Saludo proactivo con contexto de pantalla (una vez por apertura)
  useEffect(() => {
    if (!open || greetedFor === pathname) return;
    if (msgs.length > 0 && greetedFor !== null) return;
    let cancelled = false;
    setBusy(true);
    fetch('/api/nexo/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', pathname }),
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return;
        setGreetedFor(pathname);
        push({ id: nextId(), from: 'nexo', text: data.reply, cards: data.cards || [] });
      })
      .catch(() => {
        if (!cancelled) push({ id: nextId(), from: 'nexo', text: 'No pude cargar el contexto. Escríbeme qué necesitas.', ok: false });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setConfirmId(null);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const clean = text.trim().slice(0, 500);
    if (!clean || busy) return;
    setInput('');
    setConfirmId(null);
    push({ id: nextId(), from: 'user', text: clean });
    setBusy(true);
    try {
      const res = await fetch('/api/nexo/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean, pathname }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        push({ id: nextId(), from: 'nexo', text: data?.error || 'No pude procesarlo. Inténtalo de nuevo.', ok: false });
      } else {
        push({ id: nextId(), from: 'nexo', text: data.reply, cards: data.cards || [] });
        // Function calling: el backend ordenó navegar → router.push inmediato,
        // cierre de paleta, sin clics adicionales. Solo destinos internos.
        const calls: NexoToolCall[] = Array.isArray(data.toolCalls) ? data.toolCalls : [];
        const nav = calls.find((c) => c?.tool === 'navigate_to_module');
        const dest = nav?.args?.destination_path;
        if (nav && typeof dest === 'string' && dest.startsWith('/')) {
          setOpen(false);
          router.push(dest);
        }
      }
    } catch {
      push({ id: nextId(), from: 'nexo', text: 'Error de conexión con Nexo.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (card: NexoCard, action: NexoAction) => {
    if (action.type === 'navigate') {
      setOpen(false);
      router.push(action.payload?.href || '/overview');
      return;
    }
    if (action.requiresConfirm && confirmId !== card.id) {
      setConfirmId(card.id);
      return;
    }
    setConfirmId(null);
    const key = `${card.id}:${action.type}`;
    setExecuting(key);
    try {
      const res = await fetch('/api/nexo/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: true }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      const ok = res.ok && data?.success;
      push({
        id: nextId(),
        from: 'nexo',
        text: data?.message || (ok ? 'Acción ejecutada.' : 'No se pudo ejecutar.'),
        ok,
      });
      if (ok) triggerNotificationRefresh();
    } catch {
      push({ id: nextId(), from: 'nexo', text: 'Error de conexión al ejecutar.', ok: false });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <>
      {/* Widget flotante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar Nexo' : 'Abrir Nexo (Ctrl+K)'}
        title="Nexo · tu copiloto (Ctrl+K)"
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          zIndex: 90,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.35)',
          background: 'radial-gradient(circle at 30% 25%, #818cf8 0%, #4f46e5 45%, #1e1b4b 100%)',
          boxShadow: '0 12px 32px rgba(79,70,229,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {open ? (
          <X size={22} />
        ) : orbVideoOk ? (
          <video
            src={ORB_VIDEO_SRC}
            poster={orbPosterOk ? ORB_POSTER_SRC : undefined}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            onError={() => setOrbVideoOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }}
          />
        ) : orbPosterOk ? (
          <img
            src={ORB_POSTER_SRC}
            alt=""
            aria-hidden="true"
            onError={() => setOrbPosterOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }}
          />
        ) : (
          <Sparkles size={22} />
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Nexo, copiloto de INVENTA.AI"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '88px',
            zIndex: 91,
            width: 'min(392px, calc(100vw - 40px))',
            height: 'min(560px, calc(100vh - 140px))',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}>
            <span
              aria-hidden="true"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 25%, #c7d2fe 0%, #818cf8 50%, #312e81 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}
            >
              {orbVideoOk ? (
                <video
                  src={ORB_VIDEO_SRC}
                  poster={orbPosterOk ? ORB_POSTER_SRC : undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  onError={() => setOrbVideoOk(false)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }}
                />
              ) : orbPosterOk ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ORB_POSTER_SRC}
                  alt="Nexo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                />
              ) : (
                <Sparkles size={16} color="#ffffff" />
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>Nexo</div>
              <div style={{ fontSize: '11px', color: '#c7d2fe' }}>Copiloto ejecutivo · datos reales</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar Nexo"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#c7d2fe', display: 'flex', minWidth: '36px', minHeight: '36px', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
            {msgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                <div
                  style={{
                    background: m.from === 'user' ? '#4f46e5' : '#ffffff',
                    color: m.from === 'user' ? '#ffffff' : '#0f172a',
                    border: m.from === 'user' ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    lineHeight: 1.55,
                  }}
                >
                  {m.from === 'nexo' && m.ok === false && <AlertTriangle size={13} color="#dc2626" style={{ marginRight: '6px', verticalAlign: '-2px' }} />}
                  {m.from === 'nexo' && m.ok === true && <CheckCircle2 size={13} color="#16a34a" style={{ marginRight: '6px', verticalAlign: '-2px' }} />}
                  {m.text}
                </div>
                {(m.cards || []).map((card) => {
                  const action = card.action;
                  const key = `${card.id}:${action?.type}`;
                  const isRunning = executing === key;
                  const needsConfirm = Boolean(action?.requiresConfirm) && confirmId !== card.id;
                  return (
                    <div
                      key={card.id}
                      style={{ marginTop: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{card.title}</div>
                      {card.subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{card.subtitle}</div>}
                      {card.metric && <div style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>{card.metric}</div>}
                      {action && (
                        <button
                          type="button"
                          disabled={isRunning || busy}
                          onClick={() => runAction(card, action)}
                          style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: confirmId === card.id ? '#dc2626' : '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isRunning || busy ? 'not-allowed' : 'pointer',
                            minHeight: '36px',
                          }}
                        >
                          {isRunning && <Loader2 size={13} style={{ animation: 'nexospin 1s linear infinite' }} />}
                          {confirmId === card.id ? `Confirmar: ${action.label}` : action.label}
                          {!isRunning && <ArrowRight size={13} />}
                        </button>
                      )}
                      {needsConfirm && action && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          Toca una vez para revisar y otra para confirmar. Sin tu clic final no ejecuto nada.
                        </div>
                      )}
                      {confirmId === card.id && (
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          style={{ marginTop: '6px', marginLeft: '8px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: 'flex-start', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '9px 12px', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={14} color="#4f46e5" style={{ animation: 'nexospin 1s linear infinite' }} />
                Nexo está consultando tus datos…
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', background: '#ffffff' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta o pide una acción…"
              aria-label="Mensaje para Nexo"
              maxLength={500}
              style={{ flex: 1, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', minHeight: '40px', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Enviar a Nexo"
              style={{ background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', width: '44px', minHeight: '40px', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: busy || !input.trim() ? 0.6 : 1 }}
            >
              <Send size={15} />
            </button>
          </form>
          <style>{`@keyframes nexospin { to { transform: rotate(360deg); } }`}</style>
        </section>
      )}
    </>
  );
}

export default NexoCopilot;
