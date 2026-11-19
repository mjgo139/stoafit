import { edad, redondear } from './logica';
import type {
  Actividad, Alimento, ComidaDelDia, Dia, Genero, ItemComida, Macros, Metas, ObjetivoPeso, Perfil, Porcion, Receta, TipoComida,
} from './tipos';

export const COMIDAS: { id: TipoComida; nombre: string; hora: string }[] = [
  { id: 'desayuno', nombre: 'Desayuno', hora: '7:00' },
  { id: 'almuerzo', nombre: 'Almuerzo', hora: '12:00' },
  { id: 'merienda', nombre: 'Merienda', hora: '16:30' },
  { id: 'cena', nombre: 'Cena', hora: '20:30' },
  { id: 'colacion', nombre: 'Colaciones', hora: 'Entre comidas' },
];
export const NOMBRE_COMIDA = Object.fromEntries(COMIDAS.map((c) => [c.id, c.nombre])) as Record<TipoComida, string>;

/** Máximo de comidas por día (también lo controla la regla de Firestore) */
export const MAX_COMIDAS = 10;

/** Las comidas del día de la persona: las suyas, o las 5 de siempre */
export function comidasDe(p?: Pick<Perfil, 'comidas'> | null): ComidaDelDia[] {
  return p?.comidas?.length ? p.comidas : COMIDAS.map(({ id, nombre }) => ({ id, nombre }));
}

/** Nombre de una comida: el suyo, el de siempre, o "Otra comida" si la quitó */
export function nombreComida(lista: ComidaDelDia[], id: TipoComida): string {
  return lista.find((c) => c.id === id)?.nombre ?? NOMBRE_COMIDA[id] ?? 'Otra comida';
}

/** Las comidas que se muestran en un día: las de la persona y, al final, las quitadas que todavía tienen algo */
export function comidasDelDia(lista: ComidaDelDia[], d?: Pick<Dia, 'comidas'> | null): ComidaDelDia[] {
  const extra = Object.entries(d?.comidas ?? {}).filter(([id, l]) => (l?.length ?? 0) > 0 && !lista.some((c) => c.id === id))
    .map(([id]) => ({ id, nombre: nombreComida(lista, id) }));
  return [...lista, ...extra];
}

/** Reparto sugerido de calorías entre las comidas de la persona (suma 1) */
export function repartoDe(lista: ComidaDelDia[]): Record<TipoComida, number> {
  const pesos = lista.map((c) => REPARTO[c.id] ?? 1 / Math.max(1, lista.length));
  const t = pesos.reduce((s, x) => s + x, 0) || 1;
  return Object.fromEntries(lista.map((c, i) => [c.id, pesos[i] / t]));
}

/** Limpia la lista que arma la persona: nombres cortos y no vacíos, sin ids repetidos, como mucho MAX_COMIDAS */
export function limpiarComidas(lista: ComidaDelDia[]): ComidaDelDia[] {
  const vistos = new Set<string>();
  return lista.map((c) => ({ id: c.id, nombre: c.nombre.trim().slice(0, 30) }))
    .filter((c) => c.nombre && /^[a-z0-9-]{2,20}$/.test(c.id) && !vistos.has(c.id) && vistos.add(c.id))
    .slice(0, MAX_COMIDAS);
}

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

/** Unidad suelta de un alimento para pesar a gusto: ml si es líquido, g si no */
export function unidadSuelta(a: Pick<Alimento, 'porciones'>): 'g' | 'ml' {
  return a.porciones.some((p) => p.nombre === '100 ml') ? 'ml' : 'g';
}

/** Porción "g" o "ml": la cantidad son gramos (o ml) sueltos */
export const esSuelta = (porcion: string) => porcion === 'g' || porcion === 'ml';

