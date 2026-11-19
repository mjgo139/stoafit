import { useCallback, useEffect, useRef, useState } from 'react';
import { agregarDia, claveDia, quitarDia } from '../lib/logica';
import { cantidadItems, diaCumplido, diaVacio, metasDe, totalesDia } from '../lib/nutricion';
import type { Dia, ItemComida, TipoComida } from '../lib/tipos';
import { useSesion } from './contexto';

/**
 * Un día del diario con sus cambios. Cada cambio guarda el día entero + el resumen del perfil
 * en una sola tanda (2 escrituras en Firestore).
 */
export function useDia(fecha = claveDia()) {
  const { repo, usuario, perfil, cambiarPerfilLocal } = useSesion();
  const [dia, setDia] = useState<Dia | null>(null);
  const ultimo = useRef<Dia | null>(null);
  // El resumen más reciente, para que dos cambios seguidos no se pisen
  const resumenRef = useRef(perfil.resumen);
  useEffect(() => { resumenRef.current = perfil.resumen; }, [perfil.resumen]);

  useEffect(() => {
    let vivo = true;
    setDia(null);
    repo.leerDia(usuario.uid, fecha).then((d) => {
      if (!vivo) return;
      const x = d ?? diaVacio(fecha);
      ultimo.current = x;
      setDia(x);
    }).catch(() => vivo && setDia(diaVacio(fecha)));
    return () => { vivo = false; };
  }, [repo, usuario.uid, fecha]);

  const guardar = useCallback(async (cambio: (d: Dia) => Dia) => {
    const antes = ultimo.current ?? diaVacio(fecha);
    const metas = metasDe(perfil);
    const nuevo = cambio(antes);
    nuevo.totales = totalesDia(nuevo.comidas);
    nuevo.metas = metas;
    nuevo.actualizado = Date.now();
    ultimo.current = nuevo;
    setDia(nuevo);
    const r = resumenRef.current;
    const conAntes = cantidadItems(antes) > 0;
    const conAhora = cantidadItems(nuevo) > 0;
    const resumen = {
      dias: conAhora ? agregarDia(r.dias, fecha) : quitarDia(r.dias, fecha),
      cumplidos: diaCumplido(nuevo, metas) ? agregarDia(r.cumplidos, fecha) : quitarDia(r.cumplidos, fecha),
      total: Math.max(0, r.total + (conAhora && !conAntes ? 1 : !conAhora && conAntes ? -1 : 0)),
    };
    resumenRef.current = resumen;
    cambiarPerfilLocal({ resumen });
    await repo.guardarDia(usuario.uid, nuevo, resumen);
    return { antes: diaCumplido(antes, metas), ahora: diaCumplido(nuevo, metas) };
  }, [repo, usuario.uid, perfil, fecha, cambiarPerfilLocal]);

  const agregar = useCallback((comida: TipoComida, items: ItemComida[]) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: [...(d.comidas[comida] ?? []), ...items] } })), [guardar]);

  const quitar = useCallback((comida: TipoComida, id: string) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: (d.comidas[comida] ?? []).filter((i) => i.id !== id) } })), [guardar]);

  const reemplazar = useCallback((comida: TipoComida, item: ItemComida) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: (d.comidas[comida] ?? []).map((i) => (i.id === item.id ? item : i)) } })), [guardar]);

  const agua = useCallback((ml: number) => guardar((d) => ({ ...d, agua: Math.max(0, Math.min(6000, ml)) })), [guardar]);

  const reemplazarComidas = useCallback((comidas: Dia['comidas']) => guardar((d) => ({ ...d, comidas })), [guardar]);

  return { dia, agregar, quitar, reemplazar, agua, reemplazarComidas };
}
