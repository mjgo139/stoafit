import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as AppNativa } from '@capacitor/app';
import { useApp } from './contexto';

/**
 * Botón "atrás" de Android (en la APK):
 * 1. Si hay una hoja abierta, la cierra.
 * 2. En una pantalla de adentro (Agregar, Receta, Productos…), vuelve a la anterior.
 * 3. En Diario, Plan, Progreso o Perfil, va a Hoy (el inicio).
 * 4. En Hoy, la primera vez avisa; si se toca otra vez en 2 segundos, sale de la app.
 * En la web también escucha el evento "stoafit:atras" (lo usan las pruebas).
 */

/** Hojas abiertas, la última arriba: atrás cierra la de arriba */
const abiertas: (() => void)[] = [];

export function useCerrarConAtras(abierta: boolean, cerrar: () => void) {
  const ref = useRef(cerrar);
  ref.current = cerrar;
  useEffect(() => {
    if (!abierta) return;
    const f = () => ref.current();
    abiertas.push(f);
    return () => { const i = abiertas.lastIndexOf(f); if (i >= 0) abiertas.splice(i, 1); };
  }, [abierta]);
}

const PESTANAS = ['/diario', '/plan', '/progreso', '/perfil'];

export function useBotonAtras() {
  const nav = useNavigate();
  const loc = useLocation();
  const { aviso } = useApp();
  const ultimo = useRef(0);
  const estado = useRef({ loc, nav, aviso });
  estado.current = { loc, nav, aviso };

  useEffect(() => {
    function manejar() {
      const { loc, nav, aviso } = estado.current;
      if (abiertas.length) { abiertas[abiertas.length - 1](); return; }
      if (loc.pathname === '/' || (loc.pathname === '/conocerte' && !loc.search.includes('editar'))) {
        if (Date.now() - ultimo.current < 2000) { if (Capacitor.isNativePlatform()) AppNativa.exitApp(); return; }
        ultimo.current = Date.now();
        aviso('Tocá atrás otra vez para salir');
        return;
      }
      if (PESTANAS.includes(loc.pathname)) { nav('/', { replace: true }); return; }
      if (loc.key !== 'default') nav(-1);
      else nav('/', { replace: true });
    }
    window.addEventListener('stoafit:atras', manejar);
    let quitar: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      AppNativa.addListener('backButton', manejar).then((h) => { quitar = () => h.remove(); }).catch(() => undefined);
    }
    return () => { window.removeEventListener('stoafit:atras', manejar); quitar?.(); };
  }, []);
}
