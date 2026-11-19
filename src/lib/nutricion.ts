import { edad, redondear } from './logica';
import type {
  Actividad, Alimento, Dia, Genero, ItemComida, Macros, Metas, ObjetivoPeso, Perfil, TipoComida,
} from './tipos';

export const COMIDAS: { id: TipoComida; nombre: string; hora: string }[] = [
  { id: 'desayuno', nombre: 'Desayuno', hora: '7:00' },
  { id: 'almuerzo', nombre: 'Almuerzo', hora: '12:00' },
  { id: 'merienda', nombre: 'Merienda', hora: '16:30' },
  { id: 'cena', nombre: 'Cena', hora: '20:30' },
  { id: 'colacion', nombre: 'Colaciones', hora: 'Entre comidas' },
];
export const NOMBRE_COMIDA = Object.fromEntries(COMIDAS.map((c) => [c.id, c.nombre])) as Record<TipoComida, string>;

export const ACTIVIDADES: { v: Actividad; t: string; linea: string; factor: number }[] = [
  { v: 'sedentario', t: 'Sedentario', linea: 'Trabajo sentado, casi sin ejercicio', factor: 1.2 },
  { v: 'ligero', t: 'Ligero', linea: 'Caminatas o ejercicio 1 a 3 días por semana', factor: 1.375 },
  { v: 'moderado', t: 'Moderado', linea: 'Ejercicio 3 a 5 días por semana', factor: 1.55 },
  { v: 'activo', t: 'Activo', linea: 'Ejercicio intenso 6 a 7 días', factor: 1.725 },
  { v: 'muy-activo', t: 'Muy activo', linea: 'Trabajo físico + entrenamiento diario', factor: 1.9 },
];

export const OBJETIVOS: { v: ObjetivoPeso; t: string; linea: string; ajuste: number }[] = [
  { v: 'bajar', t: 'Bajar de peso', linea: 'Unos 400–500 g por semana', ajuste: -0.2 },
  { v: 'mantener', t: 'Mantener', linea: 'Comer en equilibrio', ajuste: 0 },
  { v: 'subir', t: 'Subir de peso', linea: 'Ganar masa de a poco', ajuste: 0.1 },
];

export interface DatosCuerpo { genero: Genero; edad: number; peso: number; altura: number; actividad: Actividad; objetivo: ObjetivoPeso }

/** Metabolismo basal con la fórmula de Mifflin-St Jeor (kcal/día) */
export function basal(d: Pick<DatosCuerpo, 'genero' | 'edad' | 'peso' | 'altura'>): number {
  return 10 * d.peso + 6.25 * d.altura - 5 * d.edad + (d.genero === 'hombre' ? 5 : -161);
}

/** Gasto total del día: basal × nivel de actividad */
export function gastoTotal(d: DatosCuerpo): number {
  return basal(d) * (ACTIVIDADES.find((a) => a.v === d.actividad)?.factor ?? 1.2);
}

/**
 * Meta diaria:
 *  - calorías: gasto total ajustado por el objetivo, nunca debajo de 1200 (mujer) / 1500 (hombre)
 *  - proteínas: 1,6 g por kg (1,8 si quiere subir); grasas: 30 % de las calorías; carbohidratos: el resto
 *  - agua: 35 ml por kg, redondeado a vasos de 250 ml
 */
export function calcularMetas(d: DatosCuerpo): Metas {
  const ajuste = OBJETIVOS.find((o) => o.v === d.objetivo)?.ajuste ?? 0;
  const minimo = d.genero === 'hombre' ? 1500 : 1200;
  const kcal = Math.max(minimo, Math.round((gastoTotal(d) * (1 + ajuste)) / 10) * 10);
  const prot = Math.round(d.peso * (d.objetivo === 'subir' ? 1.8 : 1.6));
  const gras = Math.round((kcal * 0.3) / 9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - gras * 9) / 4));
  const agua = Math.round((d.peso * 35) / 250) * 250;
  return { kcal, prot, carb, gras, agua };
}

/** Metas del perfil; si faltan datos, una meta general de 2000 kcal */
export const METAS_GENERALES: Metas = { kcal: 2000, prot: 75, carb: 250, gras: 67, agua: 2000 };

export function datosDelPerfil(p: Perfil, peso?: number): DatosCuerpo | null {
  if (!p.genero || !p.nacimiento || !p.altura || !peso) return null;
  return { genero: p.genero, edad: edad(p.nacimiento), peso, altura: p.altura, actividad: p.actividad ?? 'ligero', objetivo: p.objetivo ?? 'mantener' };
}

