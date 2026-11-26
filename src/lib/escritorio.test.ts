import { describe, expect, it } from 'vitest';
import { archivosEscritorio, armarTextoEscritorio, skinTarjetaIni } from '../../familia/escritorio';
import { APP_ESCRITORIO, resumenStoaFit } from './escritorio';
import { diaVacio } from './nutricion';
import type { Dia, Perfil } from './tipos';

// Miércoles 25/11/2026 a las 10:00
const AHORA = new Date(2026, 10, 25, 10).getTime();
const perfil = (extra: Partial<Perfil> = {}): Perfil => ({
  uid: 'u', nombre: 'Sofía Paz', email: 's@ejemplo.com', tema: 'oscuro', unidad: 'kg',
  recordatorio: { activo: false, hora: '12:00', dias: [] }, creado: new Date(2026, 10, 1).getTime(),
  // registró el 22, 23 y 24; cumplió el 23 y el 24. El 30/11 es un día planificado (no cuenta)
  resumen: { dias: ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-30'], cumplidos: ['2026-11-23', '2026-11-24'], total: 3 },
  metas: { kcal: 2000, prot: 120, carb: 200, gras: 60, agua: 2000 }, ...extra,
} as Perfil);
const item = (kcal: number) => ({ id: `i${kcal}`, alimentoId: 'x', nombre: 'X', cantidad: 1, porcion: 'g', gramos: 100, kcal, prot: 10, carb: 10, gras: 5 });
const dia = (comidas: Dia['comidas']): Dia => {
  const d = diaVacio('2026-11-25');
  const items = Object.values(comidas).flat() as ReturnType<typeof item>[];
  return { ...d, comidas, totales: { kcal: items.reduce((s, i) => s + i.kcal, 0), prot: 0, carb: 0, gras: 0 } };
};

describe('widget para Windows · StoaFit', () => {
  it('resumen: calorías de hoy, meta, registro y comidas', () => {
    const r = resumenStoaFit(perfil(), dia({ desayuno: [item(500)], almuerzo: [item(750)] }), AHORA);
    expect(r.resumen).toBe('HOY · 1.250 DE 2.000 KCAL');
    expect(Math.round(r.barra)).toBe(63);
    const [cab, meta, registro, ...comidas] = armarTextoEscritorio(r, '13:00').texto.split('~');
    expect(cab).toBe('2|Sofía|2026-11-25|13:00|2026-10-26|HOY · 1.250 DE 2.000 KCAL|63|DÍAS');
    const m = meta.split('|');
    // id|nombre|estado|racha|color|subtítulo|35 días|%|derecha|ruta|tarjeta|unidad
    expect(m.slice(0, 5)).toEqual(['meta', 'Meta del día', '0', '2', 'Oro']);
    expect(m[5]).toBe('META 2.000 KCAL');
    // antes del 1/11 no tenía cuenta; esta semana: lunes 23 y martes 24 cumplidos, hoy pendiente
    expect(m[6].slice(0, 6)).toBe('------');
    expect(m[6].slice(28)).toBe('11pffff');
    expect(m.slice(8, 12)).toEqual(['1.250/2.000', '/diario', '1', 'DÍAS']);
    const g = registro.split('|');
    expect(g.slice(0, 4)).toEqual(['registro', 'Registro diario', '1', '4']);
    expect(g[6].slice(27)).toBe('1111ffff'); // domingo 22, lunes 23, martes 24 y hoy; después, lo que viene
    expect(comidas[0].split('|').slice(0, 3)).toEqual(['desayuno', 'Desayuno', '1']);
    expect(comidas[0].split('|')[8]).toBe('500 kcal');
    expect(comidas[0].split('|')[10]).toBe('0'); // las comidas no son tarjetas
  });

  it('día cumplido: estado 1 y "cumplido"', () => {
    const r = resumenStoaFit(perfil(), dia({ desayuno: [item(900)], almuerzo: [item(1000)] }), AHORA);
    expect(r.resumen).toBe('HOY · 1.900 DE 2.000 KCAL · CUMPLIDO');
    expect(r.filas[0].estado).toBe('1');
    expect(r.filas[0].racha).toBe(3);
  });

  it('skins de StoaFit', () => {
    const app = APP_ESCRITORIO('stoafit-app');
    const c = { verde: '1,2,3', rojo: '4,5,6', series: ['7,7,7', '8,8,8', '9,9,9', '10,10,10'] as [string, string, string, string] };
    expect(skinTarjetaIni(app, 'C', 1, c)).toContain('projects/stoafit-app/');
    expect(skinTarjetaIni(app, 'C', 1, c)).toContain('Accion=Registrar ◇');
    expect(archivosEscritorio(app, 'C', c).map((a) => a.nombre)).toContain('Skins/StoaFit/Hoy/Hoy.ini');
  });
});
