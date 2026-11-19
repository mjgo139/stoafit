import { Link } from 'react-router-dom';
import { fraseDelDia } from '../lib/frases';
import { claveDia, fechaLarga, formatoNumero, racha, romano, saludo, semana } from '../lib/logica';
import { comidasDelDia, comidasRegistradas, metasDe, repartoDe } from '../lib/nutricion';
import { useComidas } from '../ui/comidas';
import { useSesion } from '../ui/contexto';
import { Ficha, Grupo, Laurel } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Anillo, Macros3, TarjetaComida, Vasos } from '../ui/nutri';
import { Cargando } from '../ui/piezas';
import { useDia } from '../ui/usarDia';

/** Inicio: panel del día, comidas, agua, racha y tu semana */
export default function Hoy() {
  const { perfil } = useSesion();
  const hoy = claveDia();
  const { dia, agua } = useDia(hoy);
  const metas = metasDe(perfil);
  const lista = useComidas();
  const reparto = repartoDe(lista);
  const cumplidos = perfil.resumen.cumplidos;
  const r = racha(cumplidos, hoy);
  const sem = semana(hoy);
  const enSemana = sem.filter((d) => cumplidos.includes(d.clave)).length;
  const frase = fraseDelDia();
  const nombre = (perfil.nombre || 'Invitado').split(' ')[0];

  return (
    <div className="pt-6 lg:pt-10">
      <section className="panel-dia entrar" data-testid="panel-dia">
        <Laurel size={230} fondo />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="etiqueta first-letter:uppercase">{fechaLarga(hoy)}</div>
            <h1 className="mt-1.5 font-display text-[30px] font-semibold leading-tight lg:text-[40px]">{saludo()}, {nombre}</h1>
            <p className="mt-2 max-w-[520px] font-display text-[15px] italic text-mu lg:text-[16px]">“{frase.texto}” <span className="not-italic">— {frase.autor}</span></p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Ficha><Icono n="fuego" size={15} className="oro" />{r ? `${r} día${r > 1 ? 's' : ''} de racha` : 'Empezá tu racha'}</Ficha>
              <Ficha><Icono n="plato" size={15} className="acento" />{dia ? comidasRegistradas(dia) : 0}/{lista.length} comidas</Ficha>
              <Ficha><Icono n="agua" size={15} className="acento" />{dia ? formatoNumero(dia.agua / 1000, 2) : 0} L</Ficha>
            </div>
          </div>
          {dia ? (
            <div className="flex items-center gap-5 lg:w-[420px]">
              <Anillo valor={dia.totales.kcal} meta={metas.kcal} tam={132} />
              <div className="min-w-0 flex-1">
                <div className="mb-3 text-[13px] text-mu"><b className="num text-[18px] text-tx">{formatoNumero(dia.totales.kcal)}</b> de {formatoNumero(metas.kcal)} kcal</div>
                <Macros3 t={dia.totales} metas={metas} />
              </div>
            </div>
          ) : <div className="lg:w-[420px]"><Cargando forma="tarjeta" /></div>}
        </div>
      </section>

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6">
        <section>
          <Grupo n={1} className="mb-3" extra={
            <span className="flex items-center gap-3">
              <Link to="/agregar?escanear=1" className="flex items-center gap-1 text-[13px] font-semibold oro" aria-label="Escanear un producto"><Icono n="barras" size={16} />Escanear</Link>
              <Link to="/diario" className="text-[13px] font-semibold oro">Ver diario →</Link>
            </span>}>Comidas de hoy</Grupo>
          {!dia ? <Cargando /> : (
            <div className="flex flex-col gap-2.5">
              {comidasDelDia(lista, dia).map((c) => <TarjetaComida key={c.id} tipo={c.id} nombre={c.nombre} parte={reparto[c.id] ?? 0} items={dia.comidas[c.id] ?? []} metas={metas} fecha={hoy} />)}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-7 lg:gap-6">
          <section>
            <Grupo n={2} className="mb-3">Agua</Grupo>
            <div className="tarjeta flex flex-col justify-center lg:h-[232px]" data-testid="agua">
              {dia ? <Vasos ml={dia.agua} meta={metas.agua} alCambiar={(ml) => agua(ml)} /> : <Cargando forma="linea" />}
            </div>
          </section>
          <section>
            <Grupo n={3} className="mb-3">Tu semana</Grupo>
            <div className="tarjeta lg:h-[232px]" data-testid="tu-semana">
              <div className="flex justify-between">
                {sem.map((d) => {
                  const ok = cumplidos.includes(d.clave);
                  const con = perfil.resumen.dias.includes(d.clave);
                  return (
                    <div key={d.clave} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${d.hoy ? 'oro' : 'text-mu2'}`}>{d.letra}</span>
                      <span className={`num flex h-9 w-9 items-center justify-center rounded-full border text-[15px] ${ok ? 'border-transparent text-white' : con ? 'border-ln3' : d.futuro ? 'border-ln2 text-mu2' : 'border-ln2 text-mu'}`}
                        style={ok ? { background: 'var(--verde)' } : undefined} aria-label={`${d.numero}${ok ? ', cumplido' : ''}`}>
                        {ok ? <Icono n="check" size={16} /> : d.numero}
                      </span>
                      <span className={`h-0.5 w-5 rounded-full ${d.hoy ? 'bg-gold' : 'bg-transparent'}`} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[13px] text-mu">
                <span><b className="num text-[18px] text-tx">{enSemana}</b>/7 días cumplidos</span>
                <span>Racha <b className="num text-[18px] oro">{r ? romano(r) : '0'}</b></span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ln2"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(enSemana / 7) * 100}%` }} /></div>
              <p className="mt-3 text-[12px] text-mu2">Un día se cumple con 2 comidas o más y las calorías entre el 85 % y el 110 % de tu meta.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
