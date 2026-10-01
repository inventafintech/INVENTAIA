/**
 * requiredSecret — falla cerrado en producción si falta el secreto.
 * En desarrollo permite un fallback inseguro explícito para no bloquear
 * el trabajo local sin .env. Nunca hardcodear secretos reales aquí.
 */
export function requiredSecret(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[seguridad] Falta variable de entorno requerida en producción: ${names.join(' / ')}`
    );
  }
  return `dev-only-insecure-${names[0] || 'secret'}`;
}
