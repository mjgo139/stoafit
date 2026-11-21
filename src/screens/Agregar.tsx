import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BIBLIOTECA, GRUPOS, buscar, buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaCorta, formatoNumero, nuevoId, sumarDias } from '../lib/logica';
import { alimentoDeEtiqueta, nombreComida, copiarItems, etiquetaDe, itemDe, sumar, type Etiqueta } from '../lib/nutricion';
import { FUENTE_OFF, PRODUCTOS_PRUEBA, buscarEnOFF } from '../lib/openfoodfacts';
import { alimentoDeProducto, codigoDeId, productosEnCache, recordarProducto } from '../lib/productos';
import type { Alimento, ComidaGuardada, Dia, GrupoAlimento, ItemComida, TipoComida } from '../lib/tipos';
import { ElegirPorcion, FormEtiqueta } from '../ui/alimento';
import { useSesion } from '../ui/contexto';
import { Escaner } from '../ui/Escaner';
import { Icono } from '../../familia/iconos';
import { Celebracion, Hoja, Vacio } from '../ui/piezas';
import { textoCantidad } from '../ui/nutri';
import { useCopiar, useDia } from '../ui/usarDia';
import { useComidas } from '../ui/comidas';
import { LineaMacros } from '../ui/nutri';
import { useProductos } from '../ui/usarProductos';
import { mensajeError } from '../data/repo';

type Pestana = 'recientes' | 'favoritos' | 'comidas' | 'mios' | 'todos';

