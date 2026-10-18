// Nombre de quien edita, guardado en el navegador. Se envía como header X-Actor solo para
// el historial de cambios. No es un inicio de sesión ni da permisos.

const storageKey = 'library.actorName';

export function getActorName(): string {
  try {
    return window.localStorage.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
}

export function saveActorName(name: string): void {
  try {
    const cleanName = name.trim();
    if (cleanName) {
      window.localStorage.setItem(storageKey, cleanName);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Sin almacenamiento disponible: la API usará "anonymous".
  }
}
