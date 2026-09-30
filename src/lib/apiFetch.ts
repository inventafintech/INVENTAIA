'use client';

/**
 * apiFetch — fetch con manejo global de sesión expirada.
 * Misma firma que fetch. Ante 401 (sesión inválida tras rotación o
 * expiración), redirige una sola vez a /login preservando el destino.
 * Evita pantallas congeladas con datos viejos tras el hardening de APIs.
 */
let redirecting = false;

function toLogin(): void {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;
  const next = window.location.pathname + window.location.search;
  window.location.href = `/login?callbackUrl=${encodeURIComponent(next)}`;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    // Drenar el body para no dejar el stream colgado y redirigir.
    try {
      await res.clone().text();
    } catch {
      // ignorar
    }
    toLogin();
  }
  return res;
}
