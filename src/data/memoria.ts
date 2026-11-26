import type { Alimento, Cargador, ComidaGuardada, Dia, Perfil, Plan, Producto, RegistroCuerpo, Reporte } from '../lib/tipos';
import { PRODUCTOS_COMPARTIDOS_PRUEBA, LECTURA_PRUEBA, REPORTES_PRUEBA } from './semilla';
import { ErrorApp, type Repo, type Usuario } from './repo';
import { prefijosDe } from '../lib/productos';
import { CLAVE_PRUEBA, USUARIO_PRUEBA, datosDePrueba, perfilInicial } from './semilla';
import type { Codigo, Comentario, Objetivo, Profesional, Solicitud, TipoProfesional, Vinculo } from '../pro/tipos';
import { idVinculo, normalizarCodigo } from '../pro/logica';

interface Datos {
  perfil?: Perfil;
  dias: Map<string, Dia>;
  propios: Map<string, Alimento>;
  cuerpo: Map<string, RegistroCuerpo>;
  planes: Map<string, Plan>;
  guardadas: Map<string, ComidaGuardada>;
  comentarios: Map<string, Comentario>;
  objetivos: Map<string, Objetivo>;
}

/** Lo que no cuelga de un usuario: profesionales, solicitudes, códigos y vínculos */
interface Comun {
  productos: Map<string, Producto>;
  reportes: Map<string, Reporte>;
  cargadores: Map<string, Cargador>;
  profesionales: Map<string, Profesional>;
  solicitudes: Map<string, Solicitud>;
  codigos: Map<string, Codigo>;
  vinculos: Map<string, Vinculo>;
}

const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
export const CLAVE_SESION = 'stoafit-prueba-datos';

type DatosPlanos = {
  perfil?: Perfil; dias: Dia[]; propios: Alimento[]; cuerpo: RegistroCuerpo[]; planes: Plan[]; guardadas?: ComidaGuardada[];
  comentarios?: Comentario[]; objetivos?: Objetivo[];
};
type ComunPlano = { productos?: Producto[]; reportes?: Reporte[]; cargadores?: Cargador[]; profesionales: Profesional[]; solicitudes: Solicitud[]; codigos: Codigo[]; vinculos: Vinculo[] };
const ERR = (code: string) => Object.assign(new ErrorApp(code), { code });
const copia = <T,>(x: T): T => structuredClone(x);

/** Modo prueba: todo vive en la memoria del navegador (y en la pestaña, para sobrevivir a recargas). */
export class RepoMemoria implements Repo {
  readonly modo = 'prueba' as const;
  readonly permiteGoogle = true;
  private usuario: Usuario | null = null;
  private oyentes = new Set<(u: Usuario | null) => void>();
  private cuentas = new Map<string, { u: Usuario; clave: string }>();
  private datos = new Map<string, Datos>();
  protected comun: Comun = {
    productos: new Map(PRODUCTOS_COMPARTIDOS_PRUEBA.map((p) => [p.codigo, p])),
    reportes: new Map(REPORTES_PRUEBA.map((r) => [r.id, r])),
    cargadores: new Map(),
    profesionales: new Map(), solicitudes: new Map(), codigos: new Map(), vinculos: new Map() };

  constructor(private ahora = Date.now(), private persistir = typeof sessionStorage !== 'undefined') {
    this.cuentas.set(USUARIO_PRUEBA.email, { u: USUARIO_PRUEBA, clave: CLAVE_PRUEBA });
    this.cargarEjemplo(USUARIO_PRUEBA, 'Sofía');
    this.agregarCuentaComun();
    this.cargarEjemplo({ uid: 'u-lucas', email: 'lucas@ejemplo.com', nombre: 'Lucas' }, 'Lucas', { semilla: 11 });
    this.restaurar();
  }

