import { firebaseListo } from '../firebaseConfig';
import type { Repo } from './repo';
import { RepoMemoria } from './memoria';
import { RepoFirebase } from './firebase';

const CLAVE = 'stoafit-modo-prueba';

/**
 * Modo prueba si: se armó con `--mode demo`, se abrió con ?prueba=1 (queda guardado hasta ?prueba=0),
 * o todavía no está cargada la configuración de Firebase.
 */
export function enModoPrueba(): boolean {
  if (import.meta.env.VITE_MODO === 'prueba' || !firebaseListo) return true;
  try {
    const q = new URLSearchParams(location.search).get('prueba');
    if (q === '1') sessionStorage.setItem(CLAVE, '1');
    if (q === '0') sessionStorage.removeItem(CLAVE);
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function crearRepo(): Repo {
  if (enModoPrueba()) return new RepoMemoria();
  const nativo = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  return new RepoFirebase(nativo);
}
