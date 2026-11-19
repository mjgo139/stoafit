import { useCallback } from 'react';
import { ErrorApp } from '../data/repo';
import type { Etiqueta } from '../lib/nutricion';
import { alimentoDeProducto, limpiarLectura, productoDeEtiqueta, recordarProducto, type LecturaEtiqueta } from '../lib/productos';
import type { Producto } from '../lib/tipos';
import { useSesion } from './contexto';

/** Operaciones sobre la base compartida de productos (un código = un producto) */
export function useProductos() {
  const { repo, usuario, cargador } = useSesion();

  /** Solo cargadores: foto de la etiqueta → valores leídos por la IA */
  const leerFoto = useCallback(async (foto: Blob): Promise<LecturaEtiqueta> => {
    const l = limpiarLectura(await repo.leerEtiqueta(foto));
    if (l.kcal === undefined && l.prot === undefined && l.carb === undefined) throw Object.assign(new ErrorApp('ia/no-leyo'), { code: 'ia/no-leyo' });
    return l;
  }, [repo]);

  /** Crea el producto con su código. Si ya existía (otro lo cargó antes), devuelve ese. */
  const crear = useCallback(async (e: Etiqueta, via: Producto['via']) => {
    const p = productoDeEtiqueta(e, usuario.uid, cargador, via);
    const r = await repo.crearProducto(p);
    const a = alimentoDeProducto(r.producto);
    recordarProducto(a);
    return { creado: r.creado, alimento: a };
  }, [repo, usuario.uid, cargador]);

  /** Cargadores y admin: corrige y deja verificado (el código no cambia) */
  const corregir = useCallback(async (codigo: string, e: Etiqueta, via: Producto['via']) => {
    const previo = await repo.leerProducto(codigo);
    const p = productoDeEtiqueta({ ...e, codigo }, usuario.uid, true, via, Date.now(), previo ?? undefined);
    await repo.guardarProducto(p);
    const a = alimentoDeProducto(p);
    recordarProducto(a);
    return a;
  }, [repo, usuario.uid]);

  return { leerFoto: cargador ? leerFoto : undefined, crear, corregir, cargador };
}
