import { useState, type FormEvent } from 'react';
import { mensajeError } from '../data/repo';
import { useApp } from '../ui/contexto';
import { Emblema, PortadaAcceso } from '../ui/familia';
import portada from '../../familia/portada-filosofo.webp';
import { Icono } from '../../familia/iconos';

type Vista = 'portada' | 'ingresar' | 'registrar' | 'recuperar';

/** Portada y acceso: ingresar, crear cuenta, olvidé mi contraseña, Google e invitado */
export default function Acceso() {
  const { repo, aviso } = useApp();
  const [vista, setVista] = useState<Vista>('portada');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function hacer(f: () => Promise<void>) {
    setError('');
    setEnviando(true);
    try { await f(); } catch (e) { setError(mensajeError(e)); } finally { setEnviando(false); }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (vista === 'ingresar') hacer(() => repo.ingresar(email, clave));
    if (vista === 'registrar') hacer(() => repo.registrar(nombre.trim(), email, clave));
    if (vista === 'recuperar') hacer(async () => { await repo.recuperarClave(email); aviso('Te mandamos un correo para cambiar la contraseña'); setVista('ingresar'); });
  }

  const ir = (v: Vista) => { setError(''); setVista(v); };

  if (vista === 'portada') {
    return (
      <PortadaAcceso imagen={portada} emblema={<Emblema size={92} />} nombre="StoaFit" lema="Templanza · Medida · Constancia"
        frase="Registrá lo que comés, cuidá tu medida y sostené la constancia, un día a la vez.">
        <button className="btn" onClick={() => ir('ingresar')}><Icono n="corona" size={20} />Iniciar sesión</button>
        <button className="btn-sec" onClick={() => ir('registrar')}>Crear cuenta</button>
        <button className="portada-invitado" disabled={enviando} onClick={() => hacer(() => repo.ingresarComoInvitado())}>Continuar como invitado</button>
        {error && <p role="alert" className="text-center text-[15px] text-miss">{error}</p>}
          {repo.modo === 'prueba' && (
            <p className="mt-4 rounded-[12px] border border-dashed border-ln3 p-3 text-center text-[13.5px] text-mu" data-testid="aviso-prueba">
              <b>Modo prueba</b>: los datos son inventados y no se guardan.<br />Cuenta de ejemplo: <b>sofia@ejemplo.com</b> / <b>stoafit</b>
            </p>
          )}
      </PortadaAcceso>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col px-6 pb-10 pt-[9vh]">
      <div className="entrar text-center">
        <div className="flex justify-center"><Emblema size={72} /></div>
        <h1 className="marca mt-2 text-[36px] leading-none oro">StoaFit</h1>
      </div>
      {(
        <form className="entrar mt-10 flex flex-col gap-4" onSubmit={enviar}>
          <h2 className="font-display text-[26px] font-semibold">
            {vista === 'ingresar' ? 'Bienvenido de nuevo' : vista === 'registrar' ? 'Creá tu cuenta' : 'Recuperar contraseña'}
          </h2>
          {vista === 'registrar' && (
            <label className="block"><span className="etiqueta">Nombre</span>
              <input className="campo mt-2" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required />
            </label>
          )}
          <label className="block"><span className="etiqueta">Correo</span>
            <input className="campo mt-2" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {vista !== 'recuperar' && (
            <label className="block"><span className="etiqueta">Contraseña</span>
              <span className="relative mt-2 block">
                <input className="campo pr-12" type={ver ? 'text' : 'password'} autoComplete={vista === 'registrar' ? 'new-password' : 'current-password'}
                  value={clave} onChange={(e) => setClave(e.target.value)} minLength={6} required aria-label="Contraseña" />
                <button type="button" className="toque absolute right-0 top-0 flex items-center justify-center text-mu" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setVer((v) => !v)}><Icono n={ver ? 'ojo-no' : 'ojo'} size={20} /></button>
              </span>
            </label>
          )}
          {error && <p role="alert" className="text-[15px] text-miss">{error}</p>}
          <button className="btn mt-1 w-full" disabled={enviando}>
            {enviando ? 'Un momento…' : vista === 'ingresar' ? 'Entrar' : vista === 'registrar' ? 'Crear cuenta' : 'Enviar correo'}
          </button>
          {vista !== 'recuperar' && repo.permiteGoogle && (
            <button type="button" className="btn-sec h-[52px] w-full" disabled={enviando} onClick={() => hacer(() => repo.ingresarConGoogle())}>
              <Icono n="google" size={20} />Continuar con Google
            </button>
          )}
          {vista === 'ingresar' && <button type="button" className="p-1 text-[15px] font-semibold oro" onClick={() => ir('recuperar')}>Olvidé mi contraseña</button>}
          {vista === 'ingresar' && <button type="button" className="p-1 text-[15px] text-mu" onClick={() => ir('registrar')}>¿No tenés cuenta? <b className="oro">Creá una</b></button>}
          {vista === 'registrar' && <button type="button" className="p-1 text-[15px] text-mu" onClick={() => ir('ingresar')}>¿Ya tenés cuenta? <b className="oro">Iniciá sesión</b></button>}
          <button type="button" className="mt-2 flex items-center justify-center gap-1 p-1 text-[15px] text-mu" onClick={() => ir('portada')}>
            <Icono n="atras" size={16} />Volver
          </button>
        </form>
      )}
    </div>
  );
}
