/**
 * Registra el service worker: la versión nueva se instala sola, pero la página se recarga recién cuando la app
 * queda en segundo plano (v1.17.0; antes recargaba en plena pantalla y volvía a salir el esqueleto).
 */
export function registrarServiceWorker() {
  // Si falta un pedazo de la versión vieja (porque ya se instaló la nueva), recargar
  window.addEventListener('vite:preloadError', () => location.reload());
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    let recargando = false;
    const recargar = () => { if (!recargando) { recargando = true; location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (document.visibilityState === 'hidden') recargar();
      else document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') recargar(); });
    });
  });
}

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __COMMIT__: string;
export const VERSION = __APP_VERSION__;
export const FECHA_ARMADO = __BUILD_DATE__;
export const COMMIT = __COMMIT__;
