import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;
const WINDOW_STEPS = 1; // tolerancia ±1 período (desfase de reloj)

export function base32Encode(bytes: Uint8Array | Buffer): string {
  const buf = Buffer.from(bytes);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.trim().replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Secreto TOTP inválido.');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secreto aleatorio de 160 bits en Base32 (compatible Google Authenticator). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: bigint): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);
  const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function generateTotpToken(secret: string, atMs: number = Date.now()): string {
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(atMs / 1000 / PERIOD_SECONDS));
  return hotp(key, counter);
}

/** Verifica el código aceptando ±WINDOW_STEPS períodos (comparación segura). */
export function verifyTotpToken(secret: string, token: string, atMs: number = Date.now()): boolean {
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }
  const current = BigInt(Math.floor(atMs / 1000 / PERIOD_SECONDS));
  const tokenBuf = Buffer.from(clean);
  for (let step = -WINDOW_STEPS; step <= WINDOW_STEPS; step++) {
    const candidate = Buffer.from(hotp(key, current + BigInt(step)));
    if (tokenBuf.length === candidate.length && crypto.timingSafeEqual(tokenBuf, candidate)) {
      return true;
    }
  }
  return false;
}

export function buildOtpauthUrl(issuer: string, accountName: string, secret: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Códigos de respaldo de un solo uso (formato XXXX-XXXX). */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}
