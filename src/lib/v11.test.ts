import { describe, expect, it } from 'vitest';
import { buscarAlimento } from './alimentos';
import {
  alimentoDeEtiqueta, alimentoDeReceta, copiarItems, diaVacio, etiquetaDe, itemDe, macrosDe, nuevoResumen, sumarComidas, totalesDia,
} from './nutricion';
import { buscarEnOFF, codigoValido, productoAAlimento } from './openfoodfacts';
import type { Dia, Metas } from './tipos';

const metas: Metas = { kcal: 2000, prot: 90, carb: 250, gras: 66, agua: 2000 };
let n = 0;
const id = () => `x${n++}`;
const chipa = buscarAlimento('chipa')!;
const cocido = buscarAlimento('cocido-leche')!;

function dia(fecha: string, items: Partial<Dia['comidas']>): Dia {
  const d = diaVacio(fecha);
  d.comidas = items;
  d.totales = totalesDia(d.comidas);
  return d;
}

describe('repetir comidas', () => {
  it('copia ítems con ids nuevos', () => {
    const a = [itemDe(chipa, '1 unidad mediana', 1, 'a1')];
    const c = copiarItems(a, id);
    expect(c[0].id).not.toBe('a1');
    expect(c[0].kcal).toBe(a[0].kcal);
  });
  it('suma un día entero a otro sin perder lo que ya había', () => {
    const ayer = dia('2026-11-17', { desayuno: [itemDe(cocido, '1 taza', 1, 'c1')], cena: [itemDe(chipa, '1 unidad mediana', 2, 'c2')] });
    const hoy = { desayuno: [itemDe(chipa, '1 unidad mediana', 1, 'h1')] };
    const r = sumarComidas(hoy, ayer.comidas, id);
    expect(r.desayuno).toHaveLength(2);
    expect(r.cena).toHaveLength(1);
    expect(totalesDia(r).kcal).toBe(totalesDia(ayer.comidas).kcal + 198);
  });
  it('actualiza el resumen: días con registros, cumplidos y total', () => {
    const vacio = diaVacio('2026-11-18');
    const r0 = { dias: ['2026-11-17'], cumplidos: [], total: 1 };
    const lleno = dia('2026-11-18', {
      desayuno: [{ ...itemDe(cocido, '1 taza', 1, 'a'), kcal: 900 }],
      almuerzo: [{ ...itemDe(chipa, '1 unidad mediana', 1, 'b'), kcal: 900 }],
    });
    const r1 = nuevoResumen(r0, vacio, lleno, metas);
    expect(r1).toEqual({ dias: ['2026-11-17', '2026-11-18'], cumplidos: ['2026-11-18'], total: 2 });
    const r2 = nuevoResumen(r1, lleno, vacio, metas);
    expect(r2).toEqual({ dias: ['2026-11-17'], cumplidos: [], total: 1 });
  });
});

describe('recetas', () => {
  it('reparte la receta en porciones y calcula cada 100 g', () => {
    const ing = [itemDe(chipa, '100 g', 3, 'r1'), itemDe(cocido, '1 taza', 1, 'r2')]; // 300 g + 250 g
    const a = alimentoDeReceta('r', 'Prueba', { ingredientes: ing, porciones: 5 });
    const total = ing[0].kcal + ing[1].kcal;
    expect(a.porciones[0]).toEqual({ nombre: '1 porción', gramos: 110 });
    expect(macrosDe(a, 110).kcal).toBeCloseTo(total / 5, -1);
    expect(a.grupo).toBe('recetas');
    expect(a.receta?.porciones).toBe(5);
  });
  it('usa el peso cocido si se pesó la fuente', () => {
    const ing = [itemDe(chipa, '100 g', 4, 'r1')]; // 400 g crudo, 1320 kcal
    const a = alimentoDeReceta('r', 'Sopa', { ingredientes: ing, porciones: 4, pesoTotal: 800 });
    expect(a.porciones[0].gramos).toBe(200);
    expect(a.por100.kcal).toBe(165); // 1320 kcal / 800 g
    expect(macrosDe(a, 200).kcal).toBe(330);
  });
});

describe('crear alimento desde la etiqueta', () => {
  it('pasa los valores "por porción" a cada 100 g', () => {
    const a = alimentoDeEtiqueta('p', { nombre: 'Galletitas', marca: 'X', codigo: '7840000000017', modo: 'porcion', porcion: '3 galletitas', gramos: 30, kcal: 126, prot: 3.3, carb: 20.4, gras: 3.3 });
    expect(a.por100).toEqual({ kcal: 420, prot: 11, carb: 68, gras: 11 });
    expect(a.porciones).toEqual([{ nombre: '3 galletitas', gramos: 30 }, { nombre: '100 g', gramos: 100 }]);
    expect(a.grupo).toBe('envasados');
    expect(a.codigo).toBe('7840000000017');
  });
  it('acepta valores "cada 100 g" y otras medidas', () => {
    const a = alimentoDeEtiqueta('p', { nombre: 'Leche', modo: '100', porcion: '1 vaso', gramos: 200, kcal: 62, prot: 3.2, carb: 4.7, gras: 3.3, otras: [{ nombre: '1 caja', gramos: 1000 }] });
    expect(a.por100.kcal).toBe(62);
    expect(a.porciones.map((p) => p.nombre)).toEqual(['1 vaso', '1 caja', '100 g']);
    expect(a.marca).toBeUndefined();
  });
  it('se puede volver a editar sin perder datos', () => {
    const a = alimentoDeEtiqueta('p', { nombre: 'Galletitas', modo: 'porcion', porcion: '1 paquete', gramos: 150, kcal: 630, prot: 15, carb: 100, gras: 18, otras: [{ nombre: '1 galletita', gramos: 10 }] });
    const e = etiquetaDe(a);
    expect(e).toMatchObject({ nombre: 'Galletitas', porcion: '1 paquete', gramos: 150, kcal: 630 });
    expect(e.otras).toEqual([{ nombre: '1 galletita', gramos: 10 }]);
    expect(alimentoDeEtiqueta('p', e).por100).toEqual(a.por100);
  });
});

