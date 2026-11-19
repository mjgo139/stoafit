/** Utilidades generales: fechas, números, romanos, rachas */

const DIA = 86_400_000;

export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** AAAA-MM-DD en hora local */
export function claveDia(t: number | Date = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fechaDeClave(c: string): Date {
  const [a, m, d] = c.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(c: string, n: number): string {
  const d = fechaDeClave(c);
  d.setDate(d.getDate() + n);
  return claveDia(d);
}

export function redondear(n: number, dec = 0): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}

export function formatoNumero(n: number, dec = 0): string {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: dec }).format(redondear(n, dec));
}

const LB = 2.20462;
export const aUnidad = (kg: number, u: 'kg' | 'lb') => (u === 'lb' ? kg * LB : kg);
export const aKg = (v: number, u: 'kg' | 'lb') => (u === 'lb' ? v / LB : v);

export function romano(n: number): string {
  if (n <= 0) return '0';
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, l] of t) while (n >= v) { s += l; n -= v; }
  return s;
}

/** Cuántos días hacia adelante se puede planificar en el Diario */
export const DIAS_PLAN = 60;

/** Solo los días que ya pasaron (o hoy): lo planificado a futuro no cuenta para racha, semana ni progreso */
export function hastaHoy(lista: string[], hoy = claveDia()): string[] {
  return lista.filter((d) => d <= hoy);
}

/** Días seguidos cumplidos hasta hoy (si hoy todavía no se cumplió, cuenta hasta ayer) */
export function racha(cumplidos: string[], hoy = claveDia()): number {
  const s = new Set(cumplidos);
  let d = s.has(hoy) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (s.has(d)) { n++; d = sumarDias(d, -1); }
  return n;
}

export const LETRAS_DIA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Los 7 días de la semana actual (lunes a domingo) */
export function semana(hoy = claveDia()): { clave: string; letra: string; numero: number; hoy: boolean; futuro: boolean }[] {
  const d = fechaDeClave(hoy);
  const lunes = sumarDias(hoy, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const clave = sumarDias(lunes, i);
    return { clave, letra: LETRAS_DIA[i], numero: fechaDeClave(clave).getDate(), hoy: clave === hoy, futuro: clave > hoy };
  });
}

/** Saludo según la hora */
export function saludo(h = new Date().getHours()): string {
  if (h >= 5 && h < 12) return 'Buen día';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function edad(nacimiento: string, ahora = Date.now()): number {
  const n = fechaDeClave(nacimiento);
  const h = new Date(ahora);
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
}

/** Agrega un día a una lista ordenada sin repetir, guardando solo los últimos `max` */
export function agregarDia(lista: string[], dia: string, max = 120): string[] {
  return [...new Set([...lista, dia])].sort().slice(-max);
}
export function quitarDia(lista: string[], dia: string): string[] {
  return lista.filter((d) => d !== dia);
}

export const fechaCorta = (t: number | string) =>
  new Intl.DateTimeFormat('es-PY', { day: 'numeric', month: 'short' }).format(typeof t === 'string' ? fechaDeClave(t) : t).replace('.', '');
export const fechaLarga = (t: number | string) =>
  new Intl.DateTimeFormat('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }).format(typeof t === 'string' ? fechaDeClave(t) : t);

export { DIA };
