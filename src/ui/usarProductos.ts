import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizar } from '../lib/alimentos';
import { ErrorApp } from '../data/repo';
import type { Etiqueta } from '../lib/nutricion';
import { CODIGO_VALIDO, ID_SIN_CODIGO, alimentoDeProducto, claveBusqueda, idProducto, olvidarProducto, prefijosDe, limpiarLectura, productoDeEtiqueta, recordarProducto, type LecturaEtiqueta } from '../lib/productos';
import type { Alimento, Producto } from '../lib/tipos';
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

  /**
   * Cargadores y admin: corrige y deja verificado. El código de barras no cambia nunca, salvo un alimento
   * que no tenía (llave "n-…"): si se le pone uno, el producto pasa a esa llave y se borra la vieja (v1.22.0).
   */
  const corregir = useCallback(async (codigo: string, e: Etiqueta, via: Producto['via']) => {
    const previo = await repo.leerProducto(codigo);
    if (ID_SIN_CODIGO.test(codigo) && e.codigo && CODIGO_VALIDO.test(e.codigo)) {
      const p = productoDeEtiqueta(e, usuario.uid, true, via, Date.now(), previo ? { ...previo, codigo: e.codigo } : undefined);
      const r = await repo.crearProducto(p);
      if (!r.creado) throw new ErrorApp(`Ese código de barras ya es de otro producto: ${r.producto.nombre}.`);
      await repo.borrarProducto(codigo);
      olvidarProducto(idProducto(codigo));
      const a = alimentoDeProducto(p);
      recordarProducto(a);
      return a;
    }
    const p = productoDeEtiqueta({ ...e, codigo }, usuario.uid, true, via, Date.now(), previo ?? undefined);
    await repo.guardarProducto(p);
    const a = alimentoDeProducto(p);
    recordarProducto(a);
    return a;
  }, [repo, usuario.uid]);

  return { leerFoto: cargador ? leerFoto : undefined, crear, corregir, cargador };
}

/**
 * Busca por nombre en la base compartida de StoaFit mientras se escribe (espera 450 ms sin teclear).
 * Solo consulta con 3 letras o más y guarda lo ya buscado en esta sesión: cada búsqueda nueva = hasta 8 lecturas.
 */
const yaBuscado = new Map<string, Alimento[]>();
export function useBuscarProductos(texto: string, activo = true): { resultados: Alimento[]; buscando: boolean } {
  const { repo } = useSesion();
  const clave = activo ? claveBusqueda(texto) : null;
  const [estado, setEstado] = useState<{ clave: string | null; resultados: Alimento[]; buscando: boolean }>({ clave: null, resultados: [], buscando: false });
  useEffect(() => {
    if (!clave) { setEstado({ clave: null, resultados: [], buscando: false }); return; }
    const guardado = yaBuscado.get(clave);
    if (guardado) { setEstado({ clave, resultados: guardado, buscando: false }); return; }
    setEstado((e) => ({ ...e, clave, buscando: true }));
    let vivo = true;
    const t = window.setTimeout(async () => {
      try {
        const r = (await repo.buscarProductos(clave)).map(alimentoDeProducto);
        yaBuscado.set(clave, r);
        if (vivo) setEstado({ clave, resultados: r, buscando: false });
      } catch { if (vivo) setEstado({ clave, resultados: [], buscando: false }); }
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [clave, repo]);
  // Lo de la base también tiene que coincidir con el resto de las palabras escritas
  const resultados = useMemo(() => {
    if (estado.clave !== clave) return [];
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
    return estado.resultados.filter((a) => { const t = normalizar(`${a.nombre} ${a.marca ?? ''}`); return palabras.every((w) => t.includes(w)); });
  }, [estado, clave, texto]);
  return { resultados, buscando: estado.buscando };
}

/**
 * Una sola vez (por teléfono del admin): los productos cargados antes de la v1.14.0 reciben sus "prefijos"
 * para que cualquiera los encuentre buscando por nombre. Lecturas = cantidad de productos; escrituras = los que falten.
 */
export function useIndiceNombres() {
  const { repo, admin } = useSesion();
  useEffect(() => {
    if (!admin || repo.modo === 'prueba') return;
    const CLAVE = 'stoafit-indice-nombres-v1';
    try { if (localStorage.getItem(CLAVE)) return; } catch { return; }
    repo.leerTodosProductos().then(async (todos) => {
      for (const p of todos) if (!p.prefijos?.length) await repo.guardarProducto({ ...p, prefijos: prefijosDe(p.nombre, p.marca) });
      try { localStorage.setItem(CLAVE, '1'); } catch { /* sin espacio */ }
    }).catch(() => undefined);
  }, [admin, repo]);
}
