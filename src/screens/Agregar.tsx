import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BIBLIOTECA, GRUPOS, buscar, buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaCorta, formatoNumero, nuevoId, sumarDias } from '../lib/logica';
import { COMIDAS, NOMBRE_COMIDA, alimentoDeEtiqueta, copiarItems, etiquetaDe, macrosDe, sumar, type Etiqueta } from '../lib/nutricion';
import { FUENTE_OFF, PRODUCTOS_PRUEBA, buscarEnOFF } from '../lib/openfoodfacts';
import type { Alimento, ComidaGuardada, Dia, GrupoAlimento, ItemComida, TipoComida } from '../lib/tipos';
import { ElegirPorcion, FormEtiqueta } from '../ui/alimento';
import { useSesion } from '../ui/contexto';
import { Escaner } from '../ui/Escaner';
import { Icono } from '../ui/Icono';
import { Celebracion, Encabezado, Hoja, Vacio } from '../ui/piezas';
import { useDia } from '../ui/usarDia';

type Pestana = 'recientes' | 'favoritos' | 'ayer' | 'guardadas' | 'mios' | 'todos';

/** Buscar alimentos (o escanear el código de barras) y sumarlos a una comida */
export default function Agregar() {
  const { repo, usuario, perfil, cambiarPerfil, aviso } = useSesion();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const fecha = params.get('fecha') ?? claveDia();
  const comida = (COMIDAS.find((c) => c.id === params.get('comida'))?.id ?? sugerirComida()) as TipoComida;
  const { dia, agregar } = useDia(fecha);
  const [texto, setTexto] = useState('');
  const [grupo, setGrupo] = useState<GrupoAlimento | null>(null);
  const [pestana, setPestana] = useState<Pestana>((params.get('ver') as Pestana) || 'recientes');
  const [propios, setPropios] = useState<Alimento[]>([]);
  const [guardadas, setGuardadas] = useState<ComidaGuardada[]>([]);
  const [previos, setPrevios] = useState<Dia[]>([]);
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [form, setForm] = useState<{ inicial: Partial<Etiqueta>; editar?: Alimento; aviso?: string } | null>(null);
  const [escanear, setEscanear] = useState(params.get('escanear') === '1');
  const [buscando, setBuscando] = useState<string | null>(null);
  const [agregados, setAgregados] = useState(0);
  const [festejo, setFestejo] = useState(false);

  useEffect(() => {
    repo.leerPropios(usuario.uid).then(setPropios).catch(() => undefined);
    repo.leerGuardadas(usuario.uid).then(setGuardadas).catch(() => undefined);
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
    : recientes;

  async function sumarItems(items: ItemComida[], t: string) {
    const r = await agregar(comida, items);
    setAgregados((n) => n + items.length);
    aviso(t);
    if (r && !r.antes && r.ahora && fecha === claveDia()) setFestejo(true);
  }

  async function alternarFavorito(a: Alimento) {
    const f = favoritos.includes(a.id) ? favoritos.filter((x) => x !== a.id) : [a.id, ...favoritos].slice(0, 100);
    await cambiarPerfil({ favoritos: f });
  }

  /** Guarda (o actualiza) un alimento propio y lo deja en la lista */
  async function guardarPropio(a: Alimento) {
    await repo.guardarPropio(usuario.uid, a);
    setPropios((l) => [a, ...l.filter((x) => x.id !== a.id)]);
  }

  async function agregarElegido(a: Alimento, item: ItemComida) {
    setElegido(null);
    // Lo escaneado de Open Food Facts queda guardado como propio: la próxima vez aparece sin internet
    if (a.fuente === 'off' && !propios.some((p) => p.id === a.id)) await guardarPropio({ ...a, propio: true });
    await sumarItems([item], `${item.nombre} agregado`);
  }

  const leerCodigo = useCallback(async (codigo: string) => {
    setEscanear(false);
    setBuscando(codigo);
    try {
      const mio = propios.find((p) => p.codigo === codigo);
      if (mio) { setElegido(mio); return; }
      const r = repo.modo === 'prueba'
        ? (PRODUCTOS_PRUEBA[codigo] ? { tipo: 'encontrado' as const, alimento: PRODUCTOS_PRUEBA[codigo] } : { tipo: 'no-esta' as const })
        : await buscarEnOFF(codigo);
      if (r.tipo === 'encontrado') { setElegido(r.alimento); return; }
      setForm({
        inicial: { codigo, nombre: r.tipo === 'sin-datos' ? r.nombre : '' },
        aviso: r.tipo === 'error' ? 'No pudimos consultar la base de productos (¿sin internet?). Podés cargarlo vos con la etiqueta.'
          : r.tipo === 'sin-datos' ? 'Encontramos el producto pero sin la información nutricional. Copiala de la etiqueta y queda guardado.'
          : 'Este código todavía no está en la base de productos. Copiá la etiqueta una vez y la próxima lo reconoce.',
      });
    } finally { setBuscando(null); }
  }, [propios, repo.modo]);

  const cambiarComida = (c: TipoComida) => setParams({ comida: c, fecha }, { replace: true });
  const yaHay = dia?.comidas[comida] ?? [];
  const PESTANAS: [Pestana, string][] = [['recientes', 'Recientes'], ['favoritos', 'Favoritos'], ['ayer', 'Lo de ayer'], ['guardadas', 'Guardadas'], ['mios', 'Míos'], ['todos', 'Todos']];

  return (
    <div className="lg:mx-auto lg:max-w-[880px]">
      <Encabezado atras etiqueta={`${fecha === claveDia() ? 'Hoy' : fechaCorta(fecha)} · ${NOMBRE_COMIDA[comida]}`} titulo="¿Qué comiste?"
        linea={yaHay.length ? `${yaHay.length} alimento${yaHay.length > 1 ? 's' : ''} · ${formatoNumero(sumar(yaHay).kcal)} kcal en ${NOMBRE_COMIDA[comida].toLowerCase()}` : 'Buscá por nombre, escaneá el código o elegí de tus recientes.'}
        accion={agregados > 0 ? <button className="btn h-10 px-4 text-[12px]" onClick={() => nav(-1)}>Listo</button> : undefined} />

      <div className="-mx-[17px] flex gap-1.5 overflow-x-auto px-[17px] pb-1 lg:mx-0 lg:px-0" role="radiogroup" aria-label="Comida">
        {COMIDAS.map((c) => (
          <button key={c.id} role="radio" aria-checked={c.id === comida} onClick={() => cambiarComida(c.id)} className={`chip shrink-0 ${c.id === comida ? 'chip-on' : ''}`}>{c.nombre}</button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Icono n="buscar" size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mu" />
          <input className="campo pl-11" placeholder="Chipa, arroz, banana…" value={texto} onChange={(e) => { setTexto(e.target.value); setGrupo(null); }}
            aria-label="Buscar alimento" />
        </div>
        <button className="btn h-12 w-12 shrink-0 px-0" aria-label="Escanear código de barras" onClick={() => setEscanear(true)} data-testid="boton-escanear">
          <Icono n="barras" size={21} />
        </button>
      </div>
      {buscando && <p className="mt-2 text-[13px] text-mu" role="status">Buscando el código {buscando}…</p>}

      {!texto.trim() && (
        <>
          <div className="-mx-[17px] mt-4 flex gap-1 overflow-x-auto border-b border-ln2 px-[17px] lg:mx-0 lg:px-0" role="tablist">
            {PESTANAS.map(([v, t]) => (
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
                <button className="btn h-10 px-4 text-[12px]" onClick={() => sumarItems(copiarItems(deAyer, nuevoId), `Repetiste ${NOMBRE_COMIDA[comida].toLowerCase()} de ayer`)}>
                  <Icono n="repetir" size={16} />Repetir
                </button>
              </div>
              <ul className="mt-3 border-t border-ln2 pt-2 text-[14px]">
                {deAyer.map((i) => <li key={i.id} className="flex justify-between py-1"><span>{i.nombre}</span><span className="text-mu">{formatoNumero(i.kcal)} kcal</span></li>)}
              </ul>
            </div>
          ) : <p className="tarjeta py-6 text-center text-[14px] text-mu">Ayer no registraste {NOMBRE_COMIDA[comida].toLowerCase()}. En el Diario podés repetir el día entero o copiar otra comida.</p>
        ) : !texto.trim() && !grupo && pestana === 'guardadas' ? (
          guardadas.length ? (
            <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2" aria-label="Comidas guardadas">
              {guardadas.map((g) => {
                const t = sumar(g.items);
                return (
                  <li key={g.id} className="tarjeta" data-testid="guardada">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display text-[18px] font-semibold">{g.nombre}</div>
                        <div className="text-[13px] text-mu">{formatoNumero(t.kcal)} kcal · {g.items.map((i) => i.nombre).join(', ')}</div>
                      </div>
                      <button className="btn h-10 shrink-0 px-4 text-[12px]" onClick={() => sumarItems(copiarItems(g.items, nuevoId), `"${g.nombre}" agregada`)}>Agregar</button>
                    </div>
                    <button className="mt-2 text-[12px] text-mu2 hover:text-miss" onClick={async () => {
                      await repo.borrarGuardada(usuario.uid, g.id);
                      setGuardadas((l) => l.filter((x) => x.id !== g.id));
                      aviso(`"${g.nombre}" borrada`);
                    }}>Borrar</button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio titulo="Comidas guardadas" linea='En el Diario, tocá "Guardar" debajo de una comida (por ejemplo tu desayuno de siempre) y la agregás de un toque cualquier día.' />
          )
        ) : lista.length === 0 ? (
          pestana === 'mios' && !texto.trim() && !grupo ? (
            <Vacio titulo="Tus alimentos y recetas" linea="Cargá productos con su etiqueta (o escaneándolos) y las recetas de tu casa: quedan para la próxima.">
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn" onClick={() => setForm({ inicial: {} })}><Icono n="mas" size={18} />Crear alimento</button>
                <Link className="btn-sec h-[52px]" to="/receta"><Icono n="receta" size={18} />Crear receta</Link>
              </div>
            </Vacio>
          ) : (
            <div className="tarjeta py-6 text-center text-[14px] text-mu">
              {texto.trim() ? <>No encontramos “{texto}”.</> : pestana === 'favoritos' ? 'Tocá la estrella de un alimento para tenerlo acá.' : 'Todavía no hay recientes. Buscá un alimento arriba.'}
              {texto.trim() && <button className="mt-3 block w-full font-semibold oro" onClick={() => setForm({ inicial: { nombre: texto } })}>Crear “{texto}” como alimento propio →</button>}
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
                      <span className="block truncate font-semibold">{a.nombre}
                        {a.propio && <span className="ml-1.5 text-[11px] font-bold uppercase tracking-[.1em] acento">{a.receta ? 'receta' : a.codigo ? 'envasado' : 'propio'}</span>}
                      </span>
                      <span className="block truncate text-[13px] text-mu">{a.marca ? `${a.marca} · ` : ''}{p.nombre} · {formatoNumero(m.kcal)} kcal</span>
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

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button className="btn-sec" onClick={() => setEscanear(true)}><Icono n="barras" size={18} />Escanear código</button>
        <button className="btn-sec" onClick={() => setForm({ inicial: { nombre: texto } })}><Icono n="mas" size={18} />Crear alimento</button>
        <Link className="btn-sec" to="/receta"><Icono n="receta" size={18} />Crear receta</Link>
      </div>
      <p className="mt-3 text-center text-[12px] text-mu2">Valores aproximados de tablas generales. {FUENTE_OFF}.</p>

      <Hoja abierta={escanear} alCerrar={() => setEscanear(false)} etiqueta={NOMBRE_COMIDA[comida]} titulo="Escanear código de barras">
        {escanear && <Escaner alLeer={leerCodigo} />}
      </Hoja>

      <Hoja abierta={!!elegido} alCerrar={() => setElegido(null)} etiqueta={NOMBRE_COMIDA[comida]} titulo={elegido?.nombre ?? ''}>
        {elegido && (
          <ElegirPorcion key={elegido.id} alimento={elegido} favorito={favoritos.includes(elegido.id)} alFavorito={() => alternarFavorito(elegido)}
            alEditar={elegido.propio ? () => {
              const a = elegido;
              setElegido(null);
              if (a.receta) nav(`/receta?id=${encodeURIComponent(a.id)}`);
              else setForm({ inicial: etiquetaDe(a), editar: a });
            } : undefined}
            alAgregar={(item) => agregarElegido(elegido, item)} />
        )}
      </Hoja>

      <Hoja abierta={!!form} alCerrar={() => setForm(null)} etiqueta={form?.editar ? 'Editar' : 'Alimento propio'} titulo={form?.editar ? form.editar.nombre : 'Crear alimento'}>
        {form && (
          <>
            {form.aviso && <p className="mb-3 rounded-[12px] bg-acentobg p-3 text-[13px]" role="status" data-testid="aviso-codigo">{form.aviso}</p>}
            <FormEtiqueta key={form.editar?.id ?? 'nuevo'} inicial={form.inicial}
              alBorrar={form.editar ? async () => {
                const id = form.editar!.id;
                await repo.borrarPropio(usuario.uid, id);
                setPropios((l) => l.filter((x) => x.id !== id));
                setForm(null);
                aviso('Alimento borrado');
              } : undefined}
              alGuardar={async (e) => {
                const a = alimentoDeEtiqueta(form.editar?.id ?? 'p-' + nuevoId(), e);
                await guardarPropio(a);
                const editado = !!form.editar;
                setForm(null);
                setTexto('');
                setPestana('mios');
                aviso(editado ? `${a.nombre} quedó actualizado` : `${a.nombre} quedó guardado`);
                if (!editado) setElegido(a);
              }} />
          </>
        )}
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