describe('código de barras y Open Food Facts', () => {
  it('valida códigos EAN y UPC', () => {
    expect(codigoValido('7840131003500')).toBe('7840131003500');
    expect(codigoValido(' 784-0131 ')).toBeNull();
    expect(codigoValido('12345678')).toBe('12345678');
    expect(codigoValido('012345678905')).toBe('012345678905');
  });
  it('convierte un producto de Open Food Facts', () => {
    const a = productoAAlimento('7840131003500', {
      product_name: 'Pan semillas integral', brands: 'Bimbo, Otra', serving_size: '2 rebanadas (50 g)', serving_quantity: '50',
      nutriments: { 'energy-kcal_100g': 260, proteins_100g: 10.4, carbohydrates_100g: 42.1, fat_100g: 5.06 },
    })!;
    expect(a).toMatchObject({ id: 'off-7840131003500', nombre: 'Pan semillas integral', marca: 'Bimbo', grupo: 'envasados', fuente: 'off', codigo: '7840131003500' });
    expect(a.por100).toEqual({ kcal: 260, prot: 10.4, carb: 42.1, gras: 5.1 });
    expect(a.porciones[0].gramos).toBe(50);
    expect(productoAAlimento('1', { product_name: 'Sin datos', nutriments: {} })).toBeNull();
    // Solo kJ: se convierte a kcal
    expect(productoAAlimento('2', { nutriments: { energy_100g: 1046 } })!.por100.kcal).toBe(250);
  });
  it('busca en Open Food Facts y distingue "no está" de "error"', async () => {
    const respuesta = (status: number, cuerpo: unknown) => (async () => ({ status, ok: status < 400, json: async () => cuerpo })) as unknown as typeof fetch;
    const ok = await buscarEnOFF('7840000000999', respuesta(200, { status: 1, product: { product_name: 'Jugo', nutriments: { 'energy-kcal_100g': 45 } } }));
    expect(ok.tipo).toBe('encontrado');
    expect((await buscarEnOFF('7840000000888', respuesta(404, {}))).tipo).toBe('no-esta');
    expect((await buscarEnOFF('7840000000777', respuesta(200, { status: 0 }))).tipo).toBe('no-esta');
    expect((await buscarEnOFF('7840000000666', respuesta(500, {}))).tipo).toBe('error');
    expect((await buscarEnOFF('7840000000555', (async () => { throw new Error('sin red'); }) as unknown as typeof fetch)).tipo).toBe('error');
    expect((await buscarEnOFF('7840000000444', respuesta(200, { status: 1, product: { product_name: 'Raro', nutriments: {} } }))).tipo).toBe('sin-datos');
  });
});

import { esSuelta, repartoMacros, unidadSuelta } from './nutricion';
import { textoCantidad } from '../ui/nutri';

describe('v1.3: gramos sueltos y reparto de macros', () => {
  const pan = { id: 'x', nombre: 'Pan', grupo: 'panes', por100: { kcal: 290, prot: 7, carb: 54, gras: 5.2 }, porciones: [{ nombre: '1 unidad', gramos: 50 }, { nombre: '100 g', gramos: 100 }] } as never;
  it('itemDe en gramos sueltos', () => {
    const i = itemDe(pan, 'g', 35, 'a');
    expect(i.gramos).toBe(35);
    expect(i.kcal).toBe(Math.round(290 * 0.35));
    expect(textoCantidad(i)).toBe('35 g');
    expect(esSuelta('ml')).toBe(true);
    expect(unidadSuelta(pan)).toBe('g');
    expect(unidadSuelta({ porciones: [{ nombre: '100 ml', gramos: 100 }] })).toBe('ml');
  });
  it('reparto de calorías por macro suma 100', () => {
    const r = repartoMacros({ kcal: 131, prot: 4.2, carb: 25.3, gras: 0.8 });
    expect(r.prot + r.carb + r.gras).toBe(100);
    expect(r.carb).toBeGreaterThan(80);
    expect(repartoMacros({ kcal: 0, prot: 0, carb: 0, gras: 0 })).toEqual({ prot: 0, carb: 0, gras: 0 });
  });
});
