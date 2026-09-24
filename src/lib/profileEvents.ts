/**
 * Bus de eventos liviano para propagar cambios del perfil en caliente.
 * Cualquier componente que muestre datos del usuario (header, dropdowns,
 * vista de perfil) se suscribe y refresca sin necesidad de recargar la página.
 */

export const PROFILE_UPDATED_EVENT = 'inventa:profile-updated';

export function emitProfileUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
}

export function subscribeProfileUpdates(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(PROFILE_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener(PROFILE_UPDATED_EVENT, callback);
  };
}
