export type Tema = 'claro' | 'oscuro' | 'sistema';
export type Acento = 'oliva' | 'terracota' | 'bronce';
export type Unidad = 'kg' | 'lb';
export type Genero = 'hombre' | 'mujer';
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy-activo';
export type ObjetivoPeso = 'bajar' | 'mantener' | 'subir';
/** Id de una comida del día: las de siempre (desayuno, almuerzo…) o una propia ("c-xxxx") */
export type TipoComida = string;

/** Una comida del día tal como la arma cada uno (nombre y orden propios) */
export interface ComidaDelDia { id: TipoComida; nombre: string }

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
  /** Producto de la base compartida: lo revisó un cargador o el admin */
  verificado?: boolean;
  compartido?: boolean;
}

/**
 * Producto envasado de la base compartida de StoaFit: productos/{codigo}.
 * El código de barras es la llave: un código = un solo producto.
 */
export interface Producto {
  codigo: string;
  nombre: string;
  marca?: string;
  por100: Macros;
  porciones: Porcion[];
  verificado: boolean;
  creadoPor: string;
  creado: number;
  actualizado: number;
  verificadoPor?: string;
  /** Cómo se cargó: a mano o leyendo la etiqueta con IA */
  via?: 'manual' | 'foto';
  /** Comienzos de las palabras del nombre y la marca, para buscar por nombre (v1.14.0) */
  prefijos?: string[];
}

/** Aviso de un usuario: "este producto tiene un error" — reportes/{id} */
export interface Reporte {
  id: string;
  codigo: string;
  nombre: string;
  motivo: string;
  uid: string;
  fecha: number;
}

/** Usuarios que pueden leer etiquetas con foto y verificar productos — config/cargadores */
export interface Cargador { uid: string; nombre: string; email: string }

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
  /** Foto de perfil (data URL WebP/JPEG 256×256, v1.11.0); null = sin foto */
  foto?: string | null;
  /** Widget para Windows (v1.20.0): código secreto de 24 letras del resumen `escritorio/{codigo}`, o null */
  escritorio?: string | null;
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
  /** Comidas del día con nombre y orden propios; si falta, las 5 de siempre */
  comidas?: ComidaDelDia[];
}
