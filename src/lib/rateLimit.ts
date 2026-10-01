import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Rate-limit con backend distribuido (Upstash Redis) cuando hay
 * credenciales, y memoria local como fallback (best-effort por instancia).
 * Sin UPSTASH_REDIS_REST_URL/TOKEN funciona igual que antes, sin romper nada.
 * Uso: const limited = await rateLimit(req, { limit: 20, windowMs: 60_000 });
 *       if (limited) return limited;
 */

const buckets = new Map<string, Bucket>();
let lastSweep = 0;
let redis: Redis | null = null;
let upstashFailed = false;

function getRedis(): Redis | null {
  if (redis || upstashFailed) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    upstashFailed = true;
    return null;
  }
}

function memoryCheck(key: string, limit: number, windowMs: number, now: number): number {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    if (buckets.size > 5000) buckets.clear();
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return 0;
}

function limitedResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function rateLimit(
  req: Request,
  opts: { limit: number; windowMs: number; keyPrefix?: string }
): Promise<NextResponse | null> {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0] : '').trim() || 'unknown';
  const key = `${opts.keyPrefix || 'rl'}:${ip}`;

  const client = getRedis();
  if (client) {
    try {
      const rl = new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(opts.limit, `${Math.max(1, Math.round(opts.windowMs / 1000))} s`),
        prefix: 'inventa-rl',
      });
      const { success, reset } = await rl.limit(key);
      if (!success) {
        return limitedResponse(Math.max(1, Math.ceil((reset - Date.now()) / 1000)));
      }
      return null;
    } catch {
      upstashFailed = true;
      // cae al fallback en memoria sin romper la petición
    }
  }

  const retryAfter = memoryCheck(key, opts.limit, opts.windowMs, Date.now());
  if (retryAfter > 0) return limitedResponse(retryAfter);
  return null;
}
