import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './ui/contexto';
import { Marco } from './ui/Marco';
import { useBotonAtras } from './ui/atras';
import { Cargando } from './ui/piezas';
import Acceso from './screens/Acceso';

const Conocerte = lazy(() => import('./screens/Conocerte'));
const Hoy = lazy(() => import('./screens/Hoy'));
const Diario = lazy(() => import('./screens/Diario'));
const Agregar = lazy(() => import('./screens/Agregar'));
const Plan = lazy(() => import('./screens/Plan'));
const Receta = lazy(() => import('./screens/Receta'));
const Productos = lazy(() => import('./screens/Productos'));
const Progreso = lazy(() => import('./screens/Progreso'));
const Perfil = lazy(() => import('./screens/Perfil'));

/** Precarga las pantallas principales para que el cambio de pestaña sea instantáneo */
function precargar() {
  for (const f of [() => import('./screens/Hoy'), () => import('./screens/Diario'), () => import('./screens/Agregar'),
    () => import('./screens/Plan'), () => import('./screens/Progreso'), () => import('./screens/Perfil')]) f().catch(() => undefined);
}

export default function App() {
  const { usuario, perfil, cargando, mensaje } = useApp();
  const loc = useLocation();
  useBotonAtras();
  useEffect(() => { if (usuario) precargar(); }, [usuario]);

  if (cargando) return <div className="mx-auto max-w-[480px] px-[17px]"><Cargando forma="pagina" /></div>;
  if (!usuario || !perfil) return <><Acceso />{mensaje && <Aviso texto={mensaje} />}</>;
  // La primera vez: bienvenida para calcular la meta
  if (!perfil.conocido && loc.pathname !== '/conocerte') return <Navigate to="/conocerte" replace />;

  return (
    <>
      <Suspense fallback={<div className="mx-auto max-w-[480px] px-[17px]"><Cargando forma="pagina" /></div>}>
        <Routes>
          <Route path="/conocerte" element={<Conocerte />} />
          <Route element={<Marco />}>
            <Route path="/" element={<Hoy />} />
            <Route path="/diario" element={<Diario />} />
            <Route path="/agregar" element={<Agregar />} />
            <Route path="/receta" element={<Receta />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/progreso" element={<Progreso />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {mensaje && <Aviso texto={mensaje} />}
    </>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div role="status" className="entrar fixed inset-x-0 bottom-[96px] z-[70] mx-auto w-fit max-w-[90vw] rounded-full border border-gold2 bg-sf px-5 py-2.5 text-[15px] font-semibold lg:bottom-8"
      style={{ boxShadow: 'var(--sombra)' }}>
      {texto}
    </div>
  );
}
