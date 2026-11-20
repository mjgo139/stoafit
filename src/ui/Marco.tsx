import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useEffect } from 'react';
import { useSesion } from './contexto';
import { Icono } from './Icono';
import { Laurel } from './familia';
import { iniciales } from '../pro/logica';
import { useRecordatorio } from './recordatorio';

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
  const { perfil, usuario } = useSesion();
  const loc = useLocation();
  const ir = useNavegarSuave();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useRecordatorio(perfil);
  const activa = (a: string) => (a === '/' ? loc.pathname === '/' : loc.pathname.startsWith(a)) || (a === '/diario' && (loc.pathname === '/agregar' || loc.pathname === '/receta')) || (a === '/perfil' && loc.pathname === '/productos');

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lateral-fija sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-black/20 px-4 py-7 text-[#e9e2d3] lg:flex" style={{ background: 'var(--lateral)', ['--gold' as string]: '#f2c55c' }}>
        <div className="flex items-center gap-2.5 px-2">
          <Laurel size={34} />
          <span className="marca text-[22px] text-[#f2c55c]">StoaFit</span>
        </div>
        <nav className="mt-9 flex flex-col gap-1" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <NavLink key={p.a} to={p.a} onClick={(e) => { e.preventDefault(); ir(p.a); }}
              className={`flex h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-semibold transition-colors ${activa(p.a) ? 'bg-[#2a2113] text-[#f2c55c]' : 'text-[#c9bda7] hover:bg-white/[.04] hover:text-[#f7f1e7]'}`}>
              <Icono n={p.i} size={22} />{p.t}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-2 pt-5" data-testid="persona-lateral">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#a66c16] font-display text-[15px] font-semibold text-[#f2c55c]">
            {iniciales(perfil.nombre || 'Invitado')}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-[#f7f1e7]">{perfil.nombre || 'Invitado'}</span>
            <span className="block truncate text-[12px] text-[#9d927d]">{usuario.invitado ? 'Modo invitado' : usuario.email}</span>
          </span>
        </div>
      </aside>

      <main className="pagina pb-seguro mx-auto w-full max-w-[480px] px-[17px] lg:max-w-[1480px] lg:px-12" key={loc.pathname}>
        <Outlet />
      </main>

      <nav aria-label="Pestañas" className="pestanas-fijas fixed inset-x-0 bottom-0 z-40 border-t border-ln bg-nav/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[480px] justify-around">
          {PESTANAS.map((p) => (
            <NavLink key={p.a} to={p.a} onClick={(e) => { e.preventDefault(); ir(p.a); }}
              className={`flex h-[64px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${activa(p.a) ? 'oro' : 'text-mu2'}`}>
              <Icono n={p.i} size={23} />{p.t}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
