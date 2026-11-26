import { describe, expect, it } from 'vitest';
import { archivosStoaFit, skinDiaIni, skinDiaLua, skinMesLua, textoStoaFit } from './escritorio';
import { diaVacio } from './nutricion';
import type { Dia, Perfil } from './tipos';

// Miércoles 25/11/2026 a las 10:00
const AHORA = new Date(2026, 10, 25, 10).getTime();
const perfil = (extra: Partial<Perfil> = {}): Perfil => ({
  uid: 'u', nombre: 'Sofía Paz', email: 's@ejemplo.com', tema: 'oscuro', unidad: 'kg',
  recordatorio: { activo: false, hora: '12:00', dias: [] }, creado: new Date(2026, 10, 1).getTime(),
  // anotó el 22, 23 y 24; cumplió el 23 y el 24. El 30/11 es un día planificado (no cuenta)
  resumen: { dias: ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-30'], cumplidos: ['2026-11-23', '2026-11-24'], total: 3 },
  metas: { kcal: 2000, prot: 120, carb: 200, gras: 60, agua: 2000 }, ...extra,
} as Perfil);
const item = (kcal: number) => ({ id: `i${kcal}`, alimentoId: 'x', nombre: 'X', cantidad: 1, porcion: 'g', gramos: 100, kcal, prot: 30, carb: 40, gras: 10 });
const dia = (comidas: Dia['comidas']): Dia => {
  const d = diaVacio('2026-11-25');
  const items = Object.values(comidas).flat() as ReturnType<typeof item>[];
  const s = (k: 'kcal' | 'prot' | 'carb' | 'gras') => items.reduce((a, i) => a + i[k], 0);
  return { ...d, comidas, totales: { kcal: s('kcal'), prot: s('prot'), carb: s('carb'), gras: s('gras') } };
};
const C = { verde: '1,2,3', rojo: '4,5,6', series: ['7,7,7', '8,8,8', '9,9,9', '10,10,10'] as [string, string, string, string], prot: '11,1,1', carb: '1,11,1', gras: '1,1,11' };

describe('widget para Windows · StoaFit', () => {
  it('resumen: calorías, macros, comidas, racha y mes', () => {
    const { texto, clave } = textoStoaFit(perfil(), dia({ desayuno: [item(500)], almuerzo: [item(750)] }), '13:00', AHORA);
    const [cab, ...comidas] = texto.split('~');
    const c = cab.split('|');
    expect(c.slice(0, 5)).toEqual(['3', 'Sofía', '2026-11-25', '13:00', '2026-10-26']);
    // kcal y meta, prot, carb, gras
    expect(c.slice(5, 13)).toEqual(['1250', '2000', '60', '120', '80', '200', '20', '60']);
    expect(c.slice(13, 15)).toEqual(['2', String(comidas.length)]);
    expect(c[15]).toBe('2'); // racha: 23 y 24 (hoy todavía no)
    // antes del 1/11 no tenía cuenta; el domingo 22 solo anotó (r); 23 y 24 cumplidos; hoy pendiente
    expect(c[17].slice(0, 6)).toBe('------');
    expect(c[17].slice(27)).toBe('r11pffff');
    expect(c[18]).toBe('MIÉRCOLES 25');
    expect(comidas[0]).toBe('desayuno|Desayuno|500|1');
    expect(comidas.find((x) => x.startsWith('cena'))).toBe('cena|Cena|0|0');
    expect(clave).not.toContain('13:00');
  });

  it('día cumplido: racha y mes en oro', () => {
    const { texto } = textoStoaFit(perfil(), dia({ desayuno: [item(900)], almuerzo: [item(1000)] }), '13:00', AHORA);
    const c = texto.split('~')[0].split('|');
    expect(c[15]).toBe('3');
    expect(c[17].slice(28, 31)).toBe('111');
    expect(texto.length).toBeLessThan(2000);
  });

  it('skins: dos widgets, sin cruces rojas', () => {
    const nombres = archivosStoaFit('stoafit-app', 'C', C).map((a) => a.nombre);
    expect(nombres).toEqual(['RMSKIN.ini', 'Skins/StoaFit/Hoy/Hoy.ini', 'Skins/StoaFit/Mes/Mes.ini', 'Skins/StoaFit/@Resources/dia.lua', 'Skins/StoaFit/@Resources/mes.lua']);
    const ini = skinDiaIni('stoafit-app', 'C', C);
    expect(ini).toContain('projects/stoafit-app/');
    expect(ini).toContain('Prot=11,1,1');
    expect(skinDiaLua() + skinMesLua()).not.toMatch(/Rojo|✕/);
  });
});
