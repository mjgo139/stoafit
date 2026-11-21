import { describe, expect, it } from 'vitest';
import { alimentoDeEtiqueta, etiquetaDe, macrosDe, unidadSuelta } from './nutricion';
import { digitoOk } from './openfoodfacts';
import { CODIGO_VALIDO, ID_SIN_CODIGO, alimentoDeProducto, claveBusqueda, codigoDeId, idProducto, limpiarLectura, prefijosDe, productoDeEtiqueta } from './productos';

describe('base compartida: un código = un producto', () => {
  const e = { nombre: 'Pan de leche', marca: 'Bimbo', codigo: '7840042000414', modo: 'porcion' as const, porcion: '1½ unidad', gramos: 50, kcal: 145, prot: 3.5, carb: 27, gras: 2.6 };
  it('el id siempre sale del código', () => {
    expect(idProducto('7840042000414')).toBe('cod-7840042000414');
    expect(codigoDeId('cod-7840042000414')).toBe('7840042000414');
    expect(codigoDeId('chipa')).toBeNull();
    expect(CODIGO_VALIDO.test('7840042000414')).toBe(true);
    expect(CODIGO_VALIDO.test('12345678')).toBe(true);
    expect(CODIGO_VALIDO.test('123456789')).toBe(false);
  });
  it('arma el producto desde la etiqueta "por porción"', () => {
    const p = productoDeEtiqueta(e, 'u1', false, 'foto', 1000);
    expect(p).toMatchObject({ codigo: '7840042000414', nombre: 'Pan de leche', marca: 'Bimbo', verificado: false, creadoPor: 'u1', creado: 1000, via: 'foto' });
    expect(p.por100).toEqual({ kcal: 290, prot: 7, carb: 54, gras: 5.2 });
    expect(p.verificadoPor).toBeUndefined();
    const a = alimentoDeProducto(p);
    expect(a.id).toBe('cod-7840042000414');
    expect(a.compartido).toBe(true);
    expect(macrosDe(a, 50).kcal).toBe(145);
  });
  it('al corregir no cambia el código ni quién lo creó', () => {
    const previo = productoDeEtiqueta(e, 'u1', false, 'manual', 1000);
    const p = productoDeEtiqueta({ ...e, codigo: '9999999999999', kcal: 150 }, 'carga', true, 'manual', 2000, previo);
    expect(p.codigo).toBe('7840042000414');
    expect(p.creadoPor).toBe('u1');
    expect(p.creado).toBe(1000);
    expect(p.verificado).toBe(true);
    expect(p.verificadoPor).toBe('carga');
    expect(p.actualizado).toBe(2000);
  });
  it('un código mal escrito no se puede crear (sin código sí: v1.15.0)', () => {
    expect(() => productoDeEtiqueta({ ...e, codigo: '12' }, 'u1', false, 'manual')).toThrow();
  });
});

describe('lectura de la etiqueta con IA', () => {
  it('limpia y valida lo que devuelve la IA', () => {
    expect(limpiarLectura({ nombre: ' Pan ', kcal: '145', prot: 3.5, carb: '27,0', gras: 2.6, gramos: 50, porcion: '1½ unidad' }))
      .toEqual({ nombre: 'Pan', kcal: 145, prot: 3.5, carb: 27, gras: 2.6, gramos: 50, porcion: '1½ unidad' });
    expect(limpiarLectura({ kcal: -3, prot: 9999, carb: 'mucho', gramos: 0 })).toEqual({});
    expect(limpiarLectura(null)).toEqual({});
  });
});

describe('v1.14.0: buscar productos por nombre', () => {
  it('prefijos de nombre y marca, sin tildes, de 3 a 15 letras', () => {
    const p = prefijosDe('Pre Pizza', 'Pantodós');
    expect(p).toEqual(expect.arrayContaining(['pre', 'piz', 'pizza', 'pan', 'pantodos']));
    expect(p).not.toContain('pi');
    expect(prefijosDe('Mbejú')).toContain('mbeju');
  });
  it('la clave es la palabra más larga, con 3 letras o más', () => {
    expect(claveBusqueda('pan de leche')).toBe('leche');
    expect(claveBusqueda('Galletitas Cóco')).toBe('galletitas');
    expect(claveBusqueda('pa')).toBeNull();
  });
  it('el producto nuevo ya trae sus prefijos', () => {
    const p = productoDeEtiqueta({ nombre: 'Pre Pizza', marca: 'PANTODOS', codigo: '7840131003463', modo: 'porcion', porcion: '40 g', gramos: 40, kcal: 117, prot: 3.3, carb: 22, gras: 1.8, otras: [] }, 'u1', true, 'foto', 1);
    expect(p.prefijos).toContain('pizza');
  });
});

describe('v1.15.0: alimentos compartidos sin código de barras', () => {
  it('sin código recibe una llave "n-" al azar; con código, el código es la llave', () => {
    const base = { nombre: 'Chipa de la casa', marca: '', modo: 'porcion' as const, porcion: '1 unidad', gramos: 60, kcal: 200, prot: 5, carb: 25, gras: 8, otras: [] };
    const sin = productoDeEtiqueta({ ...base, codigo: '' }, 'u1', false, 'manual', 1);
    expect(sin.codigo).toMatch(ID_SIN_CODIGO);
    expect(alimentoDeProducto(sin).codigo).toBeUndefined();
    expect(alimentoDeProducto(sin).compartido).toBe(true);
    const con = productoDeEtiqueta({ ...base, codigo: '7840131003463' }, 'u1', false, 'manual', 1);
    expect(con.codigo).toBe('7840131003463');
    // Al corregir, la llave no cambia
    expect(productoDeEtiqueta({ ...base, codigo: sin.codigo }, 'u2', true, 'manual', 2, sin).codigo).toBe(sin.codigo);
  });
});

describe('v1.16.0: líquidos y lectura del código', () => {
  it('un alimento en ml usa "100 ml" y se agrega en mililitros', () => {
    const a = alimentoDeEtiqueta('x', { nombre: 'Zuko', modo: 'porcion', porcion: '200 ml', gramos: 200, kcal: 3, prot: 0, carb: 1, gras: 0, otras: [], unidad: 'ml' });
    expect(a.porciones.map((p) => p.nombre)).toEqual(['200 ml', '100 ml']);
    expect(unidadSuelta(a)).toBe('ml');
    expect(etiquetaDe(a).unidad).toBe('ml');
  });
  it('la lectura con porción en ml queda como líquido', () => {
    expect(limpiarLectura({ porcion: '200 ml', gramos: 200, kcal: 3 }).unidad).toBe('ml');
    expect(limpiarLectura({ porcion: '1 vaso', unidad: 'ml' }).unidad).toBe('ml');
    expect(limpiarLectura({ porcion: '40 g', kcal: 117 }).unidad).toBeUndefined();
  });
  it('dígito verificador del código de barras', () => {
    expect(digitoOk('7802800716562')).toBe(true);
    expect(digitoOk('7840131003463')).toBe(true);
    expect(digitoOk('7802800716563')).toBe(false);
  });
});
