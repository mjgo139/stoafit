import { Link } from 'react-router-dom';
import { fraseDelDia } from '../lib/frases';
import { claveDia, hastaHoy, formatoNumero, racha, romano, semana } from '../lib/logica';
import { comidasDelDia, comidasRegistradas, metasDe, repartoDe } from '../lib/nutricion';
import { useComidas } from '../ui/comidas';
import { useSesion } from '../ui/contexto';
import { Avatar, Grupo, PanelDia, TuSemana } from '../ui/familia';
import { Icono } from '../../familia/iconos';
import { Anillo, Macros3, TarjetaComida } from '../ui/nutri';
import { Cargando } from '../ui/piezas';
import { useDia } from '../ui/usarDia';

/** Inicio: panel del día, comidas, racha y tu semana (el agua está en el Diario) */
export default function Hoy() {
  const { perfil } = useSesion();
  const hoy = claveDia();
  const { dia } = useDia(hoy);
  const metas = metasDe(perfil);
  const lista = useComidas();
  const reparto = repartoDe(lista);
  const cumplidos = hastaHoy(perfil.resumen.cumplidos, hoy);
  const r = racha(cumplidos, hoy);
  const sem = semana(hoy);
  const frase = fraseDelDia();
  const nombre = (perfil.nombre || 'Invitado').split(' ')[0];

  return (
    <div className="pt-6 lg:pt-10">
      <div className="entrar">
        <PanelDia nombre={nombre}
          avatar={<Avatar foto={perfil.foto} nombre={perfil.nombre || nombre} />}
          frase={frase}
          fichas={<>
            <Link to="/progreso" className="ficha"><Icono n="fuego" size={16} className="oro" />{r ? `${r} día${r > 1 ? 's' : ''} de racha` : 'Empezá tu racha'}<span aria-hidden className="ir">›</span></Link>
            <Link to="/diario" className="ficha"><Icono n="plato" size={16} className="oro" />{dia ? comidasRegistradas(dia) : 0}/{lista.length} comidas<span aria-hidden className="ir">›</span></Link>
          </>}
          lado={dia ? (
            <div className="flex items-center gap-5 lg:w-[420px]">
              <Anillo valor={dia.totales.kcal} meta={metas.kcal} tam={132} />
              <div className="min-w-0 flex-1">
                <div className="mb-3 text-[13.5px] text-mu"><b className="num text-[18px] text-tx">{formatoNumero(dia.totales.kcal)}</b> de {formatoNumero(metas.kcal)} kcal</div>
                <Macros3 t={dia.totales} metas={metas} />
              </div>
            </div>
          ) : <div className="lg:w-[420px]"><Cargando forma="tarjeta" /></div>} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6">
        <section>
          <Grupo n={1} className="mb-3" extra={
            <span className="flex items-center gap-3">
              <Link to="/agregar?escanear=1" className="flex items-center gap-1 text-[13.5px] font-semibold oro" aria-label="Escanear un producto"><Icono n="barras" size={16} />Escanear</Link>
              <Link to="/diario" className="text-[13.5px] font-semibold oro">Ver diario →</Link>
            </span>}>Comidas de hoy</Grupo>
          {!dia ? <Cargando /> : (
            <div className="flex flex-col gap-2.5">
              {comidasDelDia(lista, dia).map((c) => <TarjetaComida key={c.id} tipo={c.id} nombre={c.nombre} parte={reparto[c.id] ?? 0} items={dia.comidas[c.id] ?? []} metas={metas} fecha={hoy} />)}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-7 lg:gap-6">
          <section>
            <Grupo n={2} className="mb-3">Tu semana</Grupo>
            <TuSemana texto="días cumplidos"
              dias={sem.map((d) => ({ fecha: d.clave, hecho: cumplidos.includes(d.clave), hoy: d.hoy, plan: !!d.futuro && perfil.resumen.dias.includes(d.clave) }))}
              extra={<>Racha <b className="num text-[18px] oro">{r ? romano(r) : '0'}</b></>}
              nota="Un día se cumple con 2 comidas o más y las calorías entre el 85 % y el 110 % de tu meta." />
          </section>
        </div>
      </div>
    </div>
  );
}
