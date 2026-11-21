import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeError } from '../data/repo';
import { edad, fechaCorta, formatoNumero } from '../lib/logica';
import { NOVEDADES } from '../lib/novedades';
import { ACTIVIDADES, OBJETIVOS, metasDe } from '../lib/nutricion';
import type { Acento, Tema, Unidad } from '../lib/tipos';
import { COMMIT, FECHA_ARMADO, VERSION } from '../ui/actualizar';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina, Grupo } from '../ui/familia';
import { Icono } from '../../familia/iconos';
import { Hoja, Selector } from '../ui/piezas';
import { iniciales } from '../pro/logica';

const ACENTOS: { v: Acento; t: string; c: string }[] = [
  { v: 'oliva', t: 'Oliva', c: 'var(--muestra-oliva)' },
  { v: 'terracota', t: 'Terracota', c: 'var(--muestra-terracota)' },
  { v: 'bronce', t: 'Bronce', c: 'var(--muestra-bronce)' },
];

/** Perfil: datos, apariencia, unidades, recordatorios, exportar, borrar cuenta y ajustes (admin) */
export default function Perfil() {
  const { repo, usuario, perfil, admin, cargador, cambiarPerfil, aviso } = useSesion();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [borrar, setBorrar] = useState(false);
  const [cuenta, setCuenta] = useState(false);
  const [error, setError] = useState('');
  const metas = metasDe(perfil);
  const rec = perfil.recordatorio;

  async function exportar() {
    const datos = await repo.exportar(usuario.uid);
    const b = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `stoafit-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    aviso('Tus datos se descargaron');
  }

  async function borrarCuenta() {
    setError('');
    try { await repo.borrarCuenta(); } catch (e) { setError(mensajeError(e)); }
  }

  async function recordatorio(activo: boolean, hora = rec.hora) {
    if (activo && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* sin permiso */ }
    }
    await cambiarPerfil({ recordatorio: { ...rec, activo, hora } });
  }

  const fila = 'fila w-full text-left';
  return (
    <div className="pt-6 lg:pt-10">
      <CabeceraPagina etiqueta="Perfil" titulo={perfil.nombre || 'Invitado'} linea={usuario.invitado ? 'Estás como invitado.' : usuario.email} />

      {usuario.invitado && (
        <div className="tarjeta mt-5 flex items-center gap-3 border-gold2" data-testid="aviso-invitado">
          <Icono n="escudo" className="shrink-0 oro" />
          <span className="flex-1 text-[15px]"><b>Creá tu cuenta</b> para no perder lo que registraste y usarla en otros dispositivos.</span>
          <button className="btn h-10 shrink-0 px-4 text-[12.5px]" onClick={() => setCuenta(true)}>Crear</button>
        </div>
      )}

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-7">
          <section>
            <Grupo n={1} className="mb-3">Vos</Grupo>
            <div className="tarjeta">
              {/* La etiqueta arriba de todo: así la inicial y el campo quedan a la misma altura */}
              <label htmlFor="perfil-nombre" className="etiqueta">Nombre</label>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold2 font-display text-[20px] font-semibold oro" aria-hidden>{iniciales(perfil.nombre || 'Invitado')}</span>
                <input id="perfil-nombre" className="campo min-w-0 flex-1" value={nombre} maxLength={80} aria-label="Nombre" onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => nombre.trim() && nombre.trim() !== perfil.nombre && cambiarPerfil({ nombre: nombre.trim() }).then(() => aviso('Nombre guardado'))} />
              </div>
              <Link to="/conocerte?editar=1" className={`${fila} mt-3 border-t border-ln2 border-b-0`}>
                <Icono n="cuerpo" className="oro" />
                <span className="flex-1"><b>Mis datos y meta</b>
                  <span className="block text-[12.5px] text-mu">
                    {perfil.nacimiento ? `${edad(perfil.nacimiento)} años · ` : ''}{perfil.altura ? `${perfil.altura} cm · ` : ''}{ACTIVIDADES.find((a) => a.v === perfil.actividad)?.t ?? '—'} · {OBJETIVOS.find((o) => o.v === perfil.objetivo)?.t ?? '—'} · {formatoNumero(metas.kcal)} kcal
                  </span></span>
                <Icono n="der" size={20} className="text-mu" />
              </Link>
            </div>
          </section>

          <section>
            <Grupo n={2} className="mb-3">Apariencia</Grupo>
            <div className="tarjeta flex flex-col gap-4">
              <div><div className="etiqueta mb-2">Tema</div>
                <Selector<Tema> nombre="Tema" valor={perfil.tema} alCambiar={(t) => cambiarPerfil({ tema: t })}
                  opciones={[{ v: 'claro', t: 'Mármol' }, { v: 'oscuro', t: 'Oscuro' }, { v: 'sistema', t: 'Sistema' }]} />
              </div>
              <div><div className="etiqueta mb-2">Color de acento</div>
                <div role="radiogroup" aria-label="Color de acento" className="flex gap-[5px]">
                  {ACENTOS.map((a) => (
                    <button key={a.v} role="radio" aria-checked={(perfil.acento ?? 'oliva') === a.v} onClick={() => cambiarPerfil({ acento: a.v })}
                      className={`chip h-10 flex-1 gap-2 ${(perfil.acento ?? 'oliva') === a.v ? 'chip-on' : ''}`}>
                      <span className="h-3.5 w-3.5 rounded-full border border-ln" style={{ background: a.c }} />{a.t}
                    </button>
                  ))}
                </div>
              </div>
              <div><div className="etiqueta mb-2">Unidades de peso</div>
                <Selector<Unidad> nombre="Unidades" valor={perfil.unidad} alCambiar={(u) => cambiarPerfil({ unidad: u })}
                  opciones={[{ v: 'kg', t: 'Kilos (kg)' }, { v: 'lb', t: 'Libras (lb)' }]} />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-7">
          <section>
            <Grupo n={3} className="mb-3">Recordatorios</Grupo>
            <div className="tarjeta">
              <label className="flex items-center gap-3">
                <Icono n="campana" className="oro" />
                <span className="flex-1"><b>Recordarme registrar</b><span className="block text-[12.5px] text-mu">Si a esa hora todavía no cargaste nada del día.</span></span>
                <input type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={rec.activo} onChange={(e) => recordatorio(e.target.checked)} aria-label="Recordarme registrar" />
              </label>
              {rec.activo && (
                <label className="mt-3 flex items-center justify-between border-t border-ln2 pt-3"><span className="etiqueta">Hora</span>
                  <input type="time" className="campo w-[130px]" value={rec.hora} onChange={(e) => recordatorio(true, e.target.value)} aria-label="Hora del recordatorio" />
                </label>
              )}
              <p className="mt-2 text-[12.5px] text-mu2">Por ahora el aviso llega con la app abierta o instalada en el celular.</p>
            </div>
          </section>

          <section>
            <Grupo n={4} className="mb-3">Tu cuenta</Grupo>
            <div className="tarjeta py-1">
              <button className={fila} onClick={exportar}><Icono n="descargar" className="oro" /><span className="flex-1"><b>Exportar mis datos</b><span className="block text-[12.5px] text-mu">Un archivo con todo lo que registraste</span></span></button>
              <button className={fila} onClick={() => repo.salir()}><Icono n="salir" className="text-mu" /><span className="flex-1"><b>Salir</b></span></button>
              <button className={`${fila} border-0 text-miss`} onClick={() => setBorrar(true)}><Icono n="basura" /><span className="flex-1"><b>Borrar mi cuenta</b></span></button>
            </div>
          </section>

          {cargador && (
            <section>
              <Grupo n={5} className="mb-3">Base compartida</Grupo>
              <Link to="/productos" className="tarjeta flex items-center gap-3" data-testid="ir-productos">
                <Icono n="barras" className="oro" />
                <span className="flex-1"><b>Productos</b><span className="block text-[12.5px] text-mu">Reportes, productos sin verificar{admin ? ' y cargadores' : ''}</span></span>
                <Icono n="der" size={20} className="text-mu" />
              </Link>
            </section>
          )}

          {admin && (
            <section>
              <Grupo n={6} className="mb-3">Ajustes</Grupo>
              <div className="tarjeta" data-testid="version">
                <div className="flex items-baseline justify-between"><span className="etiqueta">Versión</span><span className="num text-[20px] oro">{VERSION}</span></div>
                <div className="mt-1 text-[13.5px] text-mu">Armada el {fechaCorta(Date.parse(FECHA_ARMADO))} · commit <code>{COMMIT}</code> · {repo.modo === 'prueba' ? 'modo prueba' : 'Firebase'}</div>
                <div className="etiqueta mt-4">Novedades</div>
                <ul className="mt-2 flex flex-col gap-3">
                  {NOVEDADES.map((n) => (
                    <li key={n.version}><b className="oro">v{n.version}</b> <span className="text-[12.5px] text-mu">· {fechaCorta(n.fecha)}</span>
                      <ul className="mt-1 list-disc pl-5 text-[13.5px] text-tx2">{n.cambios.map((c) => <li key={c}>{c}</li>)}</ul>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      <Hoja abierta={borrar} alCerrar={() => setBorrar(false)} etiqueta="Confirmar" titulo="¿Borrar tu cuenta?">
        <p className="text-mu">Se borra todo: tu diario, tus medidas, tus planes y tu cuenta. No se puede deshacer. Si querés, primero exportá tus datos.</p>
        {error && <p className="mt-3 text-[15px] text-miss" role="alert">{error}</p>}
        <div className="mt-5 flex flex-col gap-3">
          <button className="btn btn-peligro" onClick={borrarCuenta}>Sí, borrar todo</button>
          <button className="btn-sec" onClick={() => setBorrar(false)}>Cancelar</button>
        </div>
      </Hoja>

      <Hoja abierta={cuenta} alCerrar={() => setCuenta(false)} etiqueta="Invitado" titulo="Crear tu cuenta">
        <CrearCuenta alListo={() => { setCuenta(false); aviso('¡Listo! Tu cuenta quedó creada'); }} />
      </Hoja>
    </div>
  );
}

function CrearCuenta({ alListo }: { alListo: () => void }) {
  const { repo, perfil } = useSesion();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  async function crear() {
    setError('');
    try { await repo.registrar(nombre.trim(), email, clave); alListo(); } catch (e) { setError(mensajeError(e)); }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-mu">Todo lo que registraste queda en tu cuenta nueva.</p>
      <label className="block"><span className="etiqueta">Nombre</span><input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre de la cuenta" /></label>
      <label className="block"><span className="etiqueta">Correo</span><input className="campo mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo de la cuenta" /></label>
      <label className="block"><span className="etiqueta">Contraseña</span><input className="campo mt-1.5" type="password" value={clave} onChange={(e) => setClave(e.target.value)} aria-label="Contraseña nueva" minLength={6} /></label>
      {error && <p className="text-[15px] text-miss" role="alert">{error}</p>}
      <button className="btn w-full" onClick={crear} disabled={!email || clave.length < 6}>Crear cuenta</button>
      {repo.permiteGoogle && <button className="btn-sec" onClick={() => repo.ingresarConGoogle().then(alListo).catch((e) => setError(mensajeError(e)))}><Icono n="google" size={20} />Usar mi cuenta de Google</button>}
    </div>
  );
}
