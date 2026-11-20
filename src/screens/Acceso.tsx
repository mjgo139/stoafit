import { useState, type FormEvent } from 'react';
import { mensajeError } from '../data/repo';
import { fraseDelDia } from '../lib/frases';
import { useApp } from '../ui/contexto';
import { Laurel } from '../ui/familia';
import { Icono } from '../ui/Icono';

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
  const frase = fraseDelDia();

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

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col px-6 pb-10 pt-[9vh]">
      <div className="entrar text-center">
        <Laurel size={84} className="mx-auto" />
        <h1 className="marca mt-4 text-[44px] leading-none oro">StoaFit</h1>
        <p className="etiqueta mt-3 oro">Templanza · Medida · Constancia</p>
      </div>

      {vista === 'portada' ? (
        <div className="entrar mt-10 flex flex-col gap-3">
          <p className="mb-4 text-center font-display text-[18px] italic leading-snug text-tx2">“{frase.texto}”<span className="mt-1 block text-[13px] not-italic text-mu">— {frase.autor}</span></p>
          <button className="btn w-full" onClick={() => ir('registrar')}>Crear cuenta</button>
          <button className="btn-sec h-[52px] w-full" onClick={() => ir('ingresar')}>Iniciar sesión</button>
          {repo.permiteGoogle && (
            <button className="btn-sec h-[52px] w-full" disabled={enviando} onClick={() => hacer(() => repo.ingresarConGoogle())}>
              <Icono n="google" size={20} />Continuar con Google
            </button>
          )}
          <button className="mt-2 p-2 text-[14px] font-semibold oro" disabled={enviando} onClick={() => hacer(() => repo.ingresarComoInvitado())}>
            Continuar como invitado
          </button>
          {error && <p role="alert" className="text-center text-[14px] text-miss">{error}</p>}
          {repo.modo === 'prueba' && (
            <p className="mt-4 rounded-[12px] border border-dashed border-ln3 p-3 text-center text-[13px] text-mu" data-testid="aviso-prueba">
              <b>Modo prueba</b>: los datos son inventados y no se guardan.<br />Cuenta de ejemplo: <b>sofia@ejemplo.com</b> / <b>stoafit</b>
            </p>
          )}
        </div>
      ) : (
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
          {error && <p role="alert" className="text-[14px] text-miss">{error}</p>}
          <button className="btn mt-1 w-full" disabled={enviando}>
            {enviando ? 'Un momento…' : vista === 'ingresar' ? 'Entrar' : vista === 'registrar' ? 'Crear cuenta' : 'Enviar correo'}
          </button>
          {vista === 'ingresar' && <button type="button" className="p-1 text-[14px] font-semibold oro" onClick={() => ir('recuperar')}>Olvidé mi contraseña</button>}
          {vista === 'ingresar' && <button type="button" className="p-1 text-[14px] text-mu" onClick={() => ir('registrar')}>¿No tenés cuenta? <b className="oro">Creá una</b></button>}
          {vista === 'registrar' && <button type="button" className="p-1 text-[14px] text-mu" onClick={() => ir('ingresar')}>¿Ya tenés cuenta? <b className="oro">Iniciá sesión</b></button>}
          <button type="button" className="mt-2 flex items-center justify-center gap-1 p-1 text-[14px] text-mu" onClick={() => ir('portada')}>
            <Icono n="atras" size={16} />Volver
          </button>
        </form>
      )}
    </div>
  );
}