export function itemDe(a: Alimento, porcion: string, cantidad: number, id: string): ItemComida {
  const p = esSuelta(porcion) ? { nombre: porcion, gramos: 1 } : a.porciones.find((x) => x.nombre === porcion) ?? a.porciones[0] ?? { nombre: '100 g', gramos: 100 };
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
  return Object.values(d.comidas).filter((l) => (l?.length ?? 0) > 0).length;
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

// ── Repetir, recetas y etiquetas (v1.1.0) ──

/** Resumen del perfil después de cambiar un día: días con registros, días cumplidos y total */
export function nuevoResumen(r: Perfil['resumen'], antes: Dia, nuevo: Dia, metas: Metas): Perfil['resumen'] {
  const conAntes = cantidadItems(antes) > 0;
  const conAhora = cantidadItems(nuevo) > 0;
  const f = nuevo.fecha;
  const sin = (l: string[]) => l.filter((d) => d !== f);
  const con = (l: string[]) => [...new Set([...l, f])].sort().slice(-120);
  return {
    dias: conAhora ? con(r.dias) : sin(r.dias),
    cumplidos: diaCumplido(nuevo, metas) ? con(r.cumplidos) : sin(r.cumplidos),
    total: Math.max(0, r.total + (conAhora && !conAntes ? 1 : !conAhora && conAntes ? -1 : 0)),
  };
}

/** Copia ítems con ids nuevos (para repetir sin que dos registros compartan id) */
export function copiarItems(items: ItemComida[], nuevoId: () => string): ItemComida[] {
  return items.map((i) => ({ ...i, id: nuevoId() }));
}

/** Suma todas las comidas de un día a otro (repetir el día de ayer) */
export function sumarComidas(destino: Dia['comidas'], origen: Dia['comidas'], nuevoId: () => string): Dia['comidas'] {
  const r: Dia['comidas'] = { ...destino };
  for (const [c, l] of Object.entries(origen) as [TipoComida, ItemComida[] | undefined][]) {
    if (l?.length) r[c] = [...(r[c] ?? []), ...copiarItems(l, nuevoId)];
  }
  return r;
}

/**
 * Convierte una receta en un alimento propio: los macros del total se pasan a "cada 100 g"
 * usando el peso de la fuente terminada (o la suma de los ingredientes).
 */
export function alimentoDeReceta(id: string, nombre: string, receta: Receta): Alimento {
  const total = sumar(receta.ingredientes);
  const crudo = receta.ingredientes.reduce((s, i) => s + i.gramos, 0);
  const peso = receta.pesoTotal && receta.pesoTotal > 0 ? receta.pesoTotal : crudo || 100;
  const f = 100 / peso;
  const porciones = Math.max(1, receta.porciones);
  return {
    id, nombre, grupo: 'recetas', propio: true, fuente: 'receta', receta,
    por100: { kcal: Math.round(total.kcal * f), prot: redondear(total.prot * f, 1), carb: redondear(total.carb * f, 1), gras: redondear(total.gras * f, 1) },
    porciones: [{ nombre: '1 porción', gramos: Math.round(peso / porciones) }, { nombre: 'Receta entera', gramos: Math.round(peso) }, { nombre: '100 g', gramos: 100 }],
  };
}

/** Lo que se copia de una etiqueta nutricional */
export interface Etiqueta {
  nombre: string;
  marca?: string;
  codigo?: string;
  /** 'porcion' = los valores son de la porción indicada; '100' = cada 100 g / 100 ml */
  modo: 'porcion' | '100';
  porcion: string;
  gramos: number;
  kcal: number; prot: number; carb: number; gras: number;
  /** Otras medidas caseras: "1 paquete" = 200 g */
  otras?: Porcion[];
}

/** Arma un alimento propio a partir de la etiqueta del envase */
export function alimentoDeEtiqueta(id: string, e: Etiqueta, fuente: Alimento['fuente'] = 'manual'): Alimento {
  const f = e.modo === '100' ? 1 : 100 / Math.max(1, e.gramos);
  const porciones: Porcion[] = [];
  if (e.porcion.trim() && e.gramos > 0) porciones.push({ nombre: e.porcion.trim(), gramos: Math.round(e.gramos) });
  for (const o of e.otras ?? []) if (o.nombre.trim() && o.gramos > 0 && !porciones.some((p) => p.nombre === o.nombre.trim())) porciones.push({ nombre: o.nombre.trim(), gramos: Math.round(o.gramos) });
  if (!porciones.some((p) => p.nombre === '100 g')) porciones.push({ nombre: '100 g', gramos: 100 });
  return {
    id, nombre: e.nombre.trim().slice(0, 80), grupo: e.codigo ? 'envasados' : 'tipicos', propio: true, fuente,
    ...(e.marca?.trim() ? { marca: e.marca.trim().slice(0, 60) } : {}),
    ...(e.codigo?.trim() ? { codigo: e.codigo.trim() } : {}),
    por100: { kcal: Math.round(e.kcal * f), prot: redondear(e.prot * f, 1), carb: redondear(e.carb * f, 1), gras: redondear(e.gras * f, 1) },
    porciones,
  };
}

/** Para editar: vuelve a armar la etiqueta "por porción" desde un alimento propio */
export function etiquetaDe(a: Alimento): Etiqueta {
  const p = a.porciones[0] ?? { nombre: '100 g', gramos: 100 };
  const m = macrosDe(a, p.gramos);
  return {
    nombre: a.nombre, marca: a.marca, codigo: a.codigo, modo: 'porcion', porcion: p.nombre, gramos: p.gramos, ...m,
    otras: a.porciones.slice(1).filter((x) => x.nombre !== '100 g'),
  };
}

/** Qué parte de las calorías viene de cada macro (proteínas y carbohidratos 4 kcal/g, grasas 9 kcal/g) */
export function repartoMacros(m: Macros): { prot: number; carb: number; gras: number } {
  const p = m.prot * 4, c = m.carb * 4, g = m.gras * 9;
  const t = p + c + g;
  if (!t) return { prot: 0, carb: 0, gras: 0 };
  const prot = Math.round((p / t) * 100), gras = Math.round((g / t) * 100);
  return { prot, carb: 100 - prot - gras, gras };
}

/**
 * Un alimento armado desde lo que quedó registrado en el diario, para poder editarlo con la misma pantalla de agregar
 * aunque no esté en la biblioteca ni en el teléfono (alimentos propios, productos compartidos). No lee nada.
 */
export function alimentoDesdeItem(i: ItemComida): Alimento {
  const f = i.gramos > 0 ? 100 / i.gramos : 0;
  const por100 = { kcal: Math.round(i.kcal * f), prot: redondear(i.prot * f, 1), carb: redondear(i.carb * f, 1), gras: redondear(i.gras * f, 1) };
  const porciones: Porcion[] = esSuelta(i.porcion) || !i.cantidad
    ? [{ nombre: '100 g', gramos: 100 }]
    : [{ nombre: i.porcion, gramos: Math.round((i.gramos / i.cantidad) * 10) / 10 }, { nombre: '100 g', gramos: 100 }];
  return { id: i.alimentoId, nombre: i.nombre, grupo: 'envasados', por100, porciones };
}

/** Para editar: el alimento del ítem tiene que incluir la medida con la que se registró */
export function conPorcionDe(a: Alimento, i: ItemComida): Alimento {
  if (esSuelta(i.porcion) || a.porciones.some((p) => p.nombre === i.porcion) || !i.cantidad) return a;
  return { ...a, porciones: [{ nombre: i.porcion, gramos: Math.round((i.gramos / i.cantidad) * 10) / 10 }, ...a.porciones] };
}
