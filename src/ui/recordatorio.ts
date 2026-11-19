import { useEffect } from 'react';
import { claveDia } from '../lib/logica';
import type { Perfil } from '../lib/tipos';

/**
 * Recordatorio de registrar: si a la hora elegida todavía no cargó nada del día, avisa una vez.
 * Funciona mientras la app está abierta o instalada (los avisos con la app cerrada llegan en la Fase 3).
 */
export function useRecordatorio(perfil: Perfil) {
  const { activo, hora } = perfil.recordatorio;
  const registrados = perfil.resumen.dias;
  useEffect(() => {
    if (!activo || !('Notification' in window)) return;
    const revisar = async () => {
      const hoy = claveDia();
      const [h, m] = hora.split(':').map(Number);
      const ahora = new Date();
      if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return;
      if (registrados.includes(hoy) || Notification.permission !== 'granted') return;
      try { if (localStorage.getItem('stoafit-aviso') === hoy) return; localStorage.setItem('stoafit-aviso', hoy); } catch { return; }
      const texto = { body: 'Todavía no registraste nada hoy. Un minuto de atención es templanza.', icon: '/icono-192.png' };
      const sw = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
      if (sw) await sw.showNotification('StoaFit', texto); else new Notification('StoaFit', texto);
    };
    revisar();
    const t = window.setInterval(revisar, 60_000);
    return () => window.clearInterval(t);
  }, [activo, hora, registrados]);
}