/** Buscar alimentos (o escanear el código de barras) y sumarlos a una comida */
export default function Agregar() {
  const { repo, usuario, perfil, cambiarPerfil, aviso } = useSesion();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const fecha = params.get('fecha') ?? claveDia();
  const misComidas = useComidas();
  const pedida = params.get('comida');
  const comida: TipoComida = pedida && /^[a-z0-9-]{2,20}$/.test(pedida) ? pedida : sugerirComida(misComidas.map((c) => c.id));
  const nombre = nombreComida(misComidas, comida);
  const { dia, agregar } = useDia(fecha);
  const copiarA = useCopiar();
  const [texto, setTexto] = useState('');
  const [grupo, setGrupo] = useState<GrupoAlimento | null>(null);
  const [pestana, setPestana] = useState<Pestana>(() => {
    const v = params.get('ver');
    return v === 'guardadas' || v === 'ayer' ? 'comidas' : (v as Pestana) || 'recientes';
  });
  const [rapida, setRapida] = useState(false);
  const [propios, setPropios] = useState<Alimento[]>([]);
  const [guardadas, setGuardadas] = useState<ComidaGuardada[]>([]);
  const [previos, setPrevios] = useState<Dia[]>([]);
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [form, setForm] = useState<{ inicial: Partial<Etiqueta>; editar?: Alimento; aviso?: string; codigo?: string } | null>(null);
  const [reportar, setReportar] = useState<Alimento | null>(null);
  const [cache, setCache] = useState<Alimento[]>(() => productosEnCache());
  const productos = useProductos();
  const [escanear, setEscanear] = useState(params.get('escanear') === '1');
  const [buscando, setBuscando] = useState<string | null>(null);
  const [agregados, setAgregados] = useState(0);
  const [festejo, setFestejo] = useState(false);

  useEffect(() => {
    repo.leerPropios(usuario.uid).then(setPropios).catch(() => undefined);
    repo.leerGuardadas(usuario.uid).then(setGuardadas).catch(() => undefined);
    repo.leerDias(usuario.uid, sumarDias(fecha, -7), sumarDias(fecha, -1)).then(setPrevios).catch(() => undefined);
  }, [repo, usuario.uid, fecha]);

  // Lo que se puede buscar: alimentos propios, productos compartidos que usaste en este teléfono y la biblioteca
  const todos = useMemo(() => [...propios, ...cache.filter((c) => !propios.some((p) => p.id === c.id)), ...BIBLIOTECA], [propios, cache]);
  const resolver = useCallback((id: string) => buscarAlimento(id, propios) ?? cache.find((c) => c.id === id), [propios, cache]);
  const favoritos = perfil.favoritos ?? [];
  const ayer = previos.find((d) => d.fecha === sumarDias(fecha, -1));
  const deAyer = ayer?.comidas[comida] ?? [];
  // La última vez que comiste cada alimento: con eso el "+" lo agrega igual, de un toque
  const ultimaVez = useMemo(() => {
    const m = new Map<string, ItemComida>();
    for (const d of [...previos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))) {
      for (const l of Object.values(d.comidas)) for (const i of l ?? []) if (!m.has(i.alimentoId)) m.set(i.alimentoId, i);
    }
    return m;
  }, [previos]);
  const recientes = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const d of previos) for (const l of Object.values(d.comidas)) for (const i of l ?? []) vistos.set(i.alimentoId, (vistos.get(i.alimentoId) ?? 0) + 1);
    return [...vistos.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => resolver(id)).filter(Boolean).slice(0, 20) as Alimento[];
  }, [previos, resolver]);

  const lista: Alimento[] = texto.trim()
    ? buscar(texto, todos)
    : grupo ? todos.filter((a) => a.grupo === grupo)
    : pestana === 'favoritos' ? favoritos.map((id) => resolver(id)).filter(Boolean) as Alimento[]
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

  function usarCompartido(a: Alimento) {
    recordarProducto(a);
    setCache(productosEnCache());
  }

  async function agregarElegido(a: Alimento, item: ItemComida, otrosDias: string[] = []) {
    setElegido(null);
    let it = item;
    // Lo encontrado en Open Food Facts pasa a la base compartida con su código: la próxima vez lo encuentra cualquiera
    if (a.fuente === 'off' && a.codigo) {
      try {
        const r = await productos.crear({ nombre: a.nombre, marca: a.marca, codigo: a.codigo, modo: '100', porcion: a.porciones[0].nombre, gramos: a.porciones[0].gramos, ...a.por100, otras: a.porciones.slice(1) }, 'manual');
        usarCompartido(r.alimento);
        it = { ...item, alimentoId: r.alimento.id };
      } catch { /* sin conexión: igual se registra la comida */ }
    }
    if (a.compartido) usarCompartido(a);
    // Los otros días: 1 lectura + 2 escrituras cada uno
    for (const f of otrosDias) await copiarA(f, comida, [it]);
    await sumarItems([it], otrosDias.length ? `${it.nombre} agregado a ${otrosDias.length + 1} días` : `${it.nombre} agregado`);
  }

  const leerCodigo = useCallback(async (codigo: string) => {
    setEscanear(false);
    setBuscando(codigo);
    try {
      // 1) La base compartida de StoaFit: un código = un producto
      const compartido = await repo.leerProducto(codigo).catch(() => null);
      if (compartido) { const a = alimentoDeProducto(compartido); usarCompartido(a); setElegido(a); return; }
      // 2) Alimentos propios con código (de la v1.1.0)
      const mio = propios.find((p) => p.codigo === codigo);
      if (mio) { setElegido(mio); return; }
      // 3) Open Food Facts
      const r = repo.modo === 'prueba'
        ? (PRODUCTOS_PRUEBA[codigo] ? { tipo: 'encontrado' as const, alimento: PRODUCTOS_PRUEBA[codigo] } : { tipo: 'no-esta' as const })
        : await buscarEnOFF(codigo);
      if (r.tipo === 'encontrado') { setElegido(r.alimento); return; }
      setForm({
        codigo,
        inicial: { codigo, nombre: r.tipo === 'sin-datos' ? r.nombre : '' },
        aviso: r.tipo === 'error' ? 'No pudimos consultar la base de productos (¿sin internet?). Podés cargarlo vos con la etiqueta.'
          : r.tipo === 'sin-datos' ? 'Encontramos el producto pero sin la información nutricional. Copiala de la etiqueta y queda guardado.'
          : 'Este código todavía no está cargado. Copiá la etiqueta una vez y queda para todos los usuarios de StoaFit.',
      });
    } finally { setBuscando(null); }
  }, [propios, repo]);

  const cambiarComida = (c: TipoComida) => setParams({ comida: c, fecha }, { replace: true });
  const yaHay = dia?.comidas[comida] ?? [];
  const PESTANAS: [Pestana, string][] = [['recientes', 'Recientes'], ['favoritos', 'Favoritos'], ['comidas', 'Mis comidas'], ['mios', 'Mis alimentos'], ['todos', 'Todos']];
  const buscandoTexto = !!texto.trim();
  /** Cómo se agrega con el "+": como la última vez, o la primera porción */
  const rapido = (a: Alimento) => {
    const u = ultimaVez.get(a.id);
    return itemDe(a, u?.porcion ?? a.porciones[0]?.nombre ?? '100 g', u?.cantidad ?? 1, nuevoId());
  };

  /** Atajos: escanear, solo calorías y crear alimento (en una sola tarjeta, separados por líneas finas) */
  const atajos = (id: string, vertical = false) => {
    const botones: [string, string, string, () => void][] = [
      ['barras', 'Escanear', 'Código de barras', () => setEscanear(true)],
      ['kcal', 'Solo calorías', 'Sin buscar el alimento', () => setRapida(true)],
      ['mas', 'Crear alimento', 'Con su etiqueta', () => setForm({ inicial: { nombre: texto } })],
    ];
    return (
      <div className={`tarjeta p-0 ${vertical ? 'flex flex-col divide-y divide-ln2' : 'grid grid-cols-3 divide-x divide-ln2'}`} data-testid={id}>
        {botones.map(([ic, t, l, f]) => (
          <button key={t} onClick={f} className={`flex items-center gap-3 hover:bg-sf2 ${vertical ? 'px-4 py-3 text-left first:rounded-t-[16px] last:rounded-b-[16px]' : 'flex-col justify-start gap-2 px-1 pb-3 pt-4 text-center first:rounded-l-[16px] last:rounded-r-[16px]'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold2 oro">
              {ic === 'kcal' ? <span className="text-[11px] font-bold tracking-[.04em]">kcal</span> : <Icono n={ic} size={20} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[11.5px] font-bold uppercase leading-tight tracking-[.1em] oro">{t}</span>
              {vertical && <span className="block text-[12.5px] text-mu">{l}</span>}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="lg:mx-auto lg:max-w-[1180px]">
      <header className="entrar sticky top-0 z-20 -mx-[17px] bg-bg px-[17px] pb-3 pt-4 lg:static lg:mx-0 lg:px-0 lg:pt-8">
        {/* Tres columnas iguales a los costados: el título queda siempre en el centro */}
        <div className="grid min-h-[48px] grid-cols-[84px_minmax(0,1fr)_84px] items-center">
          <button aria-label="Volver" className="toque -ml-3 flex items-center justify-center justify-self-start oro" onClick={() => nav(-1)}><Icono n="atras" /></button>
          <div className="relative min-w-0 text-center">
            <h1 className="sr-only">¿Qué comiste?</h1>
            <label className="relative inline-flex max-w-full items-center gap-1.5">
              <span className="font-display truncate text-[26px] font-semibold leading-none oro">{nombre}</span>
              <Icono n="abajo" size={20} className="shrink-0 oro" />
              <select className="absolute inset-0 cursor-pointer opacity-0" value={comida} onChange={(e) => cambiarComida(e.target.value as TipoComida)} aria-label="Comida">
                {(misComidas.some((c) => c.id === comida) ? misComidas : [...misComidas, { id: comida, nombre }]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <div className="mt-1 truncate text-[12.5px] text-mu" data-testid="ya-en-comida">
              {fecha === claveDia() ? 'Hoy' : fechaCorta(fecha)}{yaHay.length ? ` · ${yaHay.length} alimento${yaHay.length > 1 ? 's' : ''} · ${formatoNumero(sumar(yaHay).kcal)} kcal` : ' · todavía nada'}
            </div>
          </div>
          <div className="flex justify-end">
            {agregados > 0 && <button className="btn h-10 px-4 text-[12.5px]" onClick={() => nav(-1)}>Listo</button>}
          </div>
        </div>
        <div className="relative mt-3">
          <Icono n="buscar" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mu" />
          <input className="campo h-12 rounded-full pl-11 pr-14" placeholder="Buscá un alimento" value={texto} onChange={(e) => { setTexto(e.target.value); setGrupo(null); }}
            aria-label="Buscar alimento" />
          <button className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full oro hover:bg-goldbg" aria-label="Escanear código de barras" onClick={() => setEscanear(true)} data-testid="boton-escanear">
            <Icono n="barras" size={20} />
          </button>
        </div>
        {!buscandoTexto && (
          <div className="-mx-[17px] mt-2 flex overflow-x-auto border-b border-ln2 px-[17px] lg:mx-0 lg:px-0" role="tablist">
            {PESTANAS.map(([v, t]) => (
              <button key={v} role="tab" aria-selected={pestana === v} onClick={() => { setPestana(v); setGrupo(null); }}
                className={`h-11 shrink-0 border-b-2 px-3 text-[15px] font-semibold ${pestana === v ? 'border-gold oro' : 'border-transparent text-mu'}`}>{t}</button>
            ))}
          </div>
        )}
      </header>
      {buscando && <p className="mb-2 text-[13.5px] text-mu" role="status">Buscando el código {buscando}…</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0">
      {!buscandoTexto && pestana === 'recientes' && <div className="mt-2 lg:hidden">{atajos('accesos')}</div>}

      {!buscandoTexto && pestana === 'todos' && (
        <div className="-mx-[17px] mt-3 flex gap-1.5 overflow-x-auto px-[17px] pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {GRUPOS.map((g) => (
            <button key={g.v} onClick={() => setGrupo(grupo === g.v ? null : g.v)} className={`chip h-8 shrink-0 text-[12.5px] ${grupo === g.v ? 'chip-on' : ''}`}>{g.t}</button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {!buscandoTexto && pestana === 'comidas' ? (
          <div className="flex flex-col gap-5">
            <section>
              <h2 className="titulo-tarjeta mb-2.5">{nombre} de ayer</h2>
              {deAyer.length ? (
                <div className="tarjeta" data-testid="lo-de-ayer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[15px] text-mu">{formatoNumero(sumar(deAyer).kcal)} kcal · {deAyer.length} alimentos</div>
                    <button className="btn h-10 px-4 text-[12.5px]" onClick={() => sumarItems(copiarItems(deAyer, nuevoId), `Repetiste ${nombre.toLowerCase()} de ayer`)}>
                      <Icono n="repetir" size={16} />Repetir
                    </button>
                  </div>
                  <ul className="mt-3 border-t border-ln2 pt-2 text-[15px]">
                    {deAyer.map((i) => <li key={i.id} className="flex justify-between gap-3 py-1"><span className="min-w-0 truncate">{i.nombre}</span><span className="shrink-0 text-mu">{formatoNumero(i.kcal)} kcal</span></li>)}
                  </ul>
                </div>
              ) : <p className="tarjeta py-5 text-center text-[15px] text-mu">Ayer no registraste {nombre.toLowerCase()}. En el Diario, "Repetir…" trae cualquier comida de otro día.</p>}
            </section>
            <section>
              <h2 className="titulo-tarjeta mb-2.5">Guardadas</h2>
              {guardadas.length ? (
                <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Comidas guardadas">
                  {guardadas.map((g) => {
                    const t = sumar(g.items);
                    return (
                      <li key={g.id} className="tarjeta" data-testid="guardada">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-display text-[18px] font-semibold">{g.nombre}</div>
                            <div className="text-[13.5px] text-mu">{formatoNumero(t.kcal)} kcal · {g.items.map((i) => i.nombre).join(', ')}</div>
                          </div>
                          <button className="btn h-10 shrink-0 px-4 text-[12.5px]" onClick={() => sumarItems(copiarItems(g.items, nuevoId), `"${g.nombre}" agregada`)}>Agregar</button>
                        </div>
                        <button className="mt-2 text-[12.5px] text-mu2 hover:text-miss" onClick={async () => {
                          await repo.borrarGuardada(usuario.uid, g.id);
                          setGuardadas((l) => l.filter((x) => x.id !== g.id));
                          aviso(`"${g.nombre}" borrada`);
                        }}>Borrar</button>
                      </li>
                    );
                  })}
                </ul>
              ) : <Vacio titulo="Comidas guardadas" linea='En el Diario, tocá "•••" en una comida y "Guardar como comida" (por ejemplo tu desayuno de siempre): la agregás de un toque cualquier día.' />}
            </section>
          </div>
        ) : (
          <>
            {!buscandoTexto && pestana === 'mios' && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <button className="btn-sec" onClick={() => setForm({ inicial: {} })}><Icono n="mas" size={20} />Crear alimento</button>
                <Link className="btn-sec" to="/receta"><Icono n="receta" size={20} />Crear receta</Link>
              </div>
            )}
            {!buscandoTexto && lista.length > 0 && (
              <h2 className="titulo-tarjeta mb-2.5">{pestana === 'recientes' ? 'Historial' : pestana === 'favoritos' ? 'Tus favoritos' : pestana === 'mios' ? 'Tus alimentos y recetas' : grupo ? GRUPOS.find((g) => g.v === grupo)?.t : 'Todos los alimentos'}</h2>
            )}
            {lista.length === 0 ? (
              pestana === 'mios' && !buscandoTexto ? (
                <Vacio titulo="Tus alimentos y recetas" linea="Cargá productos con su etiqueta (o escaneándolos) y las recetas de tu casa: quedan para la próxima." />
              ) : (
                <div className="tarjeta py-6 text-center text-[15px] text-mu">
                  {buscandoTexto ? <>No encontramos “{texto}”.</> : pestana === 'favoritos' ? 'Tocá la estrella de un alimento para tenerlo acá.' : 'Todavía no hay historial. Buscá un alimento arriba.'}
                  {buscandoTexto && <button className="mt-3 block w-full font-semibold oro" onClick={() => setForm({ inicial: { nombre: texto } })}>Crear “{texto}” como alimento propio →</button>}
                </div>
              )
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Alimentos">
                {lista.slice(0, 80).map((a) => {
                  const it = rapido(a);
                  return (
                    <li key={a.id} className="tarjeta flex items-center gap-2 py-0 pr-3 transition-colors hover:border-gold2">
                      <button className="min-w-0 flex-1 py-3.5 text-left" onClick={() => setElegido(a)} data-testid="alimento">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span className="truncate">{a.nombre}</span>
                          {a.verificado && <span className="shrink-0" style={{ color: 'var(--verde)' }} aria-label="Verificado"><Icono n="check" size={16} /></span>}
                          {favoritos.includes(a.id) && <Icono n="estrella" size={16} className="shrink-0 oro" />}
                        </span>
                        <span className="mt-0.5 block truncate text-[13.5px] text-mu">
                          <b className="font-semibold text-tx">{formatoNumero(it.kcal)} kcal</b>{a.marca ? ` · ${a.marca}` : ''} · {textoCantidad(it)}
                          {(a.propio || a.compartido) && <span className="ml-1.5 text-[11px] font-bold uppercase tracking-[.1em] acento">{a.receta ? 'receta' : a.codigo ? 'envasado' : 'propio'}</span>}
                        </span>
                      </button>
                      <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-goldbg oro transition-transform active:scale-95" aria-label={`Agregar ${a.nombre} ya`}
                        onClick={() => agregarElegido(a, it)}>
                        <Icono n="mas" size={22} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[12.5px] text-mu2 lg:hidden">Valores aproximados de tablas generales. {FUENTE_OFF}.</p>
      </div>

      {/* PC: a la derecha, lo que ya tiene esta comida y los atajos */}
      <aside className="hidden flex-col gap-4 lg:sticky lg:top-8 lg:mt-2 lg:flex">
        <section className="tarjeta" data-testid="en-esta-comida">
          <div className="flex items-baseline justify-between gap-2">
            <span className="etiqueta">En {nombre.toLowerCase()}</span>
            <span className="num text-[18px]">{formatoNumero(sumar(yaHay).kcal)}<span className="ml-1 font-sans text-[12.5px] text-mu">kcal</span></span>
          </div>
          {yaHay.length ? (
            <ul className="mt-2">
              {yaHay.map((i) => (
                <li key={i.id} className="fila last:border-0">
                  <span className="min-w-0 flex-1 py-1.5"><span className="block truncate text-[15px] font-semibold">{i.nombre}</span><span className="block text-[12.5px] text-mu">{textoCantidad(i)}</span></span>
                  <span className="shrink-0 text-right"><span className="num block text-[15px]">{formatoNumero(i.kcal)}</span><LineaMacros m={i} /></span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[15px] text-mu">Todavía nada. Tocá el "+" de un alimento y aparece acá.</p>}
        </section>
        {atajos('accesos-pc', true)}
        <p className="text-[12.5px] text-mu2">Valores aproximados de tablas generales. {FUENTE_OFF}.</p>
      </aside>
      </div>

      <Hoja abierta={rapida} alCerrar={() => setRapida(false)} etiqueta={nombre} titulo="Solo calorías">
        {rapida && <AdicionRapida alAgregar={async (it) => { setRapida(false); await sumarItems([it], `${it.nombre} agregado`); }} />}
      </Hoja>

      <Hoja abierta={escanear} alCerrar={() => setEscanear(false)} etiqueta={nombre} titulo="Escanear código de barras">
        {escanear && <Escaner alLeer={leerCodigo} />}
      </Hoja>

      <Hoja abierta={!!elegido} alCerrar={() => setElegido(null)} etiqueta={nombre} titulo={elegido?.nombre ?? ''}>
        {elegido && (
          <ElegirPorcion key={elegido.id} alimento={elegido} favorito={favoritos.includes(elegido.id)} alFavorito={() => alternarFavorito(elegido)}
            alEditar={elegido.propio || (elegido.compartido && productos.cargador) ? () => {
              const a = elegido;
              setElegido(null);
              if (a.receta) nav(`/receta?id=${encodeURIComponent(a.id)}`);
              else setForm({ inicial: etiquetaDe(a), editar: a, codigo: a.compartido ? a.codigo : undefined });
            } : undefined}
            alReportar={elegido.compartido && !productos.cargador ? () => { const a = elegido; setElegido(null); setReportar(a); } : undefined}
            fecha={fecha} alAgregar={(item, otros) => agregarElegido(elegido, item, otros)} />
        )}
      </Hoja>

      <Hoja abierta={!!form} alCerrar={() => setForm(null)} etiqueta={form?.codigo ? 'Producto envasado' : form?.editar ? 'Editar' : 'Alimento propio'}
        titulo={form?.editar ? (form.codigo ? 'Corregir producto' : form.editar.nombre) : form?.codigo ? 'Cargar producto' : 'Crear alimento'}>
        {form && (
          <>
            {form.aviso && <p className="mb-3 rounded-[12px] bg-acentobg p-3 text-[13.5px]" role="status" data-testid="aviso-codigo">{form.aviso}</p>}
            <FormEtiqueta key={form.editar?.id ?? form.codigo ?? 'nuevo'} inicial={form.inicial} codigoFijo={form.codigo}
              leerFoto={productos.leerFoto}
              textoGuardar={form.codigo ? (form.editar ? 'Guardar y verificar' : 'Guardar producto') : 'Guardar alimento'}
              alBorrar={form.editar && !form.codigo ? async () => {
                const id = form.editar!.id;
                await repo.borrarPropio(usuario.uid, id);
                setPropios((l) => l.filter((x) => x.id !== id));
                setForm(null);
                aviso('Alimento borrado');
              } : undefined}
              alGuardar={async (e, via) => {
                try {
                  if (form.codigo && form.editar) {
                    // Cargador corrigiendo un producto compartido
                    const a = await productos.corregir(form.codigo, e, via);
                    setCache(productosEnCache());
                    setForm(null);
                    aviso(`${a.nombre} quedó corregido y verificado`);
                    setElegido(a);
                  } else if (form.codigo) {
                    // Producto nuevo de la base compartida (el código es la llave)
                    const r = await productos.crear(e, via);
                    setCache(productosEnCache());
                    setForm(null);
                    aviso(r.creado ? `${r.alimento.nombre} quedó cargado para todos` : `Ese código ya estaba cargado: ${r.alimento.nombre}`);
                    setElegido(r.alimento);
                  } else {
                    const a = alimentoDeEtiqueta(form.editar?.id ?? 'p-' + nuevoId(), e);
                    await guardarPropio(a);
                    const editado = !!form.editar;
                    setForm(null);
                    setTexto('');
                    setPestana('mios');
                    aviso(editado ? `${a.nombre} quedó actualizado` : `${a.nombre} quedó guardado`);
                    if (!editado) setElegido(a);
                  }
                } catch (err) { aviso(mensajeError(err)); }
              }} />
          </>
        )}
      </Hoja>

      <Hoja abierta={!!reportar} alCerrar={() => setReportar(null)} etiqueta="Reportar error" titulo={reportar?.nombre ?? ''}>
        {reportar && (
          <Reportar alEnviar={async (motivo) => {
            const codigo = reportar.codigo ?? codigoDeId(reportar.id) ?? '';
            await repo.reportar({ id: nuevoId(), codigo, nombre: reportar.nombre, motivo, uid: usuario.uid, fecha: Date.now() });
            setReportar(null);
            aviso('Gracias: un cargador lo va a revisar');
          }} />
        )}
      </Hoja>

      <Celebracion visible={festejo} alCerrar={() => setFestejo(false)} titulo="Día en su medida"
        linea="Ni de menos ni de más. Así se construye la templanza." />
    </div>
  );
}

/** La comida que toca a esta hora, si la persona la tiene; si no, la primera de su lista */
function sugerirComida(ids: string[]): TipoComida {
  const h = new Date().getHours();
  const toca = h < 10 ? 'desayuno' : h < 15 ? 'almuerzo' : h < 19 ? 'merienda' : 'cena';
  return ids.includes(toca) ? toca : ids[0] ?? 'desayuno';
}

/** Sumar calorías (y si querés, macros) sin buscar el alimento */
function AdicionRapida({ alAgregar }: { alAgregar: (i: ItemComida) => void }) {
  const [nombre, setNombre] = useState('');
  const [v, setV] = useState({ kcal: '', prot: '', carb: '', gras: '' });
  const n = (s: string) => Math.max(0, Number(s.replace(',', '.')) || 0);
  const campo = (k: keyof typeof v, t: string) => (
    <label className="block min-w-0"><span className="etiqueta">{t}</span>
      <input className="campo mt-1.5" inputMode="decimal" value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value.replace(/[^0-9.,]/g, '') }))} aria-label={t} />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-mu">Para cuando sabés las calorías pero no querés buscar el alimento (una comida afuera, un antojo).</p>
      <label className="block"><span className="etiqueta">Qué fue (opcional)</span>
        <input className="campo mt-1.5" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: empanada en la feria" aria-label="Qué fue" />
      </label>
      {campo('kcal', 'Calorías')}
      <div className="grid grid-cols-3 gap-2">{campo('prot', 'Prot. (g)')}{campo('carb', 'Carb. (g)')}{campo('gras', 'Grasas (g)')}</div>
      <button className="btn w-full" disabled={!n(v.kcal)} onClick={() => alAgregar({
        id: nuevoId(), alimentoId: 'rapida', nombre: nombre.trim() || 'Adición rápida', cantidad: 1, porcion: 'rápida', gramos: 0,
        kcal: Math.round(n(v.kcal)), prot: n(v.prot), carb: n(v.carb), gras: n(v.gras),
      })}>Agregar {n(v.kcal) ? `${formatoNumero(n(v.kcal))} kcal` : ''}</button>
    </div>
  );
}

function Reportar({ alEnviar }: { alEnviar: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const rapidos = ['Las calorías no coinciden', 'La porción está mal', 'Es otro producto', 'El nombre está mal'];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-mu">Contanos qué está mal. Un cargador lo revisa y lo corrige para todos.</p>
      <div className="flex flex-wrap gap-1.5">
        {rapidos.map((r) => <button key={r} className={`chip ${motivo === r ? 'chip-on' : ''}`} onClick={() => setMotivo(r)}>{r}</button>)}
      </div>
      <textarea className="campo h-[90px] py-2" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Qué está mal" placeholder="Ej.: la etiqueta dice 132 kcal por porción" />
      <button className="btn w-full" disabled={!motivo.trim()} onClick={() => alEnviar(motivo.trim())}>Enviar reporte</button>
    </div>
  );
}
