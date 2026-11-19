import { describe, expect, it } from 'vitest';
import {
  avanceObjetivo, codigoNuevo, diasSinActividad, estadoCliente, iniciales, normalizarCodigo, ordenarClientes, vecesEstaSemana,
} from './logica';
import type { Objetivo, Vinculo } from './tipos';

const MIE = new Date(2026, 10, 18, 10).getTime(); // miércoles 18/11/2026
const obj = (o: Partial<Objetivo>): Objetivo => ({ id: 'o', tipo: 'marca', titulo: 'x', meta: 100, creadoPor: 'p', fecha: 0, ...o });

describe('base de profesionales', () => {
  it('genera y normaliza códigos', () => {
    let i = 0;
    expect(codigoNuevo('NUT', () => (i++ % 4) / 4)).toMatch(/^NUT-[A-Z2-9]{4}$/);
    expect(normalizarCodigo(' tit 4k9q ')).toBe('TIT-4K9Q');
    expect(normalizarCodigo('TIT4K9Q')).toBe('TIT-4K9Q');
  });
  it('calcula días sin actividad y el estado del cliente', () => {
    expect(diasSinActividad([], MIE)).toBeUndefined();
    expect(diasSinActividad(['2026-11-10', '2026-11-16'], MIE)).toBe(2);
    expect(estadoCliente(['2026-11-16'], MIE)).toBe('al-dia');
    expect(estadoCliente(['2026-11-12'], MIE)).toBe('atencion');
    expect(estadoCliente(['2026-11-01'], MIE)).toBe('inactivo');
    expect(estadoCliente([], MIE)).toBe('nuevo');
    expect(diasSinActividad([new Date(2026, 10, 15, 19).getTime()], MIE)).toBe(3);
  });
  it('cuenta la semana de lunes a domingo', () => {
    expect(vecesEstaSemana(['2026-11-15', '2026-11-16', '2026-11-18', '2026-11-23'], MIE)).toBe(2);
  });
  it('calcula el avance de objetivos que suben y que bajan', () => {
    expect(avanceObjetivo(obj({ meta: 100 }), 80)).toBeCloseTo(0.8);
    expect(avanceObjetivo(obj({ meta: 100 }), 120)).toBe(1);
    expect(avanceObjetivo(obj({ tipo: 'corporal', bajar: true, meta: 80, inicio: 90 }), 85)).toBeCloseTo(0.5);
    expect(avanceObjetivo(obj({ tipo: 'corporal', bajar: true, meta: 80, inicio: 90 }), 79)).toBe(1);
    expect(avanceObjetivo(obj({ tipo: 'libre', cumplido: true }), undefined)).toBe(1);
  });
  it('ordena clientes: primero los que necesitan atención', () => {
    const v = (n: string) => ({ nombreCliente: n } as Vinculo);
    const l = ordenarClientes([
      { vinculo: v('Zoe'), estado: 'al-dia' as const },
      { vinculo: v('Ana'), estado: 'inactivo' as const },
      { vinculo: v('Beto'), estado: 'atencion' as const },
    ]);
    expect(l.map((x) => x.vinculo.nombreCliente)).toEqual(['Ana', 'Beto', 'Zoe']);
    expect(iniciales('Ana Ruiz Paz')).toBe('AP');
  });
});
