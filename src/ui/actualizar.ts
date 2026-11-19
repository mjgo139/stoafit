/** Registra el service worker: cuando hay versión nueva se activa sola y la página se recarga una vez */
export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    });
  });
}

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __COMMIT__: string;
export const VERSION = __APP_VERSION__;
export const FECHA_ARMADO = __BUILD_DATE__;
export const COMMIT = __COMMIT__;
