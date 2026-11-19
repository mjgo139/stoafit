export type Tema = 'claro' | 'oscuro' | 'sistema';
export type Acento = 'oliva' | 'terracota' | 'bronce';
export type Unidad = 'kg' | 'lb';
export type Genero = 'hombre' | 'mujer';
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy-activo';
export type ObjetivoPeso = 'bajar' | 'mantener' | 'subir';
export type TipoComida = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'colacion';

/** Calorías y macronutrientes (gramos) */
export interface Macros { kcal: number; prot: number; carb: number; gras: number }

/** Meta diaria: macros + agua en ml */
export interface Metas extends Macros { agua: number }

/** Medida casera de un alimento: "1 taza" = 160 g */
export interface Porcion { nombre: string; gramos: number }

/** Alimento de la biblioteca o propio. Valores cada 100 g (o 100 ml). */
export interface Alimento {
  id: string;
  nombre: string;
  grupo: GrupoAlimento;
  por100: Macros;
  porciones: Porcion[];
  /** Palabras extra para la búsqueda */
  alias?: string[];
  propio?: boolean;
  marca?: string;
  /** Código de barras (EAN/UPC) del envase */
  codigo?: string;
  /** De dónde salió: cargado a mano, Open Food Facts o una receta */
  fuente?: 'manual' | 'off' | 'receta';
  /** Si es una receta: sus ingredientes y cuánto rinde */
  receta?: Receta;
}

/** Receta casera: ingredientes de la biblioteca, en cuántas porciones se divide y (opcional) el peso de la fuente terminada */
export interface Receta {
  ingredientes: ItemComida[];
  porciones: number;
  /** Peso total cocido en gramos; si falta, se usa la suma de los ingredientes */
  pesoTotal?: number;
}

/** Combinación guardada con nombre ("Mi desayuno de siempre"): users/{uid}/savedMeals/{id} */
export interface ComidaGuardada {
  id: string;
  nombre: string;
  items: ItemComida[];
  creado: number;
}

export type GrupoAlimento =
  | 'tipicos' | 'carnes' | 'lacteos' | 'cereales' | 'legumbres' | 'verduras' | 'frutas' | 'bebidas' | 'grasas' | 'dulces' | 'rapida'
  | 'envasados' | 'recetas';

/** Lo que se comió: guarda sus macros calculados, así no cambia si se edita el alimento */
export interface ItemComida extends Macros {
  id: string;
  alimentoId: string;
  nombre: string;
  /** Cantidad de porciones (1, 0.5, 2…) */
  cantidad: number;
  porcion: string;
  gramos: number;
}

/** Un día del diario: users/{uid}/days/{AAAA-MM-DD} */
export interface Dia {
  fecha: string;
  comidas: Partial<Record<TipoComida, ItemComida[]>>;
  /** ml */
  agua: number;
  totales: Macros;
  /** Metas de ese día (por si cambian después) */
  metas?: Metas;
  actualizado: number;
}

export interface RegistroCuerpo {
  id: string;
  fecha: number;
  peso?: number;
  cintura?: number;
  cadera?: number;
  brazo?: number;
  muslo?: number;
}

/** Plan propio o asignado por su nutricionista */
export interface Plan {
  id: string;
  nombre: string;
  descripcion?: string;
  metas?: Metas;
  /** Ideas de cada comida (texto libre: "1 taza de cocido + 2 rodajas de pan…") */
  comidas: Partial<Record<TipoComida, string>>;
  creado: number;
  asignadaPor?: string;
  nombreAsignador?: string;
}

export interface Recordatorio { activo: boolean; hora: string; dias: number[] }

export interface Perfil {
  uid: string;
  nombre: string;
  email: string;
  tema: Tema;
  acento?: Acento;
  unidad: Unidad;
  recordatorio: Recordatorio;
  creado: number;
  /** Para leer poco: días con registros y días cumplidos (AAAA-MM-DD, los últimos 120) */
  resumen: { dias: string[]; cumplidos: string[]; total: number };
  // Conocerte
  conocido?: boolean;
  genero?: Genero;
  nacimiento?: string;
  altura?: number;
  actividad?: Actividad;
  objetivo?: ObjetivoPeso;
  /** Meta diaria; si `metasManual` es falso se recalcula sola al cambiar los datos */
  metas?: Metas;
  metasManual?: boolean;
  favoritos?: string[];
}