export function metasDe(p: Perfil): Metas {
  return p.metas ?? METAS_GENERALES;
}

/** Macros de una cantidad de un alimento */
export function macrosDe(a: Pick<Alimento, 'por100'>, gramos: number): Macros {
  const f = gramos / 100;
  return {
    kcal: Math.round(a.por100.kcal * f),
    prot: redondear(a.por100.prot * f, 1),
    carb: redondear(a.por100.carb * f, 1),
    gras: redondear(a.por100.gras * f, 1),
  };
}

export function itemDe(a: Alimento, porcion: string, cantidad: number, id: string): ItemComida {
  const p = a.porciones.find((x) => x.nombre === porcion) ?? a.porciones[0] ?? { nombre: '100 g', gramos: 100 };
  const gramos = Math.round(p.gramos * cantidad);
  return { id, alimentoId: a.id, nombre: a.nombre, cantidad, porcion: p.nombre, gramos, ...macrosDe(a, gramos) };
}

export const CERO: Macros = { kcal: 0, prot: 0, carb: 0, gras: 0 };

export function sumar(items: Macros[]): Macros {
  const t = items.reduce((s, i) => ({ kcal: s.kcal + i.kcal, prot: s.prot + i.prot, carb: s.carb + i.carb, gras: s.gras + i.gras }), CERO);
  return { kcal: Math.round(t.kcal), prot: redondear(t.prot, 1), carb: redondear(t.carb, 1), gras: redondear(t.gras, 1) };
}

export function totalesDia(comidas: Dia['comidas']): Macros {
  return sumar(Object.values(comidas).flat().filter(Boolean) as ItemComida[]);
}

export function diaVacio(fecha: string): Dia {
  return { fecha, comidas: {}, agua: 0, totales: { ...CERO }, actualizado: 0 };
}

export function cantidadItems(d: Dia): number {
  return Object.values(d.comidas).reduce((n, l) => n + (l?.length ?? 0), 0);
}

export function comidasRegistradas(d: Dia): number {
  return COMIDAS.filter((c) => (d.comidas[c.id]?.length ?? 0) > 0).length;
}

/**
 * Día cumplido: registró al menos 2 comidas y las calorías quedaron entre el 85 % y el 110 % de la meta.
 * Es la medida de templanza: ni de menos ni de más.
 */
export function diaCumplido(d: Dia, metas: Metas): boolean {
  if (comidasRegistradas(d) < 2) return false;
  const r = d.totales.kcal / metas.kcal;
  return r >= 0.85 && r <= 1.1;
}

export type EstadoMeta = 'falta' | 'justo' | 'pasado';
/** Cómo va un valor contra su meta */
export function estadoMeta(valor: number, meta: number): EstadoMeta {
  if (!meta) return 'falta';
  const r = valor / meta;
  if (r > 1.1) return 'pasado';
  if (r >= 0.85) return 'justo';
  return 'falta';
}

/** Reparto sugerido de calorías por comida */
export const REPARTO: Record<TipoComida, number> = { desayuno: 0.22, almuerzo: 0.33, merienda: 0.13, cena: 0.25, colacion: 0.07 };

/** Promedio de macros de una lista de días (solo los que tienen registros) */
export function promedio(dias: Dia[]): Macros & { n: number } {
  const con = dias.filter((d) => cantidadItems(d) > 0);
  if (!con.length) return { ...CERO, n: 0 };
  const t = sumar(con.map((d) => d.totales));
  return { kcal: Math.round(t.kcal / con.length), prot: redondear(t.prot / con.length, 1), carb: redondear(t.carb / con.length, 1), gras: redondear(t.gras / con.length, 1), n: con.length };
}

/** Porcentaje de calorías que aporta cada macro */
export function reparto(m: Macros): { prot: number; carb: number; gras: number } {
  const k = m.prot * 4 + m.carb * 4 + m.gras * 9;
  if (!k) return { prot: 0, carb: 0, gras: 0 };
  return { prot: Math.round((m.prot * 4 * 100) / k), carb: Math.round((m.carb * 4 * 100) / k), gras: Math.round((m.gras * 9 * 100) / k) };
}

/** Índice de masa corporal */
export function imc(peso: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return redondear(peso / (m * m), 1);
}