  private guardar() {
    if (!this.persistir) return;
    try {
      const datos: Record<string, DatosPlanos> = {};
      for (const [uid, d] of this.datos) {
        datos[uid] = {
          perfil: d.perfil, dias: [...d.dias.values()], propios: [...d.propios.values()], cuerpo: [...d.cuerpo.values()],
          planes: [...d.planes.values()], guardadas: [...d.guardadas.values()], comentarios: [...d.comentarios.values()], objetivos: [...d.objetivos.values()],
        };
      }
      const c = this.comun;
      const comun: ComunPlano = {
        productos: [...c.productos.values()], reportes: [...c.reportes.values()], cargadores: [...c.cargadores.values()],
        profesionales: [...c.profesionales.values()], solicitudes: [...c.solicitudes.values()],
        codigos: [...c.codigos.values()], vinculos: [...c.vinculos.values()],
      };
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario: this.usuario, cuentas: [...this.cuentas.entries()], datos, comun }));
    } catch { /* sin espacio: queda solo en memoria */ }
  }

  private restaurar() {
    if (!this.persistir) return;
    try {
      const t = sessionStorage.getItem(CLAVE_SESION);
      if (!t) return;
      const g = JSON.parse(t) as { usuario: Usuario | null; cuentas: [string, { u: Usuario; clave: string }][]; datos: Record<string, DatosPlanos>; comun?: ComunPlano };
      this.usuario = g.usuario;
      for (const [email, c] of g.cuentas) this.cuentas.set(email, c);
      for (const [uid, d] of Object.entries(g.datos ?? {})) {
        this.datos.set(uid, {
          perfil: d.perfil,
          dias: new Map((d.dias ?? []).map((x) => [x.fecha, x])),
          propios: new Map((d.propios ?? []).map((x) => [x.id, x])),
          cuerpo: new Map((d.cuerpo ?? []).map((x) => [x.id, x])),
          planes: new Map((d.planes ?? []).map((x) => [x.id, x])),
          guardadas: new Map((d.guardadas ?? []).map((x) => [x.id, x])),
          comentarios: new Map((d.comentarios ?? []).map((x) => [x.id, x])),
          objetivos: new Map((d.objetivos ?? []).map((x) => [x.id, x])),
        });
      }
      if (g.comun) {
        if (g.comun.productos) this.comun.productos = new Map(g.comun.productos.map((x) => [x.codigo, x]));
        if (g.comun.reportes) this.comun.reportes = new Map(g.comun.reportes.map((x) => [x.id, x]));
        for (const x of g.comun.cargadores ?? []) this.comun.cargadores.set(x.uid, x);
        for (const x of g.comun.profesionales ?? []) this.comun.profesionales.set(x.uid, x);
        for (const x of g.comun.solicitudes ?? []) this.comun.solicitudes.set(x.uid, x);
        for (const x of g.comun.codigos ?? []) this.comun.codigos.set(x.codigo, x);
        for (const x of g.comun.vinculos ?? []) this.comun.vinculos.set(x.id, x);
      }
    } catch { /* datos viejos o dañados: se empieza de cero */ }
  }

  /** Carga 6 semanas inventadas de comidas, peso y un plan */
  protected cargarEjemplo(u: Usuario, nombre: string, opciones: { desfaseDias?: number; semilla?: number } = {}) {
    const s = datosDePrueba(u, nombre, this.ahora, opciones);
    this.datos.set(u.uid, {
      perfil: s.perfil,
      dias: new Map(s.dias.map((d) => [d.fecha, d])),
      propios: new Map(),
      cuerpo: new Map(s.cuerpo.map((c) => [c.id, c])),
      planes: new Map(s.planes.map((p) => [p.id, p])),
      guardadas: new Map(s.guardadas.map((g) => [g.id, g])),
      comentarios: new Map(),
      objetivos: new Map(),
    });
  }

  protected d(uid: string): Datos {
    let x = this.datos.get(uid);
    if (!x) {
      x = { dias: new Map(), propios: new Map(), cuerpo: new Map(), planes: new Map(), guardadas: new Map(), comentarios: new Map(), objetivos: new Map() };
      this.datos.set(uid, x);
    }
    return x;
  }

  protected agregarCuenta(u: Usuario) { this.cuentas.set(u.email, { u, clave: CLAVE_PRUEBA }); }

  private avisar() {
    this.guardar();
    for (const o of this.oyentes) o(this.usuario);
  }

  escucharSesion(cb: (u: Usuario | null) => void) {
    this.oyentes.add(cb);
    setTimeout(() => cb(this.usuario), 0);
    return () => { this.oyentes.delete(cb); };
  }

  async ingresar(email: string, clave: string) {
    await espera();
    const c = this.cuentas.get(email.trim().toLowerCase());
    if (!c || c.clave !== clave) throw ERR('auth/invalid-credential');
    this.usuario = c.u;
    this.avisar();
  }

  async registrar(nombre: string, email: string, clave: string) {
    await espera();
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) throw ERR('auth/invalid-email');
    if (this.cuentas.has(e)) throw ERR('auth/email-already-in-use');
    if (clave.length < 6) throw ERR('auth/weak-password');
    const uid = this.usuario?.invitado ? this.usuario.uid : 'u-' + Math.random().toString(36).slice(2, 9);
    const u: Usuario = { uid, email: e, nombre };
    const d = this.datos.get(uid);
    if (d?.perfil) { d.perfil.email = e; d.perfil.nombre = nombre || d.perfil.nombre; }
    this.cuentas.set(e, { u, clave });
    this.usuario = u;
    this.avisar();
  }

  async recuperarClave(email: string) {
    await espera();
    if (!email.includes('@')) throw ERR('auth/invalid-email');
  }

  async ingresarConGoogle() {
    await espera();
    this.usuario = USUARIO_PRUEBA;
    this.avisar();
  }

  async ingresarComoInvitado() {
    await espera();
    // El invitado empieza de cero: ve la bienvenida "Conocerte"
    this.usuario = { uid: 'inv-' + Math.random().toString(36).slice(2, 9), email: '', nombre: '', invitado: true };
    this.avisar();
  }

  async salir() {
    this.usuario = null;
    this.avisar();
  }

  /** Para el modo prueba: una segunda cuenta común (sin permisos de cargador) */
  protected agregarCuentaComun() { this.agregarCuenta({ uid: 'u-lucas', email: 'lucas@ejemplo.com', nombre: 'Lucas' }); }

  /** Resúmenes del widget de Windows (solo para probar) */
  escritorios = new Map<string, { uid: string; t: string; actualizado: number }>();

  async guardarEscritorio(uid: string, codigo: string, t: string) {
    this.escritorios.set(codigo, { uid, t, actualizado: Date.now() });
  }

  async borrarEscritorio(codigo: string) {
    this.escritorios.delete(codigo);
  }

  async borrarCuenta() {
    if (!this.usuario) return;
    const uid = this.usuario.uid;
    this.datos.delete(uid);
    for (const v of this.comun.vinculos.values()) if (v.clienteId === uid || v.profesionalId === uid) v.activo = false;
    this.cuentas.delete(this.usuario.email);
    this.usuario = null;
    this.avisar();
  }

  async leerPerfil(u: Usuario) {
    await espera(60);
    const d = this.d(u.uid);
    if (!d.perfil) { d.perfil = perfilInicial(u); this.guardar(); }
    return copia(d.perfil);
  }

  async guardarPerfil(uid: string, cambios: Partial<Perfil>) {
    const d = this.d(uid);
    if (d.perfil) d.perfil = { ...d.perfil, ...copia(cambios) };
    this.guardar();
  }

  async esAdmin(uid: string) { return uid === USUARIO_PRUEBA.uid; }

  /** Simula las reglas: la persona misma, o su profesional con vínculo activo */
  protected puedeVer(uid: string) {
    const yo = this.usuario?.uid;
    if (!yo) return false;
    if (yo === uid) return true;
    const v = this.comun.vinculos.get(idVinculo(yo, uid));
    return !!v?.activo && !!this.comun.profesionales.get(yo)?.activo;
  }
  private ver(uid: string) { if (!this.puedeVer(uid)) throw ERR('permission-denied'); }
  private propio(uid: string) { if (this.usuario?.uid !== uid) throw ERR('permission-denied'); }

  async leerDia(uid: string, fecha: string) {
    this.ver(uid);
    await espera(40);
    const x = this.d(uid).dias.get(fecha);
    return x ? copia(x) : null;
  }
  async leerDias(uid: string, desde: string, hasta: string) {
    this.ver(uid);
    await espera(60);
    return copia([...this.d(uid).dias.values()].filter((x) => x.fecha >= desde && x.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha)));
  }
  async guardarDia(uid: string, x: Dia, resumen: Perfil['resumen']) {
    this.propio(uid);
    const d = this.d(uid);
    d.dias.set(x.fecha, copia(x));
    if (d.perfil) d.perfil.resumen = copia(resumen);
    this.guardar();
  }

  async leerPropios(uid: string) { this.ver(uid); return copia([...this.d(uid).propios.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))); }
  async guardarPropio(uid: string, a: Alimento) { this.propio(uid); this.d(uid).propios.set(a.id, copia({ ...a, propio: true })); this.guardar(); }
  async borrarPropio(uid: string, id: string) { this.propio(uid); this.d(uid).propios.delete(id); this.guardar(); }

  async leerGuardadas(uid: string) { this.ver(uid); return copia([...this.d(uid).guardadas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))); }
  async guardarGuardada(uid: string, c: ComidaGuardada) { this.propio(uid); this.d(uid).guardadas.set(c.id, copia(c)); this.guardar(); }
  async borrarGuardada(uid: string, id: string) { this.propio(uid); this.d(uid).guardadas.delete(id); this.guardar(); }

  // ── Base compartida ──
  private conSesion() { if (!this.usuario) throw ERR('permission-denied'); }
  private async puedeCorregir() { if (!this.usuario || !(await this.esCargador(this.usuario.uid))) throw ERR('permission-denied'); }
  async leerProducto(codigo: string) { this.conSesion(); await espera(80); return copia(this.comun.productos.get(codigo) ?? null); }
  async crearProducto(p: Producto) {
    this.conSesion();
    await espera(80);
    const ya = this.comun.productos.get(p.codigo);
    if (ya) return { creado: false, producto: copia(ya) };
    if (p.creadoPor !== this.usuario!.uid) throw ERR('permission-denied');
    if (p.verificado && !(await this.esCargador(this.usuario!.uid))) throw ERR('permission-denied');
    this.comun.productos.set(p.codigo, copia(p));
    this.guardar();
    return { creado: true, producto: copia(p) };
  }
  async guardarProducto(p: Producto) { await this.puedeCorregir(); this.comun.productos.set(p.codigo, copia(p)); this.guardar(); }
  async borrarProducto(codigo: string) { await this.puedeCorregir(); this.comun.productos.delete(codigo); this.guardar(); }
  async buscarProductos(clave: string, max = 8) {
    this.conSesion(); await espera(80);
    return copia([...this.comun.productos.values()].filter((p) => (p.prefijos ?? prefijosDe(p.nombre, p.marca)).includes(clave)).slice(0, max));
  }
  async leerTodosProductos() { await this.puedeCorregir(); return copia([...this.comun.productos.values()]); }
  async contarPendientes() {
    await this.puedeCorregir();
    return { reportes: this.comun.reportes.size, sinVerificar: [...this.comun.productos.values()].filter((p) => !p.verificado).length };
  }
  async leerSinVerificar() { await this.puedeCorregir(); return copia([...this.comun.productos.values()].filter((p) => !p.verificado).sort((a, b) => b.creado - a.creado)); }
  async reportar(r: Reporte) { this.conSesion(); this.comun.reportes.set(r.id, copia(r)); this.guardar(); }
  async leerReportes() { await this.puedeCorregir(); return copia([...this.comun.reportes.values()].sort((a, b) => b.fecha - a.fecha)); }
  async borrarReporte(id: string) { await this.puedeCorregir(); this.comun.reportes.delete(id); this.guardar(); }
  async esCargador(uid: string) { return this.comun.cargadores.has(uid) || (await this.esAdmin(uid)); }
  async leerCargadores() { this.soloAdmin(); return copia([...this.comun.cargadores.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))); }
  async agregarCargador(email: string) {
    this.soloAdmin();
    await espera();
    const c = this.cuentas.get(email.trim().toLowerCase());
    if (!c) throw ERR('cargador/no-existe');
    const x: Cargador = { uid: c.u.uid, nombre: this.datos.get(c.u.uid)?.perfil?.nombre || c.u.nombre || c.u.email, email: c.u.email };
    this.comun.cargadores.set(x.uid, x);
    this.guardar();
    return copia(x);
  }
  async quitarCargador(uid: string) { this.soloAdmin(); this.comun.cargadores.delete(uid); this.guardar(); }
  async leerEtiqueta(_foto: Blob) {
    await this.puedeCorregir();
    await espera(900);
    return copia(LECTURA_PRUEBA);
  }

  async leerCuerpo(uid: string) { this.ver(uid); return copia([...this.d(uid).cuerpo.values()].sort((a, b) => a.fecha - b.fecha)); }
  async guardarCuerpo(uid: string, r: RegistroCuerpo) { this.propio(uid); this.d(uid).cuerpo.set(r.id, copia(r)); this.guardar(); }
  async borrarCuerpo(uid: string, id: string) { this.propio(uid); this.d(uid).cuerpo.delete(id); this.guardar(); }

  async leerPlanes(uid: string) { this.ver(uid); return copia([...this.d(uid).planes.values()].sort((a, b) => b.creado - a.creado)); }
  async guardarPlan(uid: string, p: Plan) {
    const yo = this.usuario?.uid;
    const previo = this.d(uid).planes.get(p.id);
    if (yo === uid && (p.asignadaPor || previo?.asignadaPor)) throw ERR('permission-denied');
    if (yo !== uid && (!this.puedeVer(uid) || p.asignadaPor !== yo || (previo && previo.asignadaPor !== yo))) throw ERR('permission-denied');
    this.d(uid).planes.set(p.id, copia(p));
    this.guardar();
  }
  async borrarPlan(uid: string, id: string) {
    const p = this.d(uid).planes.get(id);
    if (this.usuario?.uid !== uid && p?.asignadaPor !== this.usuario?.uid) throw ERR('permission-denied');
    this.d(uid).planes.delete(id);
    this.guardar();
  }

  async exportar(uid: string) {
    const d = this.d(uid);
    return copia({
      perfil: d.perfil, dias: [...d.dias.values()], alimentosPropios: [...d.propios.values()], cuerpo: [...d.cuerpo.values()],
      planes: [...d.planes.values()], comidasGuardadas: [...d.guardadas.values()], comentarios: [...d.comentarios.values()], objetivos: [...d.objetivos.values()],
      vinculos: [...this.comun.vinculos.values()].filter((v) => v.clienteId === uid || v.profesionalId === uid),
    });
  }

  // ── Profesionales y clientes ──
  async leerPerfilDe(uid: string) {
    await espera(40);
    this.ver(uid);
    const p = this.datos.get(uid)?.perfil;
    return p ? copia(p) : null;
  }
  async leerProfesional(uid: string) { return copia(this.comun.profesionales.get(uid) ?? null); }
  async leerMiSolicitud(uid: string) { return copia(this.comun.solicitudes.get(uid) ?? null); }
  async enviarSolicitud(s: Solicitud) { await espera(); this.comun.solicitudes.set(s.uid, copia(s)); this.guardar(); }
  private soloAdmin() { if (this.usuario?.uid !== USUARIO_PRUEBA.uid) throw ERR('permission-denied'); }
  async leerSolicitudes() { this.soloAdmin(); return copia([...this.comun.solicitudes.values()].sort((a, b) => b.fecha - a.fecha)); }
  async aprobarSolicitud(s: Solicitud, codigo: string) {
    this.soloAdmin();
    const p: Profesional = { uid: s.uid, tipo: s.tipo, nombre: s.nombre, codigo, activo: true, alta: Date.now() };
    this.comun.profesionales.set(p.uid, p);
    this.comun.codigos.set(codigo, { codigo, profesionalId: p.uid, tipo: p.tipo, nombre: p.nombre });
    this.comun.solicitudes.set(s.uid, { ...s, estado: 'aprobada' });
    this.guardar();
    return copia(p);
  }
  async rechazarSolicitud(uid: string) {
    this.soloAdmin();
    const s = this.comun.solicitudes.get(uid);
    if (s) s.estado = 'rechazada';
    this.guardar();
  }
  async leerProfesionales() { this.soloAdmin(); return copia([...this.comun.profesionales.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))); }
  async cambiarEstadoProfesional(uid: string, activo: boolean) {
    this.soloAdmin();
    const p = this.comun.profesionales.get(uid);
    if (p) p.activo = activo;
    this.guardar();
  }
  async vincular(cliente: { uid: string; nombre: string }, codigo: string, tipo: TipoProfesional) {
    await espera();
    const c = this.comun.codigos.get(normalizarCodigo(codigo));
    const p = c && this.comun.profesionales.get(c.profesionalId);
    if (!c || !p?.activo || c.tipo !== tipo) throw ERR('pro/codigo');
    if (p.uid === cliente.uid) throw ERR('pro/propio');
    const v: Vinculo = {
      id: idVinculo(p.uid, cliente.uid), profesionalId: p.uid, clienteId: cliente.uid, tipo,
      nombreProfesional: p.nombre, nombreCliente: cliente.nombre, codigo: c.codigo, desde: Date.now(), activo: true,
    };
    this.comun.vinculos.set(v.id, v);
    this.guardar();
    return copia(v);
  }
  async leerMisProfesionales(clienteId: string) { return copia([...this.comun.vinculos.values()].filter((v) => v.clienteId === clienteId && v.activo)); }
  async leerClientes(profesionalId: string) { await espera(60); return copia([...this.comun.vinculos.values()].filter((v) => v.profesionalId === profesionalId && v.activo)); }
  async terminarVinculo(id: string) {
    const v = this.comun.vinculos.get(id);
    if (v) { v.activo = false; v.hasta = Date.now(); }
    this.guardar();
  }
  async leerComentarios(clienteId: string) { this.ver(clienteId); return copia([...this.d(clienteId).comentarios.values()].sort((a, b) => b.fecha - a.fecha)); }
  async guardarComentario(clienteId: string, c: Comentario) { this.ver(clienteId); this.d(clienteId).comentarios.set(c.id, copia(c)); this.guardar(); }
  async marcarLeidos(clienteId: string, ids: string[]) {
    const m = this.d(clienteId).comentarios;
    for (const id of ids) { const c = m.get(id); if (c) c.leido = true; }
    this.guardar();
  }
  async leerObjetivos(clienteId: string) { this.ver(clienteId); return copia([...this.d(clienteId).objetivos.values()].sort((a, b) => a.fecha - b.fecha)); }
  async guardarObjetivo(clienteId: string, o: Objetivo) {
    if (!this.puedeVer(clienteId) || clienteId === this.usuario?.uid) throw ERR('permission-denied');
    this.d(clienteId).objetivos.set(o.id, copia(o));
    this.guardar();
  }
  async borrarObjetivo(clienteId: string, id: string) {
    if (!this.puedeVer(clienteId)) throw ERR('permission-denied');
    this.d(clienteId).objetivos.delete(id);
    this.guardar();
  }
}
