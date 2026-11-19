import { buscarAlimento } from './alimentos';
import { itemDe, sumar } from './nutricion';
import type { ItemComida, Macros, TipoComida } from './tipos';

/** Días de ejemplo con comida de casa, para inspirarse o cargar en el diario de un toque */
export interface Plantilla {
  id: string;
  nombre: string;
  linea: string;
  comidas: Partial<Record<TipoComida, [alimentoId: string, porcion: string, cantidad: number][]>>;
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'liviano',
    nombre: 'Día liviano',
    linea: 'Para bajar de peso sin pasar hambre',
    comidas: {
      desayuno: [['cocido-leche', '1 taza', 1], ['pan-integral', '2 rodajas', 1], ['queso-py', '1 rodaja', 1]],
      almuerzo: [['pollo-pechuga', '1 pechuga', 1], ['arroz', '1 taza', 0.5], ['ensalada-mixta', '1 plato', 1], ['aceite', '1 cucharadita', 1]],
      merienda: [['yogur-natural', '1 pote', 1], ['banana', '1 unidad', 1]],
      cena: [['vori-vori', '1 plato hondo', 1], ['naranja', '1 unidad', 1]],
      colacion: [['terere', '1 jarra', 1], ['mani', '1 puñado', 0.5]],
    },
  },
  {
    id: 'equilibrado',
    nombre: 'Día equilibrado',
    linea: 'Comida paraguaya de siempre, en su medida',
    comidas: {
      desayuno: [['cocido-leche', '1 taza', 1], ['chipa', '1 unidad mediana', 1], ['mamon', '1 taza', 1]],
      almuerzo: [['carne-magra', '1 bife', 1], ['mandioca', '1 trozo', 1], ['ensalada-mixta', '1 plato', 1], ['aceite', '1 cucharadita', 1]],
      merienda: [['leche-entera', '1 vaso', 1], ['pan-felipe', '1 unidad', 1], ['dulce-leche', '1 cucharada', 0.5]],
      cena: [['guiso-arroz', '1 plato', 1], ['ensalada-mixta', '1 plato', 1]],
      colacion: [['terere', '1 jarra', 1], ['manzana', '1 unidad', 1]],
    },
  },
  {
    id: 'activo',
    nombre: 'Día activo',
    linea: 'Para entrenar o subir de peso',
    comidas: {
      desayuno: [['licuado-banana', '1 vaso', 1], ['huevo', '2 unidades', 1], ['pan-felipe', '1 unidad', 1]],
      almuerzo: [['milanesa-pollo', '1 unidad', 1], ['fideos', '1 plato', 1], ['ensalada-mixta', '1 plato', 1]],
      merienda: [['yogur-bebible', '1 vaso', 1], ['granola', '½ taza', 1], ['banana', '1 unidad', 1]],
      cena: [['bife-koygua', '1 porción', 1], ['arroz', '1 taza', 1], ['sopa-paraguaya', '1 cuadradito', 1]],
      colacion: [['mani', '1 puñado', 1], ['terere', '1 jarra', 1]],
    },
  },
];

/** Arma los ítems de una plantilla con ids nuevos */
export function itemsDePlantilla(p: Plantilla, nuevoId: () => string): Partial<Record<TipoComida, ItemComida[]>> {
  const r: Partial<Record<TipoComida, ItemComida[]>> = {};
  for (const [comida, filas] of Object.entries(p.comidas) as [TipoComida, Plantilla['comidas'][TipoComida]][]) {
    r[comida] = (filas ?? []).flatMap(([id, porcion, cantidad]) => {
      const a = buscarAlimento(id);
      return a ? [itemDe(a, porcion, cantidad, nuevoId())] : [];
    });
  }
  return r;
}

export function totalesPlantilla(p: Plantilla): Macros {
  let n = 0;
  return sumar(Object.values(itemsDePlantilla(p, () => String(n++))).flat() as ItemComida[]);
}
