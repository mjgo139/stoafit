import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { claveDia, edad, formatoNumero } from '../lib/logica';
import { ACTIVIDADES, OBJETIVOS, calcularMetas, imc } from '../lib/nutricion';
import type { Actividad, Genero, ObjetivoPeso } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { Laurel } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Regla } from '../ui/Regla';

const PASOS = ['Vos', 'Nacimiento', 'Altura', 'Peso', 'Actividad', 'Objetivo', 'Tu medida'] as const;

/** Bienvenida: datos para calcular la meta diaria (Mifflin-St Jeor). También se edita desde Perfil. */
export default function Conocerte() {
  const { repo, usuario, perfil, cambiarPerfil, aviso } = useSesion();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editar = params.get('editar') === '1';
  const [paso, setPaso] = useState(0);
  // El nombre ya lo dio al crear la cuenta (o viene de Google): no se vuelve a pedir
  // (Un invitado no dio su nombre: se le pide.)
  const nombreDado = usuario.invitado ? '' : perfil.nombre || usuario.nombre || '';
  const [nombre, setNombre] = useState(nombreDado || (perfil.nombre !== 'Invitado' ? perfil.nombre : ''));
  const [cambiarNombre, setCambiarNombre] = useState(!nombreDado);
  useEffect(() => {
    const conocido = nombreDado;
    if (conocido && !nombre) { setNombre(conocido); setCambiarNombre(false); }
  }, [perfil.nombre, usuario.nombre]); // eslint-disable-line react-hooks/exhaustive-deps
  const [genero, setGenero] = useState<Genero | undefined>(perfil.genero);
  const [nacimiento, setNacimiento] = useState(perfil.nacimiento ?? '1995-01-01');
  const [altura, setAltura] = useState(perfil.altura ?? 165);
  const [peso, setPeso] = useState(68);
  const [actividad, setActividad] = useState<Actividad>(perfil.actividad ?? 'ligero');
  const [objetivo, setObjetivo] = useState<ObjetivoPeso>(perfil.objetivo ?? 'mantener');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    repo.leerCuerpo(usuario.uid).then((c) => {
      const ult = [...c].reverse().find((r) => r.peso);
      if (ult?.peso) setPeso(ult.peso);
    }).catch(() => undefined);
  }, [repo, usuario.uid]);

  const anios = edad(nacimiento);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(nacimiento) && anios >= 12 && anios <= 100;
  const puede = [Boolean(nombre.trim() && genero), fechaValida, true, true, true, true, true][paso];
  const metas = genero ? calcularMetas({ genero, edad: anios, peso, altura, actividad, objetivo }) : null;

  async function terminar() {
    if (!genero || !metas) return;
    setGuardando(true);
    try {
      const hoy = claveDia();
      await repo.guardarCuerpo(usuario.uid, { id: hoy, fecha: Date.now(), peso });
      await cambiarPerfil({ nombre: nombre.trim(), genero, nacimiento, altura, actividad, objetivo, metas, metasManual: false, conocido: true });
      aviso(editar ? 'Tu meta quedó actualizada' : `¡Bienvenido${genero === 'mujer' ? 'a' : ''}, ${nombre.trim().split(' ')[0]}!`);
      nav(editar ? '/perfil' : '/', { replace: true });
    } finally { setGuardando(false); }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col px-6 pb-8 pt-6">
      <div className="flex items-center gap-3">
        {(paso > 0 || editar) && (
          <button className="toque -ml-3 flex items-center justify-center oro" aria-label="Volver" onClick={() => (paso > 0 ? setPaso(paso - 1) : nav('/perfil'))}>
            <Icono n="atras" />
          </button>
        )}
        <div className="flex flex-1 gap-1.5" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
          {PASOS.map((p, i) => <span key={p} className={`h-1 flex-1 rounded-full ${i <= paso ? 'bg-gold' : 'bg-ln'}`} />)}
        </div>
      </div>

      <div key={paso} className="entrar mt-8 flex-1">
        {paso === 0 && (
          <>
            <Laurel size={48} />
            <div className="grupo mt-4">I · Conocerte</div>
            <h1 className="titulo mt-2">{editar ? 'Tus datos' : nombre && !cambiarNombre ? `Hola, ${nombre.trim().split(' ')[0]}` : 'Empecemos por vos'}</h1>
            <p className="mt-2 text-mu">Con estos datos calculamos cuánto te conviene comer cada día. Podés cambiarlos cuando quieras.</p>
            {cambiarNombre ? (
              <label className="mt-7 block"><span className="etiqueta">¿Cómo te llamás?</span>
                <input className="campo mt-2" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Tu nombre" placeholder="Tu nombre" />
              </label>
            ) : !editar && (
              <button className="mt-3 text-[13.5px] font-semibold text-mu underline" onClick={() => setCambiarNombre(true)}>¿No es tu nombre? Cambialo</button>
            )}
            <div className="etiqueta mt-6">Sexo (para la fórmula)</div>
            <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Sexo">
              {([['mujer', 'Mujer'], ['hombre', 'Hombre']] as const).map(([v, t]) => (
                <button key={v} role="radio" aria-checked={genero === v} onClick={() => setGenero(v)}
                  className={`tarjeta h-[72px] text-[16px] font-semibold transition-colors ${genero === v ? 'border-gold oro' : ''}`}>{t}</button>
              ))}
            </div>
          </>
        )}
        {paso === 1 && (
          <>
            <div className="grupo">II · Nacimiento</div>
            <h1 className="titulo mt-2">¿Cuándo naciste?</h1>
            <p className="mt-2 text-mu">El metabolismo cambia con la edad.</p>
            <input type="date" className="campo mt-7 text-[18px]" value={nacimiento} max={claveDia()} onChange={(e) => setNacimiento(e.target.value)} aria-label="Fecha de nacimiento" />
            {fechaValida && <p className="mt-3 text-center text-mu"><span className="num text-[28px] oro">{anios}</span> años</p>}
          </>
        )}
        {paso === 2 && (
          <>
            <div className="grupo">III · Altura</div>
            <h1 className="titulo mt-2">¿Cuánto medís?</h1>
            <p className="mt-2 text-mu">Arrastrá la regla o usá las flechas.</p>
            <div className="mt-8"><Regla valor={altura} min={120} max={220} unidad="cm" etiqueta="Altura" alCambiar={setAltura} /></div>
          </>
        )}
        {paso === 3 && (
          <>
            <div className="grupo">IV · Peso</div>
            <h1 className="titulo mt-2">¿Cuánto pesás hoy?</h1>
            <p className="mt-2 text-mu">Queda como tu primer registro en Progreso.</p>
            <div className="mt-8"><Regla valor={peso} min={30} max={220} paso={0.1} decimales={1} unidad="kg" etiqueta="Peso" alCambiar={setPeso} /></div>
            <p className="mt-4 text-center text-[15px] text-mu">Índice de masa corporal: <b className="text-tx">{formatoNumero(imc(peso, altura), 1)}</b></p>
          </>
        )}
        {paso === 4 && (
          <>
            <div className="grupo">V · Actividad</div>
            <h1 className="titulo mt-2">¿Cuánto te movés?</h1>
            <p className="mt-2 text-mu">Pensá en una semana normal.</p>
            <div className="mt-6 flex flex-col gap-2.5" role="radiogroup" aria-label="Nivel de actividad">
              {ACTIVIDADES.map((a) => (
                <button key={a.v} role="radio" aria-checked={actividad === a.v} onClick={() => setActividad(a.v)}
                  className={`tarjeta flex items-center gap-3 text-left transition-colors ${actividad === a.v ? 'border-gold' : ''}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${actividad === a.v ? 'border-gold' : 'border-ln3'}`}>
                    {actividad === a.v && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
                  </span>
                  <span><b className="block">{a.t}</b><span className="text-[13.5px] text-mu">{a.linea}</span></span>
                </button>
              ))}
            </div>
          </>
        )}
        {paso === 5 && (
          <>
            <div className="grupo">VI · Objetivo</div>
            <h1 className="titulo mt-2">¿Qué buscás?</h1>
            <p className="mt-2 text-mu">Sin extremos: la meta sigue siendo saludable.</p>
            <div className="mt-6 flex flex-col gap-2.5" role="radiogroup" aria-label="Objetivo">
              {OBJETIVOS.map((o) => (
                <button key={o.v} role="radio" aria-checked={objetivo === o.v} onClick={() => setObjetivo(o.v)}
                  className={`tarjeta flex items-center gap-3 text-left transition-colors ${objetivo === o.v ? 'border-gold' : ''}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${objetivo === o.v ? 'border-gold' : 'border-ln3'}`}>
                    {objetivo === o.v && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
                  </span>
                  <span><b className="block">{o.t}</b><span className="text-[13.5px] text-mu">{o.linea}</span></span>
                </button>
              ))}
            </div>
          </>
        )}
        {paso === 6 && metas && (
          <>
            <div className="grupo">VII · Tu medida</div>
            <h1 className="titulo mt-2">Tu meta diaria</h1>
            <p className="mt-2 text-mu">Calculada con la fórmula de Mifflin-St Jeor y tu nivel de actividad.</p>
            <div className="panel-dia mt-6 text-center" data-testid="meta-calculada">
              <Laurel size={150} fondo />
              <div className="etiqueta">Calorías por día</div>
              <div className="num mt-1 text-[56px] leading-none oro">{formatoNumero(metas.kcal)}</div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[13.5px]">
                {([['Proteínas', metas.prot, 'var(--prot)'], ['Carbohidratos', metas.carb, 'var(--carb)'], ['Grasas', metas.gras, 'var(--gras)']] as const).map(([t, v, c]) => (
                  <div key={t}><span className="num block text-[22px]" style={{ color: c }}>{v} g</span><span className="text-mu">{t}</span></div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[15px] text-mu"><Icono n="agua" size={20} className="acento" />Agua: <b className="text-tx">{formatoNumero(metas.agua / 1000, 2)} litros</b> ({metas.agua / 250} vasos)</div>
            </div>
            <p className="mt-4 text-[13.5px] text-mu2">Es una guía general, no reemplaza la indicación de un profesional. En Plan podés ajustarla a mano.</p>
          </>
        )}
      </div>

      <button className="btn mt-8 w-full" disabled={!puede || guardando} onClick={() => (paso < PASOS.length - 1 ? setPaso(paso + 1) : terminar())}>
        {paso < PASOS.length - 1 ? 'Siguiente' : guardando ? 'Guardando…' : editar ? 'Guardar' : 'Empezar'}
      </button>
    </div>
  );
}
