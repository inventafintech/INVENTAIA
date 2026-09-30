import { NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Rate-limit best-effort en memoria (por instancia serverless).
 * No sustituye un store distribuido (Upstash), pero frena abuso casual,
 * fuerza bruta al login/2FA y quema de cuota del LLM desde un solo origen.
 * Uso: const limited = rateLimit(req, { limit: 20, windowMs: 60_000 });
 *       if (limited) return limited;
 */
const buckets = new Map<string, Bucket>();

// Limpieza oportunista para no crecer sin cota.
let lastSweep = 0;

export function rateLimit(
  req: Request,
  opts: { limit: number; windowMs: number; keyPrefix?: string }
): NextResponse | null {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    // Cota dura anti-memoria.
    if (buckets.size > 5000) buckets.clear();
  }

  const fwd = req.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0] : '').trim() || 'unknown';
  const key = `${opts.keyPrefix || 'rl'}:${ip}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (bucket.count > opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }
  return null;
}
