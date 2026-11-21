import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useEffect, type MouseEvent } from 'react';
import { useSesion } from './contexto';
import { AvisoPrueba, Avatar, BarraLateral, Pestanas } from '../../familia/react';
import { Emblema } from './familia';
import { useRecordatorio } from './recordatorio';
import { useIndiceNombres } from './usarProductos';

export const PESTANAS = [
  { a: '/', t: 'Hoy', i: 'hoy' },
  { a: '/diario', t: 'Diario', i: 'diario' },
  { a: '/plan', t: 'Plan', i: 'plan' },
  { a: '/progreso', t: 'Progreso', i: 'progreso' },
  { a: '/perfil', t: 'Perfil', i: 'perfil' },
] as const;

/** Cambia de pantalla con un fundido suave si el navegador lo permite */
export function useNavegarSuave() {
  const nav = useNavigate();
  return (a: string) => {
    const d = document as Document & { startViewTransition?: (f: () => void) => unknown };
    if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(() => flushSync(() => nav(a)));
    else nav(a);
  };
}

/** Estructura de la app: barra lateral en PC (248 px) y pestañas abajo en el celular */
export function Marco() {
  const { perfil, usuario, repo } = useSesion();
  useIndiceNombres();
  const loc = useLocation();
  const ir = useNavegarSuave();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useRecordatorio(perfil);
  const activa = (a: string) => (a === '/' ? loc.pathname === '/' : loc.pathname.startsWith(a)) || (a === '/diario' && (loc.pathname === '/agregar' || loc.pathname === '/receta')) || (a === '/perfil' && loc.pathname === '/productos');

  const secciones = PESTANAS.map((p) => ({ href: p.a, icono: p.i, texto: p.t, activa: activa(p.a) }));
  const alTocar = (e: MouseEvent<HTMLAnchorElement>, href: string) => { e.preventDefault(); ir(href); };
  const nombre = perfil.nombre || 'Invitado';

  return (
    <div className="con-lateral min-h-screen">
      {/* Barra lateral (PC) y pestañas (celular): piezas comunes de la familia estoica */}
      <BarraLateral emblema={<Emblema size={40} />} nombreApp="StoaFit" secciones={secciones} ir={alTocar}
        persona={{ avatar: <Avatar foto={perfil?.foto} nombre={nombre} />, nombre, detalle: usuario.invitado ? 'Modo invitado' : usuario.email ?? '', href: '/perfil' }}
        nota={repo.modo === 'prueba' ? 'Modo prueba' : 'Nutrición · Medida · Constancia'} />

      <main className="pagina pb-seguro mx-auto w-full max-w-[480px] px-[17px] lg:max-w-[1480px] lg:px-12" key={loc.pathname}>
        {repo.modo === 'prueba' && <AvisoPrueba />}
        <Outlet />
      </main>

      <Pestanas secciones={secciones} ir={alTocar} />
    </div>
  );
}
