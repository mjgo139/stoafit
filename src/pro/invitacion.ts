import { normalizarCodigo } from './logica';

const CLAVE_INVITACION = 'stoafit-codigo';

/** Si se abrió la app con ?codigo=NUT-XXXX, se guarda para ofrecer la vinculación después de ingresar (Fase 2) */
export function guardarInvitacionDeLaUrl() {
  try {
    const c = new URLSearchParams(location.search).get('codigo');
    if (c) {
      sessionStorage.setItem(CLAVE_INVITACION, normalizarCodigo(c));
      const u = new URL(location.href);
      u.searchParams.delete('codigo');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  } catch { /* sin almacenamiento */ }
}
export function invitacionPendiente(): string | null {
  try { return sessionStorage.getItem(CLAVE_INVITACION); } catch { return null; }
}
export function olvidarInvitacion() { try { sessionStorage.removeItem(CLAVE_INVITACION); } catch { /* nada */ } }
