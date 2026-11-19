import { redondear } from './logica';
import type { Alimento, Porcion } from './tipos';

/**
 * Open Food Facts: base abierta y gratuita de productos envasados (licencia ODbL, hay que nombrarla).
 * El celular consulta directo, sin pasar por Firebase: no suma costo.
 */
export const FUENTE_OFF = 'Datos de productos: Open Food Facts (ODbL)';

/** Normaliza lo leído: solo dígitos; EAN-8, UPC-A (12), EAN-13 o GTIN-14 */
export function codigoValido(t: string): string | null {
  const s = t.replace(/\D/g, '');
  return [8, 12, 13, 14].includes(s.length) ? s : null;
}

interface ProductoOFF {
  product_name?: string; product_name_es?: string; generic_name_es?: string;
  brands?: string; quantity?: string; serving_size?: string; serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** Convierte la respuesta de Open Food Facts en un alimento; null si no trae calorías */
export function productoAAlimento(codigo: string, p: ProductoOFF): Alimento | null {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined && num(n['energy_100g']) !== undefined) kcal = num(n['energy_100g'])! / 4.184; // kJ → kcal
  if (kcal === undefined) return null;
  const nombre = (p.product_name_es || p.product_name || p.generic_name_es || '').trim();
  const marca = (p.brands ?? '').split(',')[0]?.trim();
  const porciones: Porcion[] = [];
  const g = num(p.serving_quantity);
  if (g && g > 0) porciones.push({ nombre: p.serving_size ? `1 porción (${p.serving_size})`.slice(0, 40) : '1 porción', gramos: Math.round(g) });
  porciones.push({ nombre: '100 g', gramos: 100 });
  return {
    id: `off-${codigo}`, nombre: (nombre || `Producto ${codigo}`).slice(0, 80), grupo: 'envasados', codigo, fuente: 'off',
    ...(marca ? { marca: marca.slice(0, 60) } : {}),
    por100: {
      kcal: Math.round(kcal),
      prot: redondear(num(n['proteins_100g']) ?? 0, 1),
      carb: redondear(num(n['carbohydrates_100g']) ?? 0, 1),
      gras: redondear(num(n['fat_100g']) ?? 0, 1),
    },
    porciones,
  };
}

const CACHE = 'stoafit-off';
function leerCache(): Record<string, Alimento | null> {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}'); } catch { return {}; }
}
function guardarCache(codigo: string, a: Alimento | null) {
  try {
    const c = leerCache();
    c[codigo] = a;
    const claves = Object.keys(c);
    if (claves.length > 300) for (const k of claves.slice(0, claves.length - 300)) delete c[k];
    localStorage.setItem(CACHE, JSON.stringify(c));
  } catch { /* sin espacio */ }
}

export type ResultadoOFF = { tipo: 'encontrado'; alimento: Alimento } | { tipo: 'no-esta' } | { tipo: 'sin-datos'; nombre: string } | { tipo: 'error' };

/** Busca un código en Open Food Facts (con caché en el teléfono) */
export async function buscarEnOFF(codigo: string, f: typeof fetch = fetch): Promise<ResultadoOFF> {
  const c = leerCache();
  if (codigo in c) return c[codigo] ? { tipo: 'encontrado', alimento: c[codigo]! } : { tipo: 'no-esta' };
  try {
    const campos = 'product_name,product_name_es,generic_name_es,brands,quantity,serving_size,serving_quantity,nutriments';
    const r = await f(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=${campos}`);
    if (r.status === 404) { guardarCache(codigo, null); return { tipo: 'no-esta' }; }
    if (!r.ok) return { tipo: 'error' };
    const j = await r.json() as { status?: number; product?: ProductoOFF };
    if (!j.product || j.status === 0) { guardarCache(codigo, null); return { tipo: 'no-esta' }; }
    const a = productoAAlimento(codigo, j.product);
    if (!a) return { tipo: 'sin-datos', nombre: (j.product.product_name_es || j.product.product_name || '').trim() };
    guardarCache(codigo, a);
    return { tipo: 'encontrado', alimento: a };
  } catch {
    return { tipo: 'error' };
  }
}

/** Productos de ejemplo para el modo prueba (datos inventados, sin internet) */
export const PRODUCTOS_PRUEBA: Record<string, Alimento> = {
  '7840000000017': {
    id: 'off-7840000000017', nombre: 'Galletitas de agua integrales', marca: 'Marca Ejemplo', grupo: 'envasados', codigo: '7840000000017', fuente: 'off',
    por100: { kcal: 420, prot: 11, carb: 68, gras: 11 }, porciones: [{ nombre: '1 porción (30 g)', gramos: 30 }, { nombre: '100 g', gramos: 100 }],
  },
  '7840000000024': {
    id: 'off-7840000000024', nombre: 'Yogur bebible de frutilla', marca: 'Láctea Ejemplo', grupo: 'envasados', codigo: '7840000000024', fuente: 'off',
    por100: { kcal: 78, prot: 2.9, carb: 13, gras: 1.6 }, porciones: [{ nombre: '1 porción (200 ml)', gramos: 200 }, { nombre: '100 g', gramos: 100 }],
  },
};
