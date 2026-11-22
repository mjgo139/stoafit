import { useState } from 'react';
import { mensajeError } from '../data/repo';
import { useApp } from '../ui/contexto';
import { DescargarApp, Emblema, FormularioAcceso, PantallaAcceso, PortadaAcceso, type VistaAcceso } from '../ui/familia';
import portada from '../../familia/portada-filosofo.webp';
import { Icono } from '../../familia/iconos';

/** Portada y acceso (piezas de la familia): ingresar, crear cuenta, olvidé mi contraseña, Google e invitado */
export default function Acceso() {
  const { repo } = useApp();
  const [vista, setVista] = useState<VistaAcceso | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function invitado() {
    setError(''); setEnviando(true);
    try { await repo.ingresarComoInvitado(); } catch (e) { setError(mensajeError(e)); } finally { setEnviando(false); }
  }

  if (!vista) {
    return (
      <PortadaAcceso imagen={portada} emblema={<Emblema size={92} />} nombre="StoaFit" lema="Templanza · Medida · Constancia"
        frase="Registrá lo que comés, cuidá tu medida y sostené la constancia, un día a la vez.">
        <button className="btn" onClick={() => setVista('ingresar')}><Icono n="corona" size={20} />Iniciar sesión</button>
        <button className="btn-sec" onClick={() => setVista('registrar')}>Crear cuenta</button>
        <button className="portada-invitado" disabled={enviando} onClick={invitado}>Continuar como invitado</button>
        <DescargarApp apk="https://github.com/mjgo139/stoafit/releases/download/apk-ultima/stoafit.apk" />
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
    <PantallaAcceso emblema={<Emblema size={72} />} nombre="StoaFit" alVolver={() => setVista(null)}>
      <FormularioAcceso vista={vista} alCambiarVista={setVista} mensajeError={mensajeError}
        acciones={{
          ingresar: (email, clave) => repo.ingresar(email, clave),
          registrar: (nombre, email, clave) => repo.registrar(nombre, email, clave),
          recuperar: (email) => repo.recuperarClave(email),
          google: repo.permiteGoogle ? () => repo.ingresarConGoogle() : undefined,
        }} />
    </PantallaAcceso>
  );
}
