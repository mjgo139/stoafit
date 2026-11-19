import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BIBLIOTECA, GRUPOS, buscar, buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaCorta, formatoNumero, nuevoId, sumarDias } from '../lib/logica';
import { COMIDAS, NOMBRE_COMIDA, itemDe, macrosDe, sumar } from '../lib/nutricion';
import type { Alimento, Dia, GrupoAlimento, ItemComida, TipoComida } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { Icono } from '../ui/Icono';
import { Celebracion, Encabezado, Hoja, Vacio } from '../ui/piezas';
import { useDia } from '../ui/usarDia';

type Pestana = 'recientes' | 'favoritos' | 'ayer' | 'mios' | 'todos';
const CANTIDADES = [0.5, 1, 1.5, 2, 3];

/** Buscar alimentos y sumarlos a una comida */
export default function Agregar() {
  const { repo, usuario, perfil, cambiarPerfil, aviso } = useSesion();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const fecha = params.get('fecha') ?? claveDia();
  const comida = (COMIDAS.find((c) => c.id === params.get('comida'))?.id ?? sugerirComida()) as TipoComida;
  const { dia, agregar } = useDia(fecha);
  const [texto, setTexto] = useState('');
  const [grupo, setGrupo] = useState<GrupoAlimento | null>(null);
  const [pestana, setPestana] = useState<Pestana>('recientes');
  const [propios, setPropios] = useState<Alimento[]>([]);
  const [previos, setPrevios] = useState<Dia[]>([]);
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [crear, setCrear] = useState(false);
  const [agregados, setAgregados] = useState(0);
  const [festejo, setFestejo] = useState(false);

  useEffect(() => {
    repo.leerPropios(usuario.uid).then(setPropios).catch(() => undefined);
    repo.leerDias(usuario.uid, sumarDias(fecha, -7), sumarDias(fecha, -1)).then(setPrevios).catch(() => undefined);
  }, [repo, usuario.uid, fecha]);

  const todos = useMemo(() => [...propios, ...BIBLIOTECA], [propios]);
  const favoritos = perfil.favoritos ?? [];
  const ayer = previos.find((d) => d.fecha === sumarDias(fecha, -1));
  const deAyer = ayer?.comidas[comida] ?? [];
  const recientes = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const d of previos) for (const l of Object.values(d.comidas)) for (const i of l ?? []) vistos.set(i.alimentoId, (vistos.get(i.alimentoId) ?? 0) + 1);
    return [...vistos.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => buscarAlimento(id, propios)).filter(Boolean).slice(0, 20) as Alimento[];
  }, [previos, propios]);

  const lista: Alimento[] = texto.trim()
    ? buscar(texto, todos)
    : grupo ? todos.filter((a) => a.grupo === grupo)
    : pestana === 'favoritos' ? favoritos.map((id) => buscarAlimento(id, propios)).filter(Boolean) as Alimento[]
    : pestana === 'mios' ? propios
    : pestana === 'todos' ? todos
    : recientes.length ? recientes : todos.slice(0, 0);

  async function sumarItems(items: ItemComida[], texto: string) {
    const r = await agregar(comida, items);
    setAgregados((n) => n + items.length);
    aviso(texto);
    if (r && !r.antes && r.ahora && fecha === claveDia()) setFestejo(true);
  }

  async function alternarFavorito(a: Alimento) {
    const f = favoritos.includes(a.id) ? favoritos.filter((x) => x !== a.id) : [a.id, ...favoritos].slice(0, 100);
    await cambiarPerfil({ favoritos: f });
  }

  const cambiarComida = (c: TipoComida) => setParams({ comida: c, fecha }, { replace: true });
  const yaHay = dia?.comidas[comida] ?? [];

  return (
    <div className="lg:mx-auto lg:max-w-[880px]">
      <Encabezado atras etiqueta={`${fecha === claveDia() ? 'Hoy' : fechaCorta(fecha)} · ${NOMBRE_COMIDA[comida]}`} titulo="¿Qué comiste?"
        linea={yaHay.length ? `${yaHay.length} alimento${yaHay.length > 1 ? 's' : ''} · ${formatoNumero(sumar(yaHay).kcal)} kcal en ${NOMBRE_COMIDA[comida].toLowerCase()}` : 'Buscá por nombre o elegí de tus recientes.'}
        accion={agregados > 0 ? <button className="btn h-10 px-4 text-[12px]" onClick={() => nav(-1)}>Listo</button> : undefined} />

      <div className="-mx-[17px] flex gap-1.5 overflow-x-auto px-[17px] pb-1 lg:mx-0 lg:px-0" role="radiogroup" aria-label="Comida">
        {COMIDAS.map((c) => (
          <button key={c.id} role="radio" aria-checked={c.id === comida} onClick={() => cambiarComida(c.id)} className={`chip shrink-0 ${c.id === comida ? 'chip-on' : ''}`}>{c.nombre}</button>
        ))}
      </div>

      <div className="relative mt-4">
        <Icono n="buscar" size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mu" />
        <input className="campo pl-11" placeholder="Chipa, arroz, banana…" value={texto} onChange={(e) => { setTexto(e.target.value); setGrupo(null); }}
          aria-label="Buscar alimento" autoFocus={matchMedia('(min-width: 1024px)').matches} />
      </div>

      {!texto.trim() && (
        <>
          <div className="mt-4 flex gap-1 border-b border-ln2" role="tablist">
            {([['recientes', 'Recientes'], ['favoritos', 'Favoritos'], ['ayer', 'Lo de ayer'], ['mios', 'Míos'], ['todos', 'Todos']] as const).map(([v, t]) => (
              <button key={v} role="tab" aria-selected={pestana === v && !grupo} onClick={() => { setPestana(v); setGrupo(null); }}
                className={`h-10 shrink-0 border-b-2 px-2.5 text-[13.5px] font-semibold ${pestana === v && !grupo ? 'border-gold oro' : 'border-transparent text-mu'}`}>{t}</button>
            ))}
          </div>
          <div className="-mx-[17px] mt-3 flex gap-1.5 overflow-x-auto px-[17px] pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {GRUPOS.map((g) => (
              <button key={g.v} onClick={() => setGrupo(grupo === g.v ? null : g.v)} className={`chip h-7 shrink-0 text-[12px] ${grupo === g.v ? 'chip-on' : ''}`}>{g.t}</button>
            ))}
          </div>
        </>
      )}

      <div className="mt-4">
        {!texto.trim() && !grupo && pestana === 'ayer' ? (
          deAyer.length ? (
            <div className="tarjeta" data-testid="lo-de-ayer">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-[18px] font-semibold">{NOMBRE_COMIDA[comida]} de ayer</div>
                  <div className="text-[13px] text-mu">{formatoNumero(sumar(deAyer).kcal)} kcal · {deAyer.length} alimentos</div>
                </div>
                <button className="btn h-10 px-4 text-[12px]" onClick={() => sumarItems(deAyer.map((i) => ({ ...i, id: nuevoId() })), `Repetiste ${NOMBRE_COMIDA[comida].toLowerCase()} de ayer`)}>
                  <Icono n="repetir" size={16} />Repetir
                </button>
              </div>
              <ul className="mt-3 border-t border-ln2 pt-2 text-[14px]">
                {deAyer.map((i) => <li key={i.id} className="flex justify-between py-1"><span>{i.nombre}</span><span className="text-mu">{formatoNumero(i.kcal)} kcal</span></li>)}
              </ul>
            </div>
          ) : <p className="tarjeta py-6 text-center text-[14px] text-mu">Ayer no registraste {NOMBRE_COMIDA[comida].toLowerCase()}.</p>
        ) : lista.length === 0 ? (
          pestana === 'mios' && !texto.trim() && !grupo ? (
            <Vacio titulo="Tus alimentos" linea="Cargá las comidas de tu casa o productos con su etiqueta, y quedan para la próxima.">
              <button className="btn" onClick={() => setCrear(true)}><Icono n="mas" size={18} />Crear alimento</button>
            </Vacio>
          ) : (
            <div className="tarjeta py-6 text-center text-[14px] text-mu">
              {texto.trim() ? <>No encontramos “{texto}”.</> : pestana === 'favoritos' ? 'Tocá la estrella de un alimento para tenerlo acá.' : 'Todavía no hay recientes. Buscá un alimento arriba.'}
              {texto.trim() && <button className="mt-3 block w-full font-semibold oro" onClick={() => setCrear(true)}>Crear “{texto}” como alimento propio →</button>}
            </div>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-label="Alimentos">
            {lista.slice(0, 80).map((a) => {
              const p = a.porciones[0];
              const m = macrosDe(a, p.gramos);
              return (
                <li key={a.id}>
                  <button className="tarjeta flex w-full items-center gap-3 py-3 text-left transition-colors hover:border-gold2" onClick={() => setElegido(a)} data-testid="alimento">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.nombre}{a.propio && <span className="ml-1.5 text-[11px] font-bold uppercase tracking-[.1em] acento">propio</span>}</span>
                      <span className="block text-[13px] text-mu">{p.nombre} · {formatoNumero(m.kcal)} kcal</span>
                    </span>
                    {favoritos.includes(a.id) && <Icono n="estrella" size={16} className="shrink-0 oro" />}
                    <Icono n="mas" size={20} className="shrink-0 oro" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button className="mt-5 flex w-full items-center justify-center gap-2 p-2 text-[14px] font-semibold oro" onClick={() => setCrear(true)}>
        <Icono n="mas" size={18} />Crear alimento propio
      </button>
      <p className="mt-1 text-center text-[12px] text-mu2">Valores aproximados de tablas generales de alimentos.</p>

      <Hoja abierta={!!elegido} alCerrar={() => setElegido(null)} etiqueta={NOMBRE_COMIDA[comida]} titulo={elegido?.nombre ?? ''}>
        {elegido && (
          <ElegirPorcion alimento={elegido} favorito={favoritos.includes(elegido.id)} alFavorito={() => alternarFavorito(elegido)}
            alAgregar={async (item) => { setElegido(null); await sumarItems([item], `${item.nombre} agregado`); }} />
        )}
      </Hoja>

      <Hoja abierta={crear} alCerrar={() => setCrear(false)} etiqueta="Alimento propio" titulo="Crear alimento">
        <CrearAlimento nombreInicial={texto} alCrear={async (a) => {
          await repo.guardarPropio(usuario.uid, a);
          setPropios((l) => [a, ...l]);
          setCrear(false);
          setTexto('');
          setPestana('mios');
          aviso(`${a.nombre} quedó guardado`);
          setElegido(a);
        }} />
      </Hoja>

      <Celebracion visible={festejo} alCerrar={() => setFestejo(false)} titulo="Día en su medida"
        linea="Ni de menos ni de más. Así se construye la templanza." />
    </div>
  );
}

function sugerirComida(): TipoComida {
  const h = new Date().getHours();
  if (h < 10) return 'desayuno';
  if (h < 15) return 'almuerzo';
  if (h < 19) return 'merienda';
  return 'cena';
}

/** Hoja: porción, cantidad y lo que aporta */
function ElegirPorcion({ alimento: a, favorito, alFavorito, alAgregar }: {
  alimento: Alimento; favorito: boolean; alFavorito: () => void; alAgregar: (i: ItemComida) => void;
}) {
  const [porcion, setPorcion] = useState(a.porciones[0].nombre);
  const [cantidad, setCantidad] = useState(1);
  const item = itemDe(a, porcion, cantidad, nuevoId());
  return (
    <div>
      <div className="etiqueta">Porción</div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Porción">
        {a.porciones.map((p) => (
          <button key={p.nombre} role="radio" aria-checked={porcion === p.nombre} onClick={() => setPorcion(p.nombre)} className={`chip ${porcion === p.nombre ? 'chip-on' : ''}`}>
            {p.nombre}{p.nombre !== '100 g' && p.nombre !== '100 ml' && <span className="ml-1 opacity-70">({p.gramos} g)</span>}
          </button>
        ))}
      </div>
      <div className="etiqueta mt-5">Cantidad</div>
      <div className="mt-2 flex items-center gap-2">
        <button className="chip h-11 w-11" aria-label="Menos cantidad" onClick={() => setCantidad((c) => Math.max(0.25, c - 0.5))}><Icono n="menos" size={16} /></button>
        <span className="num w-14 text-center text-[24px]" aria-label="Cantidad">{formatoNumero(cantidad, 2)}</span>
        <button className="chip h-11 w-11" aria-label="Más cantidad" onClick={() => setCantidad((c) => c + 0.5)}><Icono n="mas" size={16} /></button>
        <div className="ml-auto flex gap-1">
          {CANTIDADES.map((c) => <button key={c} className={`chip h-8 px-2.5 text-[12px] ${cantidad === c ? 'chip-on' : ''}`} onClick={() => setCantidad(c)}>{c === 0.5 ? '½' : c === 1.5 ? '1½' : c}</button>)}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 rounded-[12px] border border-ln2 p-3 text-center" data-testid="aporte">
        <div><div className="num text-[22px] oro">{formatoNumero(item.kcal)}</div><div className="text-[11px] text-mu">kcal</div></div>
        <div><div className="num text-[18px]" style={{ color: 'var(--prot)' }}>{formatoNumero(item.prot, 1)}</div><div className="text-[11px] text-mu">prot. g</div></div>
        <div><div className="num text-[18px]" style={{ color: 'var(--carb)' }}>{formatoNumero(item.carb, 1)}</div><div className="text-[11px] text-mu">carb. g</div></div>
        <div><div className="num text-[18px]" style={{ color: 'var(--gras)' }}>{formatoNumero(item.gras, 1)}</div><div className="text-[11px] text-mu">grasas g</div></div>
      </div>
      <p className="mt-2 text-center text-[12px] text-mu2">{formatoNumero(item.gramos)} g en total</p>
      <div className="mt-4 flex gap-2">
        <button className="btn-sec h-[52px] w-[52px] shrink-0 px-0" aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={favorito} onClick={alFavorito}>
          <Icono n="estrella" size={20} className={favorito ? 'oro' : ''} />
        </button>
        <button className="btn flex-1" onClick={() => alAgregar(item)}>Agregar</button>
      </div>
    </div>
  );
}

/** Formulario para cargar un alimento propio (por ejemplo desde la etiqueta del paquete) */
function CrearAlimento({ nombreInicial, alCrear }: { nombreInicial: string; alCrear: (a: Alimento) => void }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [porcion, setPorcion] = useState('1 porción');
  const [gramos, setGramos] = useState('100');
  const [v, setV] = useState({ kcal: '', prot: '', carb: '', gras: '' });
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  const g = num(gramos);
  const valido = nombre.trim() && g > 0 && v.kcal !== '';
  function crear() {
    const f = 100 / g;
    const r = (x: number) => Math.round(x * f * 10) / 10;
    alCrear({
      id: 'p-' + nuevoId(), nombre: nombre.trim().slice(0, 80), grupo: 'tipicos', propio: true,
      por100: { kcal: Math.round(num(v.kcal) * f), prot: r(num(v.prot)), carb: r(num(v.carb)), gras: r(num(v.gras)) },
      porciones: [{ nombre: porcion.trim() || '1 porción', gramos: g }, ...(g !== 100 ? [{ nombre: '100 g', gramos: 100 }] : [])],
    });
  }
  const campo = (k: keyof typeof v, t: string) => (
    <label className="block"><span className="etiqueta">{t}</span>
      <input className="campo mt-1.5" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-label={t} placeholder="0" />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Nombre del alimento" placeholder="Ej.: Guiso de la abuela" />
      </label>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <label className="block"><span className="etiqueta">Porción</span>
          <input className="campo mt-1.5" value={porcion} onChange={(e) => setPorcion(e.target.value)} maxLength={40} aria-label="Nombre de la porción" />
        </label>
        <label className="block"><span className="etiqueta">Gramos</span>
          <input className="campo mt-1.5" inputMode="decimal" value={gramos} onChange={(e) => setGramos(e.target.value)} aria-label="Gramos de la porción" />
        </label>
      </div>
      <p className="text-[13px] text-mu">Lo que aporta <b>esa porción</b> (está en la etiqueta del paquete):</p>
      <div className="grid grid-cols-2 gap-2">
        {campo('kcal', 'Calorías')}{campo('prot', 'Proteínas (g)')}{campo('carb', 'Carbohidratos (g)')}{campo('gras', 'Grasas (g)')}
      </div>
      <button className="btn mt-2 w-full" disabled={!valido} onClick={crear}>Guardar alimento</button>
    </div>
  );
}

