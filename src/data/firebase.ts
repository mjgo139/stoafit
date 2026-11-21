import { initializeApp } from 'firebase/app';
import {
  EmailAuthProvider, GoogleAuthProvider, createUserWithEmailAndPassword, deleteUser, getAuth, linkWithCredential,
  linkWithPopup, onIdTokenChanged, sendPasswordResetEmail, signInAnonymously, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile,
} from 'firebase/auth';
import {
  collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, limit, orderBy, documentId,
  persistentLocalCache, persistentMultipleTabManager, query, runTransaction, setDoc, where,
  writeBatch, type Firestore,
  getCountFromServer,
} from 'firebase/firestore';
import type { Alimento, Cargador, ComidaGuardada, Dia, Perfil, Plan, Producto, RegistroCuerpo, Reporte } from '../lib/tipos';
import { firebaseConfig } from '../firebaseConfig';
import { ErrorApp, type Repo, type Usuario } from './repo';
import type { Comentario, Objetivo, Profesional, Solicitud, TipoProfesional, Vinculo, Codigo } from '../pro/tipos';
import { idVinculo, normalizarCodigo } from '../pro/logica';
import { perfilInicial } from './semilla';

/** Firestore no acepta `undefined`: lo quitamos antes de guardar */
function limpio<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/** Sin conexión, las escrituras quedan en cola y la promesa tarda: no frenamos la pantalla por eso */
function sinBloquear(p: Promise<unknown>, ms = 2500): Promise<void> {
  return Promise.race([p.then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
}

const SUBCOLECCIONES = ['days', 'customFoods', 'savedMeals', 'bodyLogs', 'plans', 'comments', 'goals'];

export class RepoFirebase implements Repo {
  readonly modo = 'firebase' as const;
  readonly permiteGoogle: boolean;
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private db: Firestore;

  constructor(nativo: boolean) {
    // En la APK, el acceso con Google necesita un complemento nativo (fase siguiente)
    this.permiteGoogle = !nativo;
    this.auth.languageCode = 'es';
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }

  private u(uid: string) { return doc(this.db, 'users', uid); }
  private col(uid: string, nombre: string) { return collection(this.db, 'users', uid, nombre); }

  escucharSesion(cb: (u: Usuario | null) => void) {
    // onIdTokenChanged también avisa cuando un invitado se convierte en cuenta
    return onIdTokenChanged(this.auth, (fu) => {
      cb(fu ? { uid: fu.uid, email: fu.email ?? '', nombre: fu.displayName ?? '', invitado: fu.isAnonymous } : null);
    });
  }

  async ingresar(email: string, clave: string) {
    await signInWithEmailAndPassword(this.auth, email.trim(), clave);
  }

  async registrar(nombre: string, email: string, clave: string) {
    const actual = this.auth.currentUser;
    if (actual?.isAnonymous) {
      // El invitado pasa a tener cuenta y conserva todo lo que registró
      const c = await linkWithCredential(actual, EmailAuthProvider.credential(email.trim(), clave));
      if (nombre) await updateProfile(c.user, { displayName: nombre });
      await setDoc(this.u(c.user.uid), { email: c.user.email ?? '', ...(nombre ? { nombre } : {}) }, { merge: true });
      await c.user.reload();
      await c.user.getIdToken(true);
      return;
    }
    const c = await createUserWithEmailAndPassword(this.auth, email.trim(), clave);
    if (nombre) await updateProfile(c.user, { displayName: nombre });
    // merge: si la app ya creó el perfil vacío al detectar la cuenta nueva, solo se completa el nombre
    await setDoc(this.u(c.user.uid), limpio(perfilInicial({ uid: c.user.uid, email: c.user.email ?? '', nombre })), { merge: true });
    // Avisa a la app que la cuenta ya tiene nombre (así "Conocerte" no lo vuelve a pedir)
    await c.user.getIdToken(true);
  }

  async recuperarClave(email: string) {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  async ingresarConGoogle() {
    const actual = this.auth.currentUser;
    if (actual?.isAnonymous) {
      const c = await linkWithPopup(actual, new GoogleAuthProvider());
      await setDoc(this.u(c.user.uid), { email: c.user.email ?? '', nombre: c.user.displayName ?? '' }, { merge: true });
      await c.user.reload();
      await c.user.getIdToken(true);
      return;
    }
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async ingresarComoInvitado() {
    await signInAnonymously(this.auth);
  }

  async salir() {
    await signOut(this.auth);
  }

  async borrarCuenta() {
    const fu = this.auth.currentUser;
    if (!fu) return;
    // Firebase exige un ingreso reciente para borrar la cuenta: lo comprobamos ANTES de borrar los datos
    const t = await fu.getIdTokenResult();
    const hace = Date.now() - new Date(t.authTime).getTime();
    if (hace > 5 * 60_000) throw Object.assign(new Error('reciente'), { code: 'auth/requires-recent-login' });
    const uid = fu.uid;
    // Se cortan los vínculos con profesionales antes de borrar
    for (const v of await this.leerMisProfesionales(uid)) await this.terminarVinculo(v.id);
    for (const nombre of SUBCOLECCIONES) {
      const snap = await getDocs(this.col(uid, nombre));
      let lote = writeBatch(this.db);
      let n = 0;
      for (const d of snap.docs) {
        lote.delete(d.ref);
        if (++n % 450 === 0) { await lote.commit(); lote = writeBatch(this.db); }
      }
      await lote.commit();
    }
    await deleteDoc(this.u(uid));
    await deleteUser(fu);
  }

  async leerPerfil(u: Usuario): Promise<Perfil> {
    const s = await getDoc(this.u(u.uid));
    const base = perfilInicial(u);
    if (!s.exists()) {
      await sinBloquear(setDoc(this.u(u.uid), limpio(base)));
      return base;
    }
    const p = s.data() as Partial<Perfil>;
    return { ...base, ...p, uid: u.uid, resumen: p.resumen ?? base.resumen, recordatorio: p.recordatorio ?? base.recordatorio };
  }

  async guardarPerfil(uid: string, cambios: Partial<Perfil>) {
    await sinBloquear(setDoc(this.u(uid), limpio(cambios), { merge: true }));
  }

  async esAdmin(uid: string) {
    try {
      const s = await getDoc(doc(this.db, 'config', 'admins'));
      const uids = (s.data()?.uids as string[] | undefined) ?? [];
      return uids.includes(uid);
    } catch {
      return false;
    }
  }

  async leerDia(uid: string, fecha: string) {
    const s = await getDoc(doc(this.col(uid, 'days'), fecha));
    return s.exists() ? ({ ...(s.data() as Dia), fecha }) : null;
  }
  async leerDias(uid: string, desde: string, hasta: string) {
    const s = await getDocs(query(this.col(uid, 'days'), where(documentId(), '>=', desde), where(documentId(), '<=', hasta)));
    return s.docs.map((d) => ({ ...(d.data() as Dia), fecha: d.id })).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  async guardarDia(uid: string, d: Dia, resumen: Perfil['resumen']) {
    // El día y el resumen del perfil se guardan juntos: 2 escrituras por cambio
    const lote = writeBatch(this.db);
    lote.set(doc(this.col(uid, 'days'), d.fecha), limpio(d));
    lote.set(this.u(uid), { resumen: limpio(resumen) }, { merge: true });
    await sinBloquear(lote.commit());
  }

  async leerPropios(uid: string) {
    const s = await getDocs(this.col(uid, 'customFoods'));
    return s.docs.map((d) => ({ ...(d.data() as Alimento), id: d.id, propio: true })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async guardarPropio(uid: string, a: Alimento) {
    await sinBloquear(setDoc(doc(this.col(uid, 'customFoods'), a.id), limpio({ ...a, propio: true })));
  }
  async borrarPropio(uid: string, id: string) {
    await sinBloquear(deleteDoc(doc(this.col(uid, 'customFoods'), id)));
  }

  async leerGuardadas(uid: string) {
    const s = await getDocs(this.col(uid, 'savedMeals'));
    return s.docs.map((d) => ({ ...(d.data() as ComidaGuardada), id: d.id })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async guardarGuardada(uid: string, c: ComidaGuardada) {
    await sinBloquear(setDoc(doc(this.col(uid, 'savedMeals'), c.id), limpio(c)));
  }
  async borrarGuardada(uid: string, id: string) {
    await sinBloquear(deleteDoc(doc(this.col(uid, 'savedMeals'), id)));
  }

  // ── Base compartida de productos: productos/{codigo} (el código es la llave) ──
  async leerProducto(codigo: string) {
    const s = await getDoc(doc(this.db, 'productos', codigo));
    return s.exists() ? ({ ...(s.data() as Producto), codigo: s.id }) : null;
  }
  async crearProducto(p: Producto) {
    // En una transacción: si otro lo creó un segundo antes, se devuelve ese y no se pisa
    return runTransaction(this.db, async (t) => {
      const ref = doc(this.db, 'productos', p.codigo);
      const s = await t.get(ref);
      if (s.exists()) return { creado: false, producto: { ...(s.data() as Producto), codigo: s.id } };
      t.set(ref, limpio(p));
      return { creado: true, producto: p };
    });
  }
  async guardarProducto(p: Producto) {
    await setDoc(doc(this.db, 'productos', p.codigo), limpio(p));
  }
  async borrarProducto(codigo: string) {
    await deleteDoc(doc(this.db, 'productos', codigo));
  }
  async buscarProductos(clave: string, max = 8) {
    const s = await getDocs(query(collection(this.db, 'productos'), where('prefijos', 'array-contains', clave), limit(max)));
    return s.docs.map((d) => ({ ...(d.data() as Producto), codigo: d.id }));
  }
  async leerTodosProductos() {
    const s = await getDocs(query(collection(this.db, 'productos'), limit(500)));
    return s.docs.map((d) => ({ ...(d.data() as Producto), codigo: d.id }));
  }
  async contarPendientes() {
    const [r, p] = await Promise.all([
      getCountFromServer(collection(this.db, 'reportes')),
      getCountFromServer(query(collection(this.db, 'productos'), where('verificado', '==', false))),
    ]);
    return { reportes: r.data().count, sinVerificar: p.data().count };
  }
  async leerSinVerificar() {
    const s = await getDocs(query(collection(this.db, 'productos'), where('verificado', '==', false), limit(100)));
    return s.docs.map((d) => ({ ...(d.data() as Producto), codigo: d.id })).sort((a, b) => b.creado - a.creado);
  }
  async reportar(r: Reporte) {
    await setDoc(doc(this.db, 'reportes', r.id), limpio(r));
  }
  async leerReportes() {
    const s = await getDocs(query(collection(this.db, 'reportes'), limit(100)));
    return s.docs.map((d) => ({ ...(d.data() as Reporte), id: d.id })).sort((a, b) => b.fecha - a.fecha);
  }
  async borrarReporte(id: string) {
    await deleteDoc(doc(this.db, 'reportes', id));
  }
  async esCargador(uid: string) {
    try {
      const s = await getDoc(doc(this.db, 'config', 'cargadores'));
      return ((s.data()?.uids as string[] | undefined) ?? []).includes(uid) || (await this.esAdmin(uid));
    } catch {
      return false;
    }
  }
  async leerCargadores() {
    const s = await getDoc(doc(this.db, 'config', 'cargadores'));
    const info = (s.data()?.info ?? {}) as Record<string, Omit<Cargador, 'uid'>>;
    return ((s.data()?.uids as string[] | undefined) ?? []).map((uid) => ({ uid, nombre: info[uid]?.nombre ?? '', email: info[uid]?.email ?? '' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async agregarCargador(email: string) {
    // Solo el admin puede buscar una cuenta por su correo (las reglas lo limitan a 1 resultado)
    const s = await getDocs(query(collection(this.db, 'users'), where('email', '==', email.trim().toLowerCase()), limit(1)));
    if (s.empty) throw Object.assign(new ErrorApp('cargador/no-existe'), { code: 'cargador/no-existe' });
    const d = s.docs[0];
    const c: Cargador = { uid: d.id, nombre: (d.data().nombre as string) || email, email: email.trim().toLowerCase() };
    const ref = doc(this.db, 'config', 'cargadores');
    await runTransaction(this.db, async (t) => {
      const x = await t.get(ref);
      const uids = [...new Set([...((x.data()?.uids as string[]) ?? []), c.uid])];
      const info = { ...((x.data()?.info as object) ?? {}), [c.uid]: { nombre: c.nombre, email: c.email } };
      t.set(ref, { uids, info });
    });
    return c;
  }
  async quitarCargador(uid: string) {
    const ref = doc(this.db, 'config', 'cargadores');
    await runTransaction(this.db, async (t) => {
      const x = await t.get(ref);
      const uids = ((x.data()?.uids as string[]) ?? []).filter((u) => u !== uid);
      const info = { ...((x.data()?.info as Record<string, unknown>) ?? {}) };
      delete info[uid];
      t.set(ref, { uids, info });
    });
  }
  async leerEtiqueta(foto: Blob) {
    const { leerEtiquetaConGemini } = await import('./ia');
    return leerEtiquetaConGemini(this.app, foto);
  }

  async leerCuerpo(uid: string) {
    const s = await getDocs(query(this.col(uid, 'bodyLogs'), orderBy('fecha', 'asc')));
    return s.docs.map((d) => ({ ...(d.data() as RegistroCuerpo), id: d.id }));
  }
  async guardarCuerpo(uid: string, r: RegistroCuerpo) {
    await sinBloquear(setDoc(doc(this.col(uid, 'bodyLogs'), r.id), limpio(r)));
  }
  async borrarCuerpo(uid: string, id: string) {
    await sinBloquear(deleteDoc(doc(this.col(uid, 'bodyLogs'), id)));
  }

  async leerPlanes(uid: string) {
    const s = await getDocs(this.col(uid, 'plans'));
    return s.docs.map((d) => ({ ...(d.data() as Plan), id: d.id })).sort((a, b) => b.creado - a.creado);
  }
  async guardarPlan(uid: string, p: Plan) {
    await sinBloquear(setDoc(doc(this.col(uid, 'plans'), p.id), limpio(p)));
  }
  async borrarPlan(uid: string, id: string) {
    await sinBloquear(deleteDoc(doc(this.col(uid, 'plans'), id)));
  }

  async exportar(uid: string) {
    const leer = async (n: string) => (await getDocs(this.col(uid, n))).docs.map((d) => ({ id: d.id, ...d.data() }));
    const perfil = (await getDoc(this.u(uid))).data();
    return {
      perfil,
      dias: await leer('days'),
      alimentosPropios: await leer('customFoods'),
      comidasGuardadas: await leer('savedMeals'),
      cuerpo: await leer('bodyLogs'),
      planes: await leer('plans'),
      comentarios: await leer('comments'),
      objetivos: await leer('goals'),
      vinculos: await this.leerMisProfesionales(uid),
    };
  }

  // ── Profesionales y clientes ──
  private sinPermiso<T>(p: Promise<T>, siNo: T): Promise<T> {
    return p.catch((e) => { if ((e as { code?: string })?.code === 'permission-denied') return siNo; throw e; });
  }

  async leerPerfilDe(uid: string) {
    const s = await getDoc(this.u(uid));
    return s.exists() ? ({ ...(s.data() as Perfil), uid, resumen: (s.data() as Perfil).resumen ?? { dias: [], cumplidos: [], total: 0 } }) : null;
  }
  async leerProfesional(uid: string) {
    const s = await this.sinPermiso(getDoc(doc(this.db, 'profesionales', uid)), null);
    return s?.exists() ? ({ ...(s.data() as Profesional), uid }) : null;
  }
  async leerMiSolicitud(uid: string) {
    const s = await this.sinPermiso(getDoc(doc(this.db, 'solicitudes', uid)), null);
    return s?.exists() ? ({ ...(s.data() as Solicitud), uid }) : null;
  }
  async enviarSolicitud(x: Solicitud) {
    await setDoc(doc(this.db, 'solicitudes', x.uid), limpio(x));
  }
  async leerSolicitudes() {
    const s = await getDocs(query(collection(this.db, 'solicitudes'), orderBy('fecha', 'desc'), limit(200)));
    return s.docs.map((d) => ({ ...(d.data() as Solicitud), uid: d.id }));
  }
  async aprobarSolicitud(x: Solicitud, codigo: string) {
    const p: Profesional = { uid: x.uid, tipo: x.tipo, nombre: x.nombre, codigo, activo: true, alta: Date.now() };
    const c: Codigo = { codigo, profesionalId: x.uid, tipo: x.tipo, nombre: x.nombre };
    const lote = writeBatch(this.db);
    lote.set(doc(this.db, 'profesionales', x.uid), limpio(p));
    lote.set(doc(this.db, 'codigos', codigo), limpio(c));
    lote.set(doc(this.db, 'solicitudes', x.uid), { estado: 'aprobada' }, { merge: true });
    await lote.commit();
    return p;
  }
  async rechazarSolicitud(uid: string) {
    await setDoc(doc(this.db, 'solicitudes', uid), { estado: 'rechazada' }, { merge: true });
  }
  async leerProfesionales() {
    const s = await getDocs(collection(this.db, 'profesionales'));
    return s.docs.map((d) => ({ ...(d.data() as Profesional), uid: d.id })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async cambiarEstadoProfesional(uid: string, activo: boolean) {
    await setDoc(doc(this.db, 'profesionales', uid), { activo }, { merge: true });
  }
  async vincular(cliente: { uid: string; nombre: string }, codigo: string, tipo: TipoProfesional) {
    const cod = normalizarCodigo(codigo);
    const s = await this.sinPermiso(getDoc(doc(this.db, 'codigos', cod)), null);
    const c = s?.exists() ? (s.data() as Codigo) : null;
    if (!c || c.tipo !== tipo) throw Object.assign(new ErrorApp('pro/codigo'), { code: 'pro/codigo' });
    if (c.profesionalId === cliente.uid) throw Object.assign(new ErrorApp('pro/propio'), { code: 'pro/propio' });
    const v: Vinculo = {
      id: idVinculo(c.profesionalId, cliente.uid), profesionalId: c.profesionalId, clienteId: cliente.uid, tipo,
      nombreProfesional: c.nombre, nombreCliente: cliente.nombre || 'Cliente', codigo: cod, desde: Date.now(), activo: true,
    };
    try {
      await setDoc(doc(this.db, 'vinculos', v.id), limpio(v));
    } catch (e) {
      // Las reglas rechazan si el profesional está dado de baja
      if ((e as { code?: string })?.code === 'permission-denied') throw Object.assign(new ErrorApp('pro/codigo'), { code: 'pro/codigo' });
      throw e;
    }
    return v;
  }
  async leerMisProfesionales(clienteId: string) {
    const s = await getDocs(query(collection(this.db, 'vinculos'), where('clienteId', '==', clienteId), where('activo', '==', true)));
    return s.docs.map((d) => ({ ...(d.data() as Vinculo), id: d.id }));
  }
  async leerClientes(profesionalId: string) {
    const s = await getDocs(query(collection(this.db, 'vinculos'), where('profesionalId', '==', profesionalId), where('activo', '==', true)));
    return s.docs.map((d) => ({ ...(d.data() as Vinculo), id: d.id }));
  }
  async terminarVinculo(id: string) {
    await setDoc(doc(this.db, 'vinculos', id), { activo: false, hasta: Date.now() }, { merge: true });
  }
  async leerComentarios(clienteId: string) {
    const s = await getDocs(query(this.col(clienteId, 'comments'), orderBy('fecha', 'desc'), limit(100)));
    return s.docs.map((d) => ({ ...(d.data() as Comentario), id: d.id }));
  }
  async guardarComentario(clienteId: string, c: Comentario) {
    await sinBloquear(setDoc(doc(this.col(clienteId, 'comments'), c.id), limpio(c)));
  }
  async marcarLeidos(clienteId: string, ids: string[]) {
    if (!ids.length) return;
    const lote = writeBatch(this.db);
    for (const id of ids) lote.set(doc(this.col(clienteId, 'comments'), id), { leido: true }, { merge: true });
    await sinBloquear(lote.commit());
  }
  async leerObjetivos(clienteId: string) {
    const s = await getDocs(this.col(clienteId, 'goals'));
    return s.docs.map((d) => ({ ...(d.data() as Objetivo), id: d.id })).sort((a, b) => a.fecha - b.fecha);
  }
  async guardarObjetivo(clienteId: string, o: Objetivo) {
    await sinBloquear(setDoc(doc(this.col(clienteId, 'goals'), o.id), limpio(o)));
  }
  async borrarObjetivo(clienteId: string, id: string) {
    await sinBloquear(deleteDoc(doc(this.col(clienteId, 'goals'), id)));
  }
}
