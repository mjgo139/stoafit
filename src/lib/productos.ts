import { redondear } from './logica';
import { alimentoDeEtiqueta, type Etiqueta } from './nutricion';
import { normalizar } from './alimentos';
import type { Alimento, Producto } from './tipos';

/** Id de un producto compartido cuando se usa como alimento: siempre derivado del código */
export const idProducto = (codigo: string) => `cod-${codigo}`;
export const codigoDeId = (id: string) => (id.startsWith('cod-') ? id.slice(4) : null);

/** Un código de barras válido para la base compartida (EAN-8, UPC-A, EAN-13, GTIN-14) */
export const CODIGO_VALIDO = /^[0-9]{8}$|^[0-9]{12,14}$/;
/** Alimento compartido SIN código de barras (v1.15.0): su llave es "n-" + 10 letras/números al azar */
export const ID_SIN_CODIGO = /^n-[a-z0-9]{10}$/;
export const esLlaveProducto = (c: string) => CODIGO_VALIDO.test(c) || ID_SIN_CODIGO.test(c);
export function nuevaLlaveSinCodigo(): string {
  const l = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'n-';
  for (let i = 0; i < 10; i++) s += l[Math.floor(Math.random() * l.length)];
  return s;
}

export function alimentoDeProducto(p: Producto): Alimento {
  return {
    id: idProducto(p.codigo), nombre: p.nombre, grupo: 'envasados', ...(CODIGO_VALIDO.test(p.codigo) ? { codigo: p.codigo } : {}), compartido: true, verificado: p.verificado,
    ...(p.marca ? { marca: p.marca } : {}), por100: p.por100, porciones: p.porciones,
  };
}

/**
 * Búsqueda por nombre en la base compartida: cada producto guarda los comienzos (de 3 a 15 letras)
 * de cada palabra de su nombre y marca, sin tildes. Firestore busca con "array-contains" (1 consulta, pocas lecturas).
 */
export function prefijosDe(nombre: string, marca = ''): string[] {
  const set = new Set<string>();
  for (const w of normalizar(`${nombre} ${marca}`).split(/[^a-z0-9ñ]+/)) {
    for (let i = 3; i <= Math.min(w.length, 15); i++) set.add(w.slice(0, i));
    if (set.size >= 60) break;
  }
  return [...set].slice(0, 60);
}
/** La palabra más larga de lo escrito (3 a 15 letras) es la que se busca en la base; null si es muy corta */
export function claveBusqueda(texto: string): string | null {
  const w = normalizar(texto).split(/[^a-z0-9ñ]+/).sort((a, b) => b.length - a.length)[0] ?? '';
  return w.length >= 3 ? w.slice(0, 15) : null;
}

/** Arma el producto a partir de la etiqueta; el código manda y no se puede cambiar después */
export function productoDeEtiqueta(e: Etiqueta, uid: string, verificado: boolean, via: Producto['via'], ahora = Date.now(), previo?: Producto): Producto {
  // Con código de barras, el código es la llave (un código = un producto). Sin código, una llave nueva al azar.
  if (e.codigo && !esLlaveProducto(e.codigo)) throw new Error('El código de barras no es válido');
  const llave = previo?.codigo ?? (e.codigo || nuevaLlaveSinCodigo());
  const a = alimentoDeEtiqueta('x', e);
  return {
    codigo: llave, nombre: a.nombre, ...(a.marca ? { marca: a.marca } : {}), por100: a.por100, porciones: a.porciones,
    verificado, creadoPor: previo?.creadoPor ?? uid, creado: previo?.creado ?? ahora, actualizado: ahora,
    ...(verificado ? { verificadoPor: uid } : {}), via: via ?? previo?.via ?? 'manual',
    prefijos: prefijosDe(a.nombre, a.marca),
  };
}

// ── Caché en el teléfono de los productos compartidos que esta persona usó (para recientes, favoritos y búsqueda) ──
const CLAVE = 'stoafit-productos';
export function productosEnCache(): Alimento[] {
  try { return Object.values(JSON.parse(localStorage.getItem(CLAVE) ?? '{}')) as Alimento[]; } catch { return []; }
}
export function recordarProducto(a: Alimento) {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<string, Alimento>;
    c[a.id] = a;
    const k = Object.keys(c);
    if (k.length > 200) delete c[k[0]];
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch { /* sin espacio */ }
}

/** Lo que la IA lee de una etiqueta nutricional */
export interface LecturaEtiqueta {
  nombre?: string; marca?: string;
  porcion?: string; gramos?: number;
  kcal?: number; prot?: number; carb?: number; gras?: number;
}

/** Valida y redondea lo que devolvió la IA; descarta lo imposible */
export function limpiarLectura(x: unknown): LecturaEtiqueta {
  const o = (x ?? {}) as Record<string, unknown>;
  const n = (v: unknown, max: number) => {
    const k = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
    return Number.isFinite(k) && k >= 0 && k <= max ? redondear(k, 1) : undefined;
  };
  const t = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
  const r: LecturaEtiqueta = {
    nombre: t(o.nombre, 80), marca: t(o.marca, 60), porcion: t(o.porcion, 40),
    gramos: n(o.gramos, 5000), kcal: n(o.kcal, 3000), prot: n(o.prot, 500), carb: n(o.carb, 500), gras: n(o.gras, 500),
  };
  if (r.gramos === 0) r.gramos = undefined;
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as LecturaEtiqueta;
}
