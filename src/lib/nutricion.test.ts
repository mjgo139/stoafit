import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, buscar, buscarAlimento, normalizar } from './alimentos';
import { agregarDia, claveDia, edad, racha, romano, saludo, semana, sumarDias } from './logica';
import {
  basal, calcularMetas, diaCumplido, diaVacio, estadoMeta, gastoTotal, imc, itemDe, macrosDe, promedio, reparto, sumar, totalesDia,
} from './nutricion';
import { PLANTILLAS, itemsDePlantilla, totalesPlantilla } from './plantillas';
import { fraseDelDia } from './frases';
import type { Dia, Metas } from './tipos';

describe('fórmula de Mifflin-St Jeor', () => {
  it('calcula el metabolismo basal de hombre y mujer', () => {
    // 10×70 + 6,25×175 − 5×30 + 5 = 1648,75
    expect(basal({ genero: 'hombre', edad: 30, peso: 70, altura: 175 })).toBeCloseTo(1648.75);
    // 10×60 + 6,25×160 − 5×30 − 161 = 1289
    expect(basal({ genero: 'mujer', edad: 30, peso: 60, altura: 160 })).toBeCloseTo(1289);
  });
  it('multiplica por el nivel de actividad', () => {
    expect(gastoTotal({ genero: 'mujer', edad: 30, peso: 60, altura: 160, actividad: 'moderado', objetivo: 'mantener' })).toBeCloseTo(1289 * 1.55);
  });
  it('ajusta la meta según el objetivo y reparte los macros', () => {
    const d = { genero: 'mujer' as const, edad: 30, peso: 60, altura: 160, actividad: 'moderado' as const };
    const mantener = calcularMetas({ ...d, objetivo: 'mantener' });
    const bajar = calcularMetas({ ...d, objetivo: 'bajar' });
    const subir = calcularMetas({ ...d, objetivo: 'subir' });
    expect(mantener.kcal).toBe(2000); // 1997,95 redondeado a 10
    expect(bajar.kcal).toBeLessThan(mantener.kcal);
    expect(subir.kcal).toBeGreaterThan(mantener.kcal);
    expect(mantener.prot).toBe(96); // 1,6 g/kg
    expect(mantener.gras).toBe(Math.round(2000 * 0.3 / 9));
    expect(mantener.prot * 4 + mantener.carb * 4 + mantener.gras * 9).toBeGreaterThan(1980);
    expect(mantener.agua).toBe(2000); // 35 ml/kg = 2100 → 8 vasos
  });
  it('nunca baja de un mínimo saludable', () => {
    expect(calcularMetas({ genero: 'mujer', edad: 70, peso: 45, altura: 145, actividad: 'sedentario', objetivo: 'bajar' }).kcal).toBe(1200);
    expect(calcularMetas({ genero: 'hombre', edad: 70, peso: 50, altura: 150, actividad: 'sedentario', objetivo: 'bajar' }).kcal).toBe(1500);
  });
  it('calcula el IMC', () => { expect(imc(70, 175)).toBeCloseTo(22.9, 1); });
});

describe('alimentos y porciones', () => {
  it('la biblioteca tiene alimentos de Paraguay con valores coherentes', () => {
    expect(BIBLIOTECA.length).toBeGreaterThanOrEqual(120);
    expect(new Set(BIBLIOTECA.map((a) => a.id)).size).toBe(BIBLIOTECA.length);
    for (const a of BIBLIOTECA) {
      expect(a.porciones.length, a.nombre).toBeGreaterThan(0);
      // Las calorías tienen que parecerse a 4·P + 4·C + 9·G (margen por fibra, alcohol y redondeos)
      const desdeMacros = a.por100.prot * 4 + a.por100.carb * 4 + a.por100.gras * 9;
      if (a.id !== 'cerveza' && a.id !== 'vino') expect(Math.abs(desdeMacros - a.por100.kcal), a.nombre).toBeLessThan(Math.max(25, a.por100.kcal * 0.2));
    }
    for (const id of ['chipa', 'sopa-paraguaya', 'mbeju', 'vori-vori', 'terere', 'mandioca', 'chipa-guasu', 'soo-yosopy']) expect(buscarAlimento(id), id).toBeDefined();
  });
  it('busca sin tildes ni apóstrofos', () => {
    expect(normalizar("So'o Yosopý")).toBe('soo yosopy');
    expect(buscar('mbeju')[0].id).toBe('mbeju');
    expect(buscar('vori')[0].id).toBe('vori-vori');
    expect(buscar('soo')[0].id).toBe('soo-yosopy');
    expect(buscar('papaya').map((a) => a.id)).toContain('mamon');
    expect(buscar('xyzzz')).toHaveLength(0);
  });
  it('calcula los macros de una porción casera', () => {
    const chipa = buscarAlimento('chipa')!;
    expect(macrosDe(chipa, 60).kcal).toBe(198);
    const i = itemDe(chipa, '1 unidad mediana', 2, 'x');
    expect(i.gramos).toBe(120);
    expect(i.kcal).toBe(396);
    expect(i.porcion).toBe('1 unidad mediana');
    expect(itemDe(chipa, 'no existe', 1, 'y').porcion).toBe(chipa.porciones[0].nombre);
  });
});

