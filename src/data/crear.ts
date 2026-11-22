import { firebaseListo } from '../firebaseConfig';
import type { Repo } from './repo';
import { RepoMemoria } from './memoria';
import { RepoFirebase } from './firebase';

const CLAVE = 'stoafit-modo-prueba';

/**
 * Modo prueba solo si se armó con `--mode demo` (pruebas automáticas y `npm run demo`)
 * o si todavía no está cargada la configuración de Firebase. En la web publicada `?prueba=1` no existe (v1.18.0).
 */
export function enModoPrueba(): boolean {
  try { sessionStorage.removeItem(CLAVE); } catch { /* nada */ }
  return import.meta.env.VITE_MODO === 'prueba' || !firebaseListo;
}

export function crearRepo(): Repo {
  if (enModoPrueba()) return new RepoMemoria();
  const nativo = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  return new RepoFirebase(nativo);
}
