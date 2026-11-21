import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Repo, Usuario } from '../data/repo';
import type { Acento, Perfil, Tema } from '../lib/tipos';
import type { Profesional } from '../pro/tipos';

interface Ctx {
  repo: Repo;
  usuario: Usuario | null;
  perfil: Perfil | null;
  admin: boolean;
  /** Puede leer etiquetas con foto y verificar productos de la base compartida (el admin también) */
  cargador: boolean;
  /** Si es profesional activo (entrenador, nutricionista…) */
  profesional: Profesional | null;
  recargarProfesional: () => Promise<void>;
  cargando: boolean;
  cambiarPerfil: (c: Partial<Perfil>) => Promise<void>;
  /** Cambia el perfil en pantalla sin guardar (cuando otro método ya lo guarda) */
  cambiarPerfilLocal: (c: Partial<Perfil>) => void;
  recargarPerfil: () => Promise<void>;
  aviso: (texto: string) => void;
  mensaje: string | null;
}

const C = createContext<Ctx | null>(null);

export function aplicarTema(t: Tema) {
  try { localStorage.setItem('stoafit-tema', t); } catch { /* sin almacenamiento */ }
  const oscuro = t === 'oscuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  // El color de la barra del sistema sale del fondo de la familia (--bg del modo elegido)
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (fondo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo);
}

/** Color propio de StoaFit (oliva, terracota o bronce) */
export function aplicarAcento(a: Acento = 'oliva') {
  try { localStorage.setItem('stoafit-acento', a); } catch { /* sin almacenamiento */ }
  document.documentElement.dataset.acento = a;
}

export function ProveedorApp({ repo, children }: { repo: Repo; children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [admin, setAdmin] = useState(false);
  const [cargador, setCargador] = useState(false);
  const [profesional, setProfesional] = useState<Profesional | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const previo = useRef<Usuario | null>(null);
  useEffect(() => repo.escucharSesion(async (u) => {
    const antes = previo.current;
    previo.current = u;
    setUsuario(u);
    if (!u) {
      setPerfil(null);
      setAdmin(false);
      setCargador(false);
      setProfesional(null);
      setCargando(false);
      return;
    }
    // Renovación del token sin cambios: no hace falta volver a leer
    if (antes && antes.uid === u.uid && antes.invitado === u.invitado) return;
    const mismo = antes?.uid === u.uid;
    if (!mismo) setCargando(true);
    try {
      const [p, a, pro, car] = await Promise.all([repo.leerPerfil(u), repo.esAdmin(u.uid), repo.leerProfesional(u.uid).catch(() => null), repo.esCargador(u.uid).catch(() => false)]);
      setPerfil(p);
      setAdmin(a);
      setCargador(car || a);
      setProfesional(pro?.activo ? pro : null);
      aplicarTema(p.tema);
      aplicarAcento(p.acento);
    } finally {
      setCargando(false);
    }
  }), [repo]);

  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)');
    const f = () => perfil?.tema === 'sistema' && aplicarTema('sistema');
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [perfil?.tema]);

  const cambiarPerfil = useCallback(async (c: Partial<Perfil>) => {
    if (!usuario) return;
    setPerfil((p) => (p ? { ...p, ...c } : p));
    if (c.tema) aplicarTema(c.tema);
    if (c.acento) aplicarAcento(c.acento);
    await repo.guardarPerfil(usuario.uid, c);
  }, [repo, usuario]);

  const cambiarPerfilLocal = useCallback((c: Partial<Perfil>) => { setPerfil((p) => (p ? { ...p, ...c } : p)); }, []);

  const recargarPerfil = useCallback(async () => {
    if (usuario) setPerfil(await repo.leerPerfil(usuario));
  }, [repo, usuario]);

  const recargarProfesional = useCallback(async () => {
    if (!usuario) return;
    const pro = await repo.leerProfesional(usuario.uid).catch(() => null);
    setProfesional(pro?.activo ? pro : null);
  }, [repo, usuario]);

  // Si el admin te marca como admin o cargador mientras la app está abierta, se nota al volver a ella
  // (2 lecturas como mucho cada 5 minutos)
  useEffect(() => {
    if (!usuario || usuario.invitado) return;
    let ultima = Date.now();
    const revisar = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 5 * 60_000) return;
      ultima = Date.now();
      const [a, car] = await Promise.all([repo.esAdmin(usuario.uid), repo.esCargador(usuario.uid).catch(() => false)]);
      setAdmin(a);
      setCargador(car || a);
    };
    document.addEventListener('visibilitychange', revisar);
    return () => document.removeEventListener('visibilitychange', revisar);
  }, [repo, usuario]);

  const aviso = useCallback((t: string) => {
    setMensaje(t);
    window.setTimeout(() => setMensaje((m) => (m === t ? null : m)), 2600);
  }, []);

  const v = useMemo(() => ({ repo, usuario, perfil, admin, cargador, profesional, recargarProfesional, cargando, cambiarPerfil, cambiarPerfilLocal, recargarPerfil, aviso, mensaje }),
    [repo, usuario, perfil, admin, cargador, profesional, recargarProfesional, cargando, cambiarPerfil, cambiarPerfilLocal, recargarPerfil, aviso, mensaje]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('Falta ProveedorApp');
  return c;
}

/** Para pantallas que solo existen con sesión iniciada */
export function useSesion() {
  const c = useApp();
  if (!c.usuario || !c.perfil) throw new Error('Sin sesión');
  return { ...c, usuario: c.usuario, perfil: c.perfil };
}
