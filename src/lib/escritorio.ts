/**
 * Widget para Windows (Rainmeter) de StoaFit (v1.20.0, pedido del dueño; motor común en familia/escritorio.ts).
 * Qué muestra:
 *  - Lista "Hoy": "HOY · 1.250 DE 2.100 KCAL", la meta del día, el registro y tus comidas de hoy con sus calorías.
 *  - Tarjetas con las últimas 5 semanas: "Meta del día" (verde = día cumplido · rojo = no) y
 *    "Registro diario" (verde = anotaste algo ese día). Racha en días.
 * Todo sale del perfil (resumen.dias y resumen.cumplidos) y del día de hoy: no hace falta leer más días.
 */
import { FIGURAS } from '../../familia/emblema.mjs';
import { fechasGrilla, type AppEscritorio, type ColorFila, type FilaEscritorio, type ResumenEscritorio } from '../../familia/escritorio';
import { claveDia, formatoNumero, hastaHoy, racha, sumarDias } from './logica';
import { comidasDe, comidasDelDia, comidasRegistradas, diaCumplido, metasDe, sumar } from './nutricion';
import type { Dia, ItemComida, Perfil } from './tipos';

export const DIRECCION_STOAFIT = 'https://stoafit-app.web.app';

export const APP_ESCRITORIO = (proyecto: string): AppEscritorio => ({
  nombre: 'StoaFit',
  proyecto,
  url: DIRECCION_STOAFIT,
  figura: FIGURAS.manzana,
  singular: 'meta',
  accionPendiente: 'Registrar ◇',
  informacion: 'Tus calorías de hoy, tu racha y las últimas 5 semanas.',
});

export const CLAVE_ESCRITORIO = 'stoafit.escritorio.ultimo';
const COLORES: ColorFila[] = ['Serie1', 'Serie2', 'Serie3', 'Serie4'];

export function resumenStoaFit(perfil: Perfil, dia: Dia | null, ahora = Date.now()): ResumenEscritorio {
  const hoy = claveDia(ahora);
  const metas = metasDe(perfil);
  const creado = perfil.creado ? claveDia(perfil.creado) : '0000-00-00';
  const registrados = new Set(hastaHoy(perfil.resumen.dias, hoy));
  const cumplidos = new Set(hastaHoy(perfil.resumen.cumplidos, hoy));
  const kcal = dia?.totales.kcal ?? 0;
  const lista = comidasDelDia(comidasDe(perfil), dia);
  const nComidas = dia ? comidasRegistradas(dia) : 0;
  const cumplidoHoy = dia ? diaCumplido(dia, metas) : cumplidos.has(hoy);
  const registroHoy = nComidas > 0 || registrados.has(hoy);
  const grilla = fechasGrilla(hoy);

  const dias = (set: Set<string>, hecho: boolean) => grilla.map((f) => {
    if (f > hoy) return 'f';
    if (f === hoy) return hecho ? '1' : 'p';
    if (f < creado) return '-';
    return set.has(f) ? '1' : '0';
  }).join('');
  const pct = (set: Set<string>, hecho: boolean) => {
    let n = 0, total = 0;
    for (let k = 0; k < 30; k++) {
      const f = sumarDias(hoy, -k);
      if (f < creado) break;
      if (f === hoy && !hecho) continue;
      total++;
      if (f === hoy ? hecho : set.has(f)) n++;
    }
    return total ? (n / total) * 100 : 0;
  };
  const conHoy = (set: Set<string>, hecho: boolean) => [...set, ...(hecho ? [hoy] : [])];

  const meta: FilaEscritorio = {
    id: 'meta',
    nombre: 'Meta del día',
    estado: cumplidoHoy ? '1' : '0',
    racha: racha(conHoy(cumplidos, cumplidoHoy), hoy),
    color: 'Oro',
    subtitulo: `META ${formatoNumero(metas.kcal)} KCAL · ${formatoNumero(metas.prot)} G PROTEÍNA`,
    dias: dias(cumplidos, cumplidoHoy),
    pct: pct(cumplidos, cumplidoHoy),
    derecha: `${formatoNumero(kcal)}/${formatoNumero(metas.kcal)}`,
    ruta: '/diario',
    tarjeta: true,
    unidad: 'DÍAS',
  };
  const registro: FilaEscritorio = {
    id: 'registro',
    nombre: 'Registro diario',
    estado: registroHoy ? '1' : '0',
    racha: racha(conHoy(registrados, registroHoy), hoy),
    color: 'Serie1',
    subtitulo: `${nComidas} DE ${lista.length} COMIDAS HOY`,
    dias: dias(registrados, registroHoy),
    pct: pct(registrados, registroHoy),
    derecha: `${nComidas}/${lista.length}`,
    ruta: '/diario',
    tarjeta: true,
    unidad: 'DÍAS',
  };
  // Comidas de hoy: solo en la lista (no tienen historia propia)
  const comidas = lista.slice(0, 6).map((c, i): FilaEscritorio => {
    const items = (dia?.comidas[c.id] ?? []) as ItemComida[];
    const k = items.length ? sumar(items).kcal : 0;
    return {
      id: c.id, nombre: c.nombre, estado: items.length ? '1' : '0', racha: 0, color: COLORES[(i + 1) % COLORES.length],
      subtitulo: '', dias: '', pct: 0, derecha: items.length ? `${formatoNumero(k)} kcal` : '—', ruta: '/diario', tarjeta: false,
    };
  });

  return {
    nombre: (perfil.nombre || 'Invitado').split(' ')[0],
    hoy,
    resumen: `HOY · ${formatoNumero(kcal)} DE ${formatoNumero(metas.kcal)} KCAL${cumplidoHoy ? ' · CUMPLIDO' : ''}`,
    barra: metas.kcal ? Math.min(100, (kcal / metas.kcal) * 100) : 0,
    unidadRacha: 'DÍAS',
    filas: [meta, registro, ...comidas],
  };
}
