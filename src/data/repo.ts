import type { Alimento, Cargador, ComidaGuardada, Dia, Perfil, Plan, Producto, RegistroCuerpo, Reporte } from '../lib/tipos';
import type { Comentario, Objetivo, Profesional, Solicitud, TipoProfesional, Vinculo } from '../pro/tipos';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  /** Entró como invitado: puede crear su cuenta después sin perder lo registrado */
  invitado?: boolean;
}

/**
 * Todo el acceso a datos pasa por acá. Hay dos versiones:
 *  - RepoMemoria: modo prueba, sin Firebase, con cuentas de ejemplo.
 *  - RepoFirebase: la real, con Auth y Firestore.
 */
export interface Repo {
  readonly modo: 'prueba' | 'firebase';
  readonly permiteGoogle: boolean;

  escucharSesion(cb: (u: Usuario | null) => void): () => void;
  ingresar(email: string, clave: string): Promise<void>;
  registrar(nombre: string, email: string, clave: string): Promise<void>;
  recuperarClave(email: string): Promise<void>;
  ingresarConGoogle(): Promise<void>;
  ingresarComoInvitado(): Promise<void>;
  salir(): Promise<void>;
  borrarCuenta(): Promise<void>;

  leerPerfil(u: Usuario): Promise<Perfil>;
  guardarPerfil(uid: string, cambios: Partial<Perfil>): Promise<void>;
  esAdmin(uid: string): Promise<boolean>;

  /** Un día del diario (null si no registró nada) */
  leerDia(uid: string, fecha: string): Promise<Dia | null>;
  /** Días entre dos fechas (AAAA-MM-DD, incluidas) */
  leerDias(uid: string, desde: string, hasta: string): Promise<Dia[]>;
  /** Guarda el día y el resumen del perfil en una sola tanda */
  guardarDia(uid: string, d: Dia, resumen: Perfil['resumen']): Promise<void>;

  leerPropios(uid: string): Promise<Alimento[]>;
  guardarPropio(uid: string, a: Alimento): Promise<void>;
  borrarPropio(uid: string, id: string): Promise<void>;

  /** Combinaciones guardadas con nombre ("Mi desayuno de siempre") */
  leerGuardadas(uid: string): Promise<ComidaGuardada[]>;
  guardarGuardada(uid: string, c: ComidaGuardada): Promise<void>;
  borrarGuardada(uid: string, id: string): Promise<void>;

  // ── Base compartida de productos envasados (un código = un producto) ──
  leerProducto(codigo: string): Promise<Producto | null>;
  /** Crea el producto solo si el código no existe; si ya existe devuelve el que está */
  crearProducto(p: Producto): Promise<{ creado: boolean; producto: Producto }>;
  /** Corregir / verificar: solo cargadores y admin */
  guardarProducto(p: Producto): Promise<void>;
  borrarProducto(codigo: string): Promise<void>;
  leerSinVerificar(): Promise<Producto[]>;
  /** Busca por nombre en la base compartida (una palabra de 3 a 15 letras, sin tildes); pocas lecturas */
  buscarProductos(clave: string, max?: number): Promise<Producto[]>;
  /** Solo admin: todos los productos (para completar la búsqueda por nombre de los viejos) */
  leerTodosProductos(): Promise<Producto[]>;
  reportar(r: Reporte): Promise<void>;
  leerReportes(): Promise<Reporte[]>;
  borrarReporte(id: string): Promise<void>;
  esCargador(uid: string): Promise<boolean>;
  leerCargadores(): Promise<Cargador[]>;
  /** El admin busca a la persona por su correo y la marca como cargador */
  agregarCargador(email: string): Promise<Cargador>;
  quitarCargador(uid: string): Promise<void>;
  /** Lee una etiqueta nutricional de una foto (solo cargadores) */
  leerEtiqueta(foto: Blob): Promise<unknown>;

  leerCuerpo(uid: string): Promise<RegistroCuerpo[]>;
  guardarCuerpo(uid: string, r: RegistroCuerpo): Promise<void>;
  borrarCuerpo(uid: string, id: string): Promise<void>;

  leerPlanes(uid: string): Promise<Plan[]>;
  guardarPlan(uid: string, p: Plan): Promise<void>;
  borrarPlan(uid: string, id: string): Promise<void>;

  exportar(uid: string): Promise<unknown>;

  // ── Profesionales y clientes (base reutilizable; las pantallas llegan en la Fase 2) ──
  leerPerfilDe(uid: string): Promise<Perfil | null>;
  leerProfesional(uid: string): Promise<Profesional | null>;
  leerMiSolicitud(uid: string): Promise<Solicitud | null>;
  enviarSolicitud(s: Solicitud): Promise<void>;
  leerSolicitudes(): Promise<Solicitud[]>;
  aprobarSolicitud(s: Solicitud, codigo: string): Promise<Profesional>;
  rechazarSolicitud(uid: string): Promise<void>;
  leerProfesionales(): Promise<Profesional[]>;
  cambiarEstadoProfesional(uid: string, activo: boolean): Promise<void>;
  vincular(cliente: { uid: string; nombre: string }, codigo: string, tipo: TipoProfesional): Promise<Vinculo>;
  leerMisProfesionales(clienteId: string): Promise<Vinculo[]>;
  leerClientes(profesionalId: string): Promise<Vinculo[]>;
  terminarVinculo(id: string): Promise<void>;
  leerComentarios(clienteId: string): Promise<Comentario[]>;
  guardarComentario(clienteId: string, c: Comentario): Promise<void>;
  marcarLeidos(clienteId: string, ids: string[]): Promise<void>;
  leerObjetivos(clienteId: string): Promise<Objetivo[]>;
  guardarObjetivo(clienteId: string, o: Objetivo): Promise<void>;
  borrarObjetivo(clienteId: string, id: string): Promise<void>;
}

export class ErrorApp extends Error {}

export function mensajeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const mapa: Record<string, string> = {
    'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
    'auth/wrong-password': 'El correo o la contraseña no coinciden.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
    'auth/invalid-email': 'Ese correo no parece válido.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá un momento y probá de nuevo.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
    'auth/network-request-failed': 'Sin conexión. Revisá tu internet.',
    'auth/credential-already-in-use': 'Esa cuenta de Google ya existe. Salí del modo invitado e ingresá con ella.',
    'auth/operation-not-allowed': 'Ese modo de acceso no está habilitado todavía.',
    'auth/requires-recent-login': 'Por seguridad, salí y volvé a ingresar antes de borrar la cuenta.',
    'permission-denied': 'No tenés permiso para eso.',
    'pro/codigo': 'Ese código no existe o el profesional ya no está activo.',
    'pro/propio': 'No podés ser cliente de vos mismo.',
    'cargador/no-existe': 'No hay ninguna cuenta de StoaFit con ese correo.',
    'ia/no-disponible': 'La lectura de etiquetas todavía no está activada.',
    'ia/app-check': 'La lectura de etiquetas está bloqueada por la Verificación de aplicaciones (App Check) de Firebase.',
    'ia/limite': 'Se alcanzó el límite de lecturas por hoy. Cargá la etiqueta a mano.',
    'ia/no-leyo': 'No pudimos leer la etiqueta. Probá con otra foto, más cerca y sin brillo.',
  };
  if (mapa[code]) return mapa[code];
  if (e instanceof Error && e.message) return e.message;
  return 'Algo salió mal. Probá de nuevo.';
}
