import { buscarAlimento } from '../lib/alimentos';
import { agregarDia, claveDia, sumarDias } from '../lib/logica';
import { calcularMetas, diaCumplido, itemDe, totalesDia } from '../lib/nutricion';
import { PLANTILLAS } from '../lib/plantillas';
import type { ComidaGuardada, Dia, ItemComida, Perfil, Plan, Producto, RegistroCuerpo, Reporte, TipoComida } from '../lib/tipos';
import type { Usuario } from './repo';

/** Cuenta de ejemplo del modo prueba (datos inventados) */
export const USUARIO_PRUEBA: Usuario = { uid: 'u-sofia', email: 'sofia@ejemplo.com', nombre: 'Sofía' };
export const CLAVE_PRUEBA = 'stoafit';

export function perfilInicial(u: Usuario): Perfil {
  return {
    uid: u.uid,
    nombre: u.nombre || (u.invitado ? 'Invitado' : ''),
    email: u.email,
    tema: 'sistema',
    unidad: 'kg',
    recordatorio: { activo: false, hora: '12:00', dias: [1, 2, 3, 4, 5, 6, 7] },
    creado: Date.now(),
    resumen: { dias: [], cumplidos: [], total: 0 },
  };
}

/** Azar repetible para que los datos de ejemplo sean siempre iguales */
function azar(semilla: number) {
  let s = semilla;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/** Menús variados de comida de casa para armar los días de ejemplo */
const OPCIONES: Record<TipoComida, [string, string, number][][]> = {
  desayuno: [
    [['cocido-leche', '1 taza', 1], ['chipa', '1 unidad mediana', 1]],
    [['cafe-con-leche', '1 taza', 1], ['pan-integral', '2 rodajas', 1], ['queso-py', '1 rodaja', 1]],
    [['yogur-natural', '1 pote', 1], ['avena', '½ taza', 1], ['banana', '1 unidad', 1]],
    [['cocido-leche', '1 taza', 1], ['pan-felipe', '1 unidad', 1], ['mermelada', '1 cucharada', 1]],
  ],
  almuerzo: [
    [['pollo-pechuga', '1 pechuga', 1], ['arroz', '1 taza', 1], ['ensalada-mixta', '1 plato', 1]],
    [['carne-magra', '1 bife', 1], ['mandioca', '1 trozo', 1], ['ensalada-mixta', '1 plato', 1]],
    [['guiso-arroz', '1 plato', 1], ['ensalada-mixta', '1 plato', 1]],
    [['milanesa-pollo', '1 unidad', 1], ['pure-papa', '1 porción', 1]],
    [['bife-koygua', '1 porción', 1], ['arroz', '1 taza', 1]],
  ],
  merienda: [
    [['terere', '1 jarra', 1], ['chipa', '1 unidad mediana', 1]],
    [['yogur-bebible', '1 vaso', 1], ['manzana', '1 unidad', 1]],
    [['cocido-leche', '1 taza', 1], ['galleta', '3 unidades', 1]],
  ],
  cena: [
    [['vori-vori', '1 plato hondo', 1]],
    [['tortilla-py', '1 unidad', 2], ['ensalada-mixta', '1 plato', 1]],
    [['sopa-paraguaya', '1 porción', 1], ['ensalada-mixta', '1 plato', 1], ['naranja', '1 unidad', 1]],
    [['empanada-carne', '1 unidad', 2], ['ensalada-mixta', '1 plato', 1]],
  ],
  colacion: [
    [['banana', '1 unidad', 1]],
    [['mani', '1 puñado', 1]],
    [['mamon', '1 taza', 1]],
  ],
};

export interface DatosEjemplo { dias: Dia[]; cuerpo: RegistroCuerpo[]; perfil: Perfil; planes: Plan[]; guardadas: ComidaGuardada[] }

/**
 * 6 semanas de registros inventados: casi todos los días con 3 a 5 comidas, algunos días sin registrar,
 * peso bajando de a poco. `hoyIncluido`: si hoy ya tiene desayuno cargado.
 */
export function datosDePrueba(u: Usuario, nombre: string, ahora = Date.now(), opciones: { semanas?: number; semilla?: number; desfaseDias?: number } = {}): DatosEjemplo {
  const r = azar(opciones.semilla ?? 7);
  const hoy = claveDia(ahora);
  const ultimo = sumarDias(hoy, -(opciones.desfaseDias ?? 0));
  const perfil = perfilInicial(u);
  perfil.nombre = nombre;
  perfil.conocido = true;
  perfil.genero = 'mujer';
  perfil.nacimiento = '1994-05-12';
  perfil.altura = 165;
  perfil.actividad = 'ligero';
  perfil.objetivo = 'bajar';
  perfil.favoritos = ['cocido-leche', 'chipa', 'terere', 'pollo-pechuga', 'ensalada-mixta'];
  perfil.creado = ahora - 50 * 86_400_000;
  const pesoInicial = 72.4;
  const semanas = opciones.semanas ?? 6;
  const total = semanas * 7;
  const metas = calcularMetas({ genero: 'mujer', edad: 32, peso: pesoInicial - 2.5, altura: 165, actividad: 'ligero', objetivo: 'bajar' });
  perfil.metas = metas;
  let n = 0;
  const id = () => `e${n++}`;
  const dias: Dia[] = [];
  for (let i = total; i >= 0; i--) {
    const fecha = sumarDias(ultimo, -i);
    if (i > 0 && r() < 0.12) continue; // algunos días sin registrar
    const comidas: Dia['comidas'] = {};
    const tipos: TipoComida[] = i === 0 && !opciones.desfaseDias ? ['desayuno'] : ['desayuno', 'almuerzo', 'merienda', 'cena', ...(r() < 0.5 ? ['colacion' as const] : [])];
    for (const t of tipos) {
      if (t === 'merienda' && r() < 0.2) continue;
      const menu = OPCIONES[t][Math.floor(r() * OPCIONES[t].length)];
      comidas[t] = menu.flatMap(([aid, p, c]) => { const a = buscarAlimento(aid); return a ? [itemDe(a, p, c, id())] : []; });
    }
    const esHoy = i === 0 && !opciones.desfaseDias;
    const d: Dia = { fecha, comidas, agua: esHoy ? 0 : (4 + Math.floor(r() * 5)) * 250, totales: totalesDia(comidas), metas, actualizado: ahora - i * 86_400_000 };
    dias.push(d);
    perfil.resumen.dias = agregarDia(perfil.resumen.dias, fecha);
    if (diaCumplido(d, metas)) perfil.resumen.cumplidos = agregarDia(perfil.resumen.cumplidos, fecha);
    perfil.resumen.total++;
  }
  const cuerpo: RegistroCuerpo[] = [];
  for (let s = semanas; s >= 0; s--) {
    const fecha = sumarDias(ultimo, -s * 7);
    const peso = Math.round((pesoInicial - (semanas - s) * 0.45 + (r() - 0.5) * 0.4) * 10) / 10;
    cuerpo.push({ id: fecha, fecha: +new Date(fecha + 'T08:00'), peso, ...(s % 2 === 0 ? { cintura: Math.round((84 - (semanas - s) * 0.6) * 10) / 10, cadera: Math.round((100 - (semanas - s) * 0.4) * 10) / 10 } : {}) });
  }
  const p = PLANTILLAS[0];
  const planes: Plan[] = [{
    id: 'plan-propio', nombre: 'Mi semana liviana', descripcion: 'Lo que me funciona para no picotear.',
    comidas: {
      desayuno: 'Cocido con leche + 1 chipa o 2 rodajas de pan integral con queso.',
      almuerzo: 'Medio plato de ensalada, una porción de carne o pollo y 1 taza de arroz o mandioca.',
      merienda: 'Tereré con una fruta.',
      cena: 'Vorí vorí o tortilla con ensalada.',
    },
    creado: ahora - 20 * 86_400_000,
  }];
  void p;
  const fila = (aid: string, por: string, c: number) => { const a = buscarAlimento(aid)!; return itemDe(a, por, c, id()); };
  const guardadas: ComidaGuardada[] = [
    { id: 'g-desayuno', nombre: 'Mi desayuno de siempre', creado: ahora - 30 * 86_400_000, items: [fila('cocido-leche', '1 taza', 1), fila('chipa', '1 unidad mediana', 1), fila('banana', '1 unidad', 1)] },
  ];
  return { dias, cuerpo, perfil, planes, guardadas };
}

export type { ItemComida };

/** Base compartida del modo prueba (productos inventados) */
export const PRODUCTOS_COMPARTIDOS_PRUEBA: Producto[] = [
  {
    codigo: '7840000000031', nombre: 'Pan lactal integral', marca: 'Panificadora Ejemplo', verificado: true, creadoPor: 'u-sofia', verificadoPor: 'u-sofia',
    creado: 1795000000000, actualizado: 1795000000000, via: 'foto',
    por100: { kcal: 250, prot: 10, carb: 43, gras: 4 }, porciones: [{ nombre: '2 rodajas', gramos: 50 }, { nombre: '100 g', gramos: 100 }],
  },
  {
    codigo: '7840000000048', nombre: 'Galletitas de maíz', marca: 'Molino Ejemplo', verificado: false, creadoPor: 'u-lucas',
    creado: 1795050000000, actualizado: 1795050000000, via: 'manual',
    por100: { kcal: 440, prot: 7, carb: 70, gras: 15 }, porciones: [{ nombre: '4 galletitas', gramos: 30 }, { nombre: '100 g', gramos: 100 }],
  },
];

export const REPORTES_PRUEBA: Reporte[] = [
  { id: 'rep-1', codigo: '7840000000048', nombre: 'Galletitas de maíz', motivo: 'Las calorías no coinciden con la etiqueta (dice 132 por porción).', uid: 'u-lucas', fecha: 1795060000000 },
];

/** Lo que "lee" la IA en el modo prueba (etiqueta de ejemplo) */
export const LECTURA_PRUEBA = { nombre: 'Pan de leche', marca: 'Panificadora Ejemplo', porcion: '1½ unidad', gramos: 50, kcal: 145, prot: 3.5, carb: 27, gras: 2.6 };
