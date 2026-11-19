import { useCallback, useEffect, useRef, useState } from 'react';
import { claveDia, nuevoId } from '../lib/logica';
import { copiarItems, diaCumplido, diaVacio, metasDe, nuevoResumen, sumarComidas, totalesDia } from '../lib/nutricion';
import type { Dia, ItemComida, Perfil, TipoComida } from '../lib/tipos';
import type { Repo } from '../data/repo';
import { useSesion } from './contexto';

/** El resumen más reciente, compartido por todas las pantallas, para que dos cambios seguidos no se pisen */
let resumenVivo: { uid: string; r: Perfil['resumen'] } | null = null;

/** Aplica un cambio a un día y guarda el día + el resumen del perfil en una sola tanda (2 escrituras) */
async function cambiarDia(
  repo: Repo, uid: string, perfil: Perfil, fecha: string, antes: Dia, cambio: (d: Dia) => Dia,
  local: (r: Perfil['resumen']) => void,
) {
  const metas = metasDe(perfil);
  const nuevo = cambio(antes);
  nuevo.totales = totalesDia(nuevo.comidas);
  nuevo.metas = metas;
  nuevo.actualizado = Date.now();
  nuevo.fecha = fecha;
  const base = resumenVivo?.uid === uid ? resumenVivo.r : perfil.resumen;
  const resumen = nuevoResumen(base, antes, nuevo, metas);
  resumenVivo = { uid, r: resumen };
  local(resumen);
  await repo.guardarDia(uid, nuevo, resumen);
  return { nuevo, antes: diaCumplido(antes, metas), ahora: diaCumplido(nuevo, metas) };
}

/** Un día del diario con sus cambios */
export function useDia(fecha = claveDia()) {
  const { repo, usuario, perfil, cambiarPerfilLocal } = useSesion();
  const [dia, setDia] = useState<Dia | null>(null);
  const ultimo = useRef<Dia | null>(null);

  useEffect(() => { resumenVivo = { uid: usuario.uid, r: perfil.resumen }; }, [usuario.uid, perfil.resumen]);

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
    const r = await cambiarDia(repo, usuario.uid, perfil, fecha, antes, cambio, (resumen) => cambiarPerfilLocal({ resumen }));
    ultimo.current = r.nuevo;
    setDia(r.nuevo);
    return { antes: r.antes, ahora: r.ahora };
  }, [repo, usuario.uid, perfil, fecha, cambiarPerfilLocal]);

  const agregar = useCallback((comida: TipoComida, items: ItemComida[]) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: [...(d.comidas[comida] ?? []), ...items] } })), [guardar]);

  const quitar = useCallback((comida: TipoComida, id: string) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: (d.comidas[comida] ?? []).filter((i) => i.id !== id) } })), [guardar]);

  const reemplazar = useCallback((comida: TipoComida, item: ItemComida) =>
    guardar((d) => ({ ...d, comidas: { ...d.comidas, [comida]: (d.comidas[comida] ?? []).map((i) => (i.id === item.id ? item : i)) } })), [guardar]);

  const agua = useCallback((ml: number) => guardar((d) => ({ ...d, agua: Math.max(0, Math.min(6000, ml)) })), [guardar]);

  const reemplazarComidas = useCallback((comidas: Dia['comidas']) => guardar((d) => ({ ...d, comidas })), [guardar]);

  /** Suma todas las comidas de otro día a este (repetir el día de ayer) */
  const sumarDia = useCallback((origen: Dia) => guardar((d) => ({ ...d, comidas: sumarComidas(d.comidas, origen.comidas, nuevoId) })), [guardar]);

  return { dia, agregar, quitar, reemplazar, agua, reemplazarComidas, sumarDia };
}

/** Copiar ítems a cualquier día y comida (copiar a mañana, la cena de ayer al almuerzo de hoy…) */
export function useCopiar() {
  const { repo, usuario, perfil, cambiarPerfilLocal } = useSesion();
  return useCallback(async (fecha: string, comida: TipoComida, items: ItemComida[]) => {
    const antes = (await repo.leerDia(usuario.uid, fecha)) ?? diaVacio(fecha);
    await cambiarDia(repo, usuario.uid, perfil, fecha, antes,
      (d) => ({ ...d, comidas: { ...d.comidas, [comida]: [...(d.comidas[comida] ?? []), ...copiarItems(items, nuevoId)] } }),
      (resumen) => cambiarPerfilLocal({ resumen }));
  }, [repo, usuario.uid, perfil, cambiarPerfilLocal]);
}