describe('día y cumplimiento', () => {
  const metas: Metas = { kcal: 2000, prot: 90, carb: 250, gras: 66, agua: 2000 };
  const conKcal = (kcal: number, comidas = 3): Dia => {
    const d = diaVacio('2026-11-18');
    const tipos = ['desayuno', 'almuerzo', 'cena', 'merienda'] as const;
    for (let k = 0; k < comidas; k++) d.comidas[tipos[k]] = [{ id: String(k), alimentoId: 'a', nombre: 'a', cantidad: 1, porcion: 'p', gramos: 1, kcal: kcal / comidas, prot: 10, carb: 10, gras: 5 }];
    d.totales = totalesDia(d.comidas);
    return d;
  };
  it('suma los totales del día', () => {
    expect(totalesDia(conKcal(1800).comidas)).toEqual({ kcal: 1800, prot: 30, carb: 30, gras: 15 });
    expect(sumar([])).toEqual({ kcal: 0, prot: 0, carb: 0, gras: 0 });
  });
  it('un día se cumple entre el 85 % y el 110 % con al menos 2 comidas', () => {
    expect(diaCumplido(conKcal(1800), metas)).toBe(true);
    expect(diaCumplido(conKcal(1600), metas)).toBe(false);
    expect(diaCumplido(conKcal(2300), metas)).toBe(false);
    expect(diaCumplido(conKcal(1900, 1), metas)).toBe(false);
    expect(estadoMeta(2300, 2000)).toBe('pasado');
    expect(estadoMeta(1900, 2000)).toBe('justo');
    expect(estadoMeta(500, 2000)).toBe('falta');
  });
  it('promedia solo días con registros y calcula el reparto', () => {
    const p = promedio([conKcal(1800), conKcal(2000), diaVacio('2026-11-10')]);
    expect(p.n).toBe(2);
    expect(p.kcal).toBe(1900);
    const r = reparto({ kcal: 0, prot: 100, carb: 200, gras: 50 });
    expect(r.prot + r.carb + r.gras).toBeGreaterThanOrEqual(99);
  });
  it('las plantillas usan alimentos que existen y dan días razonables', () => {
    for (const p of PLANTILLAS) {
      let n = 0;
      const items = Object.values(itemsDePlantilla(p, () => String(n++))).flat();
      const filas = Object.values(p.comidas).flat().length;
      expect(items.length, p.nombre).toBe(filas);
      const t = totalesPlantilla(p).kcal;
      expect(t, p.nombre).toBeGreaterThan(1200);
      expect(t, p.nombre).toBeLessThan(3200);
    }
  });
});

describe('fechas, racha y semana', () => {
  it('maneja claves de día', () => {
    expect(claveDia(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(agregarDia(['2026-11-02', '2026-11-01'], '2026-11-02')).toEqual(['2026-11-01', '2026-11-02']);
    expect(agregarDia(['a', 'b', 'c'], 'd', 2)).toEqual(['c', 'd']);
  });
  it('cuenta la racha aunque hoy no esté cumplido todavía', () => {
    const hoy = '2026-11-18';
    expect(racha(['2026-11-15', '2026-11-16', '2026-11-17'], hoy)).toBe(3);
    expect(racha(['2026-11-16', '2026-11-17', '2026-11-18'], hoy)).toBe(3);
    expect(racha(['2026-11-15', '2026-11-17'], hoy)).toBe(1);
    expect(racha([], hoy)).toBe(0);
  });
  it('arma la semana de lunes a domingo', () => {
    const s = semana('2026-11-18'); // miércoles
    expect(s[0].clave).toBe('2026-11-16');
    expect(s[6].clave).toBe('2026-11-22');
    expect(s.find((d) => d.hoy)?.clave).toBe('2026-11-18');
    expect(s[4].futuro).toBe(true);
  });
  it('saludo, edad, romanos y frase del día', () => {
    expect(saludo(8)).toBe('Buen día');
    expect(saludo(15)).toBe('Buenas tardes');
    expect(saludo(22)).toBe('Buenas noches');
    expect(edad('1994-05-12', new Date(2026, 10, 18).getTime())).toBe(32);
    expect(romano(14)).toBe('XIV');
    expect(fraseDelDia(new Date(2026, 10, 18)).texto).toBe(fraseDelDia(new Date(2026, 10, 18, 23)).texto);
  });
});
