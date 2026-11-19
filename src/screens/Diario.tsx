import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaCorta, fechaLarga, formatoNumero, nuevoId, semana, sumarDias } from '../lib/logica';
import { comidasDelDia, nombreComida, cantidadItems, copiarItems, diaCumplido, esSuelta, itemDe, metasDe, sumar } from '../lib/nutricion';
import type { Dia, ItemComida, Metas, TipoComida } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { LineaMacros, Vasos, textoCantidad } from '../ui/nutri';
import { Cargando, Hoja } from '../ui/piezas';
import { useCopiar, useDia } from '../ui/usarDia';
import { EditorComidas, useComidas } from '../ui/comidas';

/** Diario de comidas: un día a la vez, con todo lo registrado */
export default function Diario() {
  const { repo, usuario, perfil, aviso, cambiarPerfil } = useSesion();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const hoy = claveDia();
  const fecha = params.get('fecha') && params.get('fecha')! <= hoy ? params.get('fecha')! : hoy;
  const { dia, quitar, reemplazar, agua, agregar, sumarDia } = useDia(fecha);
  const copiarA = useCopiar();
  const [editar, setEditar] = useState<{ comida: TipoComida; item: ItemComida } | null>(null);
  const [copiar, setCopiar] = useState<TipoComida | null>(null);
  const [traer, setTraer] = useState<TipoComida | null>(null);
  const [menu, setMenu] = useState<TipoComida | null>(null);
  const [editarComidas, setEditarComidas] = useState(false);
  const lista = useComidas();
  const [guardarComo, setGuardarComo] = useState<TipoComida | null>(null);
  const [anterior, setAnterior] = useState<Dia | null>(null);

  useEffect(() => {
    setAnterior(null);
    repo.leerDia(usuario.uid, sumarDias(fecha, -1)).then(setAnterior).catch(() => undefined);
  }, [repo, usuario.uid, fecha]);
  const metas = metasDe(perfil);
  const ir = (f: string) => setParams(f === hoy ? {} : { fecha: f }, { replace: true });

  useEffect(() => {
    if (!dia || !loc.hash) return;
    document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [dia, loc.hash]);

  const cumplido = dia ? diaCumplido(dia, metas) : false;
  const nombre = (id: TipoComida) => nombreComida(lista, id);
  // En el celular van arriba; en la PC, en la columna de la derecha
  const restantes = (id: string) => dia && (
    <section className="tarjeta" data-testid={id}>
      <div className="etiqueta">Calorías restantes</div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start text-center">
        <div><div className="num text-[20px]">{formatoNumero(metas.kcal)}</div><div className="text-[12px] text-mu">Meta</div></div>
        <div className="num px-1 text-[20px] text-mu">−</div>
        <div><div className="num text-[20px]">{formatoNumero(dia.totales.kcal)}</div><div className="text-[12px] text-mu">Comido</div></div>
        <div className="num px-1 text-[20px] text-mu">=</div>
        <div><div className={`num text-[24px] ${metas.kcal - dia.totales.kcal < 0 ? 'text-miss' : 'oro'}`}>{formatoNumero(Math.abs(metas.kcal - dia.totales.kcal))}</div>
          <div className="text-[12px] text-mu">{metas.kcal - dia.totales.kcal < 0 ? 'De más' : 'Restan'}</div></div>
      </div>
    </section>
  );
  const repetir = (id: string) => dia && anterior && cantidadItems(anterior) > 0 && (
    <div className="tarjeta flex items-center gap-3" data-testid={id}>
      <Icono n="repetir" className="shrink-0 oro" />
      <span className="min-w-0 flex-1 text-[14px]">
        <b>Repetir el día anterior</b>
        <span className="block text-[13px] text-mu">{cantidadItems(anterior)} alimentos · {formatoNumero(anterior.totales.kcal)} kcal{cantidadItems(dia) > 0 ? ' · se suman a lo que ya tenés' : ''}</span>
      </span>
      <button className="btn h-10 shrink-0 px-4 text-[12px]" onClick={async () => { await sumarDia(anterior); aviso('Repetiste el día anterior'); }}>Repetir</button>
    </div>
  );
  return (
    <div className="pt-6 lg:pt-10">
      <CabeceraPagina etiqueta="Diario" titulo={fecha === hoy ? 'Hoy' : fecha === sumarDias(hoy, -1) ? 'Ayer' : <span className="first-letter:uppercase">{fechaLarga(fecha).split(',')[0]}</span>}
        linea={<span className="first-letter:uppercase">{fechaLarga(fecha)}</span>}
        accion={
          <div className="flex gap-1.5">
            <button className="btn-sec h-10 w-10 px-0" aria-label="Día anterior" onClick={() => ir(sumarDias(fecha, -1))}><Icono n="izq" size={18} /></button>
            <button className="btn-sec h-10 w-10 px-0" aria-label="Día siguiente" disabled={fecha >= hoy} onClick={() => ir(sumarDias(fecha, 1))}><Icono n="der" size={18} /></button>
          </div>
        } />

      <div className="mt-5 flex justify-between gap-1 lg:max-w-[520px]" aria-label="Elegir día">
        {semana(fecha).map((d) => (
          <button key={d.clave} disabled={d.clave > hoy} onClick={() => ir(d.clave)} aria-current={d.clave === fecha ? 'date' : undefined}
            className={`flex h-14 flex-1 flex-col items-center justify-center rounded-[12px] border text-[12px] transition-colors disabled:opacity-35 ${d.clave === fecha ? 'border-gold bg-sf oro' : 'border-transparent text-mu'}`}>
            <span className="font-bold">{d.letra}</span>
            <span className="num text-[16px]">{d.numero}</span>
            <span className={`mt-0.5 h-1 w-1 rounded-full ${perfil.resumen.cumplidos.includes(d.clave) ? 'bg-ok' : perfil.resumen.dias.includes(d.clave) ? 'bg-ln3' : 'bg-transparent'}`} style={perfil.resumen.cumplidos.includes(d.clave) ? { background: 'var(--verde)' } : undefined} />
          </button>
        ))}
      </div>

      {dia && <div className="mt-5 flex flex-col gap-4 lg:hidden">{restantes('restantes')}{repetir('repetir-dia')}</div>}

      {!dia ? <Cargando forma="pagina" /> : (
        <div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-4">
            {comidasDelDia(lista, dia).map((c) => {
              const items = dia.comidas[c.id] ?? [];
              const t = sumar(items);
              return (
                <section key={c.id} id={c.id} className="tarjeta scroll-mt-6 p-0" data-testid={`diario-${c.id}`}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-ln2 px-[18px] py-3.5">
                    <h2 className="font-display text-[21px] font-semibold">{c.nombre}</h2>
                    <span className="num text-[18px]">{formatoNumero(t.kcal)}<span className="ml-1 font-sans text-[12px] text-mu">kcal</span></span>
                  </div>
                  {items.length > 0 && (
                    <div className="px-[18px]">
                      {items.map((i) => (
                        <div key={i.id} className="fila last:border-0" data-testid="item-comida">
                          <button className="min-w-0 flex-1 py-2 text-left" onClick={() => setEditar({ comida: c.id, item: i })}>
                            <span className="block truncate font-semibold">{i.nombre}</span>
                            <span className="block text-[13px] text-mu">{textoCantidad(i)}</span>
                          </button>
                          <span className="shrink-0 text-right">
                            <span className="num block text-[16px]">{formatoNumero(i.kcal)}</span>
                            <LineaMacros m={i} />
                          </span>
                          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-mu2 hover:text-miss" aria-label={`Quitar ${i.nombre}`} onClick={() => quitar(c.id, i.id)}>
                            <Icono n="basura" size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex min-h-[54px] items-center border-t border-ln2 pl-[18px] pr-2">
                    <Link to={`/agregar?comida=${c.id}&fecha=${fecha}`} className="flex h-12 flex-1 items-center gap-2 text-[13px] font-bold uppercase tracking-[.1em] oro">
                      <Icono n="mas" size={18} />Agregar alimento
                    </Link>
                    <button className="flex h-11 w-11 items-center justify-center rounded-full text-mu hover:bg-sf2" aria-label={`Más opciones de ${c.nombre.toLowerCase()}`} onClick={() => setMenu(c.id)}>
                      <Icono n="puntos" size={22} className="rotate-90" />
                    </button>
                  </div>
                </section>
              );
            })}
            <button className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-dashed border-ln3 text-[13px] font-semibold text-mu hover:border-gold2 hover:text-tx" onClick={() => setEditarComidas(true)}>
              <Icono n="editar" size={16} />Editar comidas: nombres, orden, agregar o quitar
            </button>
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:gap-4">
            <div className="hidden flex-col gap-4 lg:flex">{restantes('restantes-pc')}{repetir('repetir-dia-pc')}</div>
            <Nutrientes dia={dia} metas={metas} cumplido={cumplido} comidas={comidasDelDia(lista, dia)} />
            <section className="tarjeta" data-testid="agua">
              <div className="etiqueta mb-3">Agua</div>
              <Vasos ml={dia.agua} meta={metas.agua} alCambiar={(ml) => agua(ml)} />
            </section>
          </aside>
        </div>
      )}

      <Hoja abierta={!!copiar} alCerrar={() => setCopiar(null)} etiqueta={copiar ? `${nombre(copiar)} · ${fechaCorta(fecha)}` : ''} titulo="Copiar a otro día">
        {copiar && dia && (
          <CopiarA origen={copiar} hoy={hoy} alCopiar={async (f, c) => {
            const items = dia.comidas[copiar] ?? [];
            if (f === fecha) await agregar(c, copiarItems(items, nuevoId));
            else await copiarA(f, c, items);
            setCopiar(null);
            aviso(`Copiado a ${nombre(c).toLowerCase()} del ${fechaCorta(f)}`);
          }} />
        )}
      </Hoja>

      <Hoja abierta={!!menu} alCerrar={() => setMenu(null)} etiqueta={menu ? `${nombre(menu)} · ${fechaCorta(fecha)}` : ''} titulo="Opciones">
        {menu && (
          <div className="-mx-1 flex flex-col">
            {([
              ['repetir', 'Repetir de otro día', 'Traé esta u otra comida de cualquier día', () => setTraer(menu), true],
              ['copiar', 'Copiar a otro día', 'Mandá lo que hay acá a otro día o comida', () => setCopiar(menu), (dia?.comidas[menu] ?? []).length > 0],
              ['guardar', 'Guardar como comida', 'Para agregarla de un toque cuando quieras', () => setGuardarComo(menu), (dia?.comidas[menu] ?? []).length > 0],
              ['editar', 'Cambiar nombre u orden', 'Renombrá, ordená, agregá o quitá comidas', () => setEditarComidas(true), true],
            ] as const).filter((o) => o[4]).map(([ic, t, l, f]) => (
              <button key={t} className="flex items-center gap-3 rounded-[12px] px-2 py-3 text-left hover:bg-sf2" onClick={() => { setMenu(null); f(); }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-goldbg oro"><Icono n={ic} size={18} /></span>
                <span className="min-w-0"><span className="block font-semibold">{t}</span><span className="block text-[13px] text-mu">{l}</span></span>
              </button>
            ))}
          </div>
        )}
      </Hoja>

      <Hoja abierta={editarComidas} alCerrar={() => setEditarComidas(false)} etiqueta="Tus comidas del día" titulo="Editar comidas">
        {editarComidas && <EditorComidas alGuardar={async (l) => { await cambiarPerfil({ comidas: l }); setEditarComidas(false); aviso('Tus comidas quedaron guardadas'); }} />}
      </Hoja>

      <Hoja abierta={!!traer} alCerrar={() => setTraer(null)} etiqueta={traer ? `${nombre(traer)} · ${fechaCorta(fecha)}` : ''} titulo="Repetir de otro día">
        {traer && (
          <TraerDe destino={traer} fecha={fecha} alTraer={async (items, desde) => {
            await agregar(traer, copiarItems(items, nuevoId));
            setTraer(null);
            aviso(`Repetiste ${items.length === 1 ? items[0].nombre : `${items.length} alimentos`} del ${fechaCorta(desde)}`);
          }} />
        )}
      </Hoja>

      <Hoja abierta={!!guardarComo} alCerrar={() => setGuardarComo(null)} etiqueta="Comida guardada" titulo="Guardar para repetir">
        {guardarComo && dia && (
          <GuardarComo sugerido={`Mi ${nombre(guardarComo).toLowerCase()} de siempre`} items={dia.comidas[guardarComo] ?? []} alGuardar={async (nombre) => {
            await repo.guardarGuardada(usuario.uid, { id: nuevoId(), nombre, items: copiarItems(dia.comidas[guardarComo] ?? [], nuevoId), creado: Date.now() });
            setGuardarComo(null);
            aviso(`"${nombre}" guardada: la encontrás en Agregar → Guardadas`);
          }} />
        )}
      </Hoja>

      <Hoja abierta={!!editar} alCerrar={() => setEditar(null)} etiqueta="Cambiar cantidad" titulo={editar?.item.nombre ?? ''}>
        {editar && <EditarItem item={editar.item} alGuardar={async (i) => { setEditar(null); await reemplazar(editar.comida, i); }}
          alQuitar={async () => { setEditar(null); await quitar(editar.comida, editar.item.id); }} />}
      </Hoja>
    </div>
  );
}

function EditarItem({ item, alGuardar, alQuitar }: { item: ItemComida; alGuardar: (i: ItemComida) => void; alQuitar: () => void }) {
  const { perfil } = useSesion();
  void perfil;
  const [cantidad, setCantidad] = useState(item.cantidad);
  const paso = esSuelta(item.porcion) ? 10 : 0.5;
  const a = buscarAlimento(item.alimentoId);
  // Si es un alimento propio (no está en la biblioteca) se escala con lo guardado
  const nuevo: ItemComida = a ? { ...itemDe(a, item.porcion, cantidad, item.id) } : {
    ...item, cantidad, gramos: Math.round((item.gramos / item.cantidad) * cantidad),
    kcal: Math.round((item.kcal / item.cantidad) * cantidad), prot: Math.round((item.prot / item.cantidad) * cantidad * 10) / 10,
    carb: Math.round((item.carb / item.cantidad) * cantidad * 10) / 10, gras: Math.round((item.gras / item.cantidad) * cantidad * 10) / 10,
  };
  return (
    <div>
      <div className="text-[14px] text-mu">{item.porcion}</div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button className="chip h-11 w-11" aria-label="Menos cantidad" onClick={() => setCantidad((c) => Math.max(paso === 10 ? 1 : 0.25, c - paso))}><Icono n="menos" size={16} /></button>
        <span className="num w-24 text-center text-[32px] oro">{formatoNumero(cantidad, 2)}{paso === 10 ? <span className="ml-1 text-[16px]">{item.porcion}</span> : null}</span>
        <button className="chip h-11 w-11" aria-label="Más cantidad" onClick={() => setCantidad((c) => c + paso)}><Icono n="mas" size={16} /></button>
      </div>
      <p className="mt-2 text-center text-[14px] text-mu">{formatoNumero(nuevo.gramos)} g · <b className="text-tx">{formatoNumero(nuevo.kcal)} kcal</b></p>
      <div className="mt-5 flex flex-col gap-2">
        <button className="btn" onClick={() => alGuardar(nuevo)}>Guardar</button>
        <button className="btn-sec text-miss" onClick={alQuitar}><Icono n="basura" size={16} />Quitar del diario</button>
      </div>
    </div>
  );
}

/** Elegir día y comida de destino */
function CopiarA({ origen, hoy, alCopiar }: { origen: TipoComida; hoy: string; alCopiar: (fecha: string, comida: TipoComida) => void }) {
  const lista = useComidas();
  const [destino, setDestino] = useState(hoy);
  const [comida, setComida] = useState<TipoComida>(origen);
  const rapidos: [string, string][] = [[sumarDias(hoy, -1), 'Ayer'], [hoy, 'Hoy'], [sumarDias(hoy, 1), 'Mañana']];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="etiqueta mb-2">Día</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Día de destino">
          {rapidos.map(([f, t]) => <button key={f} role="radio" aria-checked={destino === f} className={`chip ${destino === f ? 'chip-on' : ''}`} onClick={() => setDestino(f)}>{t}</button>)}
          <input type="date" className="campo h-8 w-auto rounded-full px-3 text-[13px]" value={destino} max={sumarDias(hoy, 7)} onChange={(e) => e.target.value && setDestino(e.target.value)} aria-label="Otra fecha" />
        </div>
      </div>
      <div>
        <div className="etiqueta mb-2">Comida</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Comida de destino">
          {lista.map((c) => <button key={c.id} role="radio" aria-checked={comida === c.id} className={`chip ${comida === c.id ? 'chip-on' : ''}`} onClick={() => setComida(c.id)}>{c.nombre}</button>)}
        </div>
      </div>
      <button className="btn w-full" onClick={() => alCopiar(destino, comida)}>Copiar a {nombreComida(lista, comida).toLowerCase()} · {fechaCorta(destino)}</button>
    </div>
  );
}

/**
 * Repetir una comida de cualquier día (el desayuno del martes, la cena de ayer al almuerzo de hoy…).
 * Los días con registros salen del resumen del perfil (0 lecturas); se lee solo el día elegido (1 lectura).
 */
function TraerDe({ destino, fecha, alTraer }: { destino: TipoComida; fecha: string; alTraer: (items: ItemComida[], desde: string) => void }) {
  const lista = useComidas();
  const { repo, usuario, perfil } = useSesion();
  const hoy = claveDia();
  const recientes = [...perfil.resumen.dias].filter((d) => d !== fecha && d <= hoy).sort().reverse().slice(0, 6);
  const [desde, setDesde] = useState(recientes[0] ?? sumarDias(fecha, -1));
  const [comida, setComida] = useState<TipoComida>(destino);
  const [dia, setDia] = useState<Dia | null | undefined>(undefined);
  const [fuera, setFuera] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    setDia(undefined);
    repo.leerDia(usuario.uid, desde).then((d) => vivo && setDia(d)).catch(() => vivo && setDia(null));
    return () => { vivo = false; };
  }, [repo, usuario.uid, desde]);
  useEffect(() => setFuera(new Set()), [desde, comida]);

  const items = dia?.comidas[comida] ?? [];
  const elegidos = items.filter((i) => !fuera.has(i.id));
  const nombreDia = (d: string) => (d === hoy ? 'Hoy' : d === sumarDias(hoy, -1) ? 'Ayer' : fechaCorta(d));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="etiqueta mb-2">De qué día</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Día de origen">
          {recientes.map((d) => <button key={d} role="radio" aria-checked={desde === d} className={`chip ${desde === d ? 'chip-on' : ''}`} onClick={() => setDesde(d)}>{nombreDia(d)}</button>)}
          <input type="date" className="campo h-8 w-auto rounded-full px-3 text-[13px]" value={desde} max={hoy} onChange={(e) => e.target.value && setDesde(e.target.value)} aria-label="Elegir otra fecha" />
        </div>
      </div>
      <div>
        <div className="etiqueta mb-2">Qué comida</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Comida de origen">
          {lista.map((c) => <button key={c.id} role="radio" aria-checked={comida === c.id} className={`chip ${comida === c.id ? 'chip-on' : ''}`} onClick={() => setComida(c.id)}>{c.nombre}</button>)}
        </div>
      </div>
      <div className="rounded-[12px] border border-ln2 px-3 py-1" data-testid="traer-lista">
        {dia === undefined ? <Cargando forma="linea" /> : items.length === 0 ? (
          <p className="py-3 text-[14px] text-mu">Ese día no tiene nada en {nombreComida(lista, comida).toLowerCase()}.</p>
        ) : items.map((i) => (
          <label key={i.id} className="fila cursor-pointer last:border-0">
            <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--gold)]" checked={!fuera.has(i.id)} aria-label={i.nombre}
              onChange={() => setFuera((s) => { const n = new Set(s); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; })} />
            <span className="min-w-0 flex-1 py-2">
              <span className="block truncate font-semibold">{i.nombre}</span>
              <span className="block text-[13px] text-mu">{textoCantidad(i)}</span>
            </span>
            <span className="num shrink-0 text-[15px]">{formatoNumero(i.kcal)}</span>
          </label>
        ))}
      </div>
      <button className="btn w-full" disabled={!elegidos.length} onClick={() => alTraer(elegidos, desde)}>
        {elegidos.length ? `Agregar a ${nombreComida(lista, destino).toLowerCase()} · ${formatoNumero(sumar(elegidos).kcal)} kcal` : 'Elegí al menos un alimento'}
      </button>
    </div>
  );
}

/**
 * Resumen del Diario, distinto del panel de Hoy: tabla de nutrientes (comido · meta · quedan)
 * y en qué comidas se fueron las calorías del día.
 */
function Nutrientes({ dia, metas, cumplido, comidas }: { dia: Dia; metas: Metas; cumplido: boolean; comidas: { id: string; nombre: string }[] }) {
  const filas = [['prot', 'Proteínas'], ['carb', 'Carbohidratos'], ['gras', 'Grasas']] as const;
  const porComida = comidas.map((c) => ({ ...c, kcal: sumar(dia.comidas[c.id] ?? []).kcal })).filter((c) => c.kcal > 0);
  const total = porComida.reduce((s, c) => s + c.kcal, 0);
  const tonos = [1, 0.75, 0.55, 0.4, 0.28, 0.85, 0.65, 0.48, 0.34, 0.22];
  return (
    <section className="tarjeta" data-testid="resumen-dia">
      <div className="flex items-center justify-between">
        <span className="etiqueta">Nutrientes del día</span>
        {cumplido && <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[.08em]" style={{ color: 'var(--verde)' }}><Icono n="check" size={14} />Cumplido</span>}
      </div>
      <table className="mt-3 w-full text-[14px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[.08em] text-mu">
            <th className="pb-1.5 text-left font-semibold" scope="col"><span className="sr-only">Nutriente</span></th>
            <th className="pb-1.5 text-right font-semibold" scope="col">Comido</th>
            <th className="pb-1.5 text-right font-semibold" scope="col">Meta</th>
            <th className="pb-1.5 text-right font-semibold" scope="col">Quedan</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([k, t]) => {
            const q = Math.round(metas[k] - dia.totales[k]);
            return (
              <tr key={k} className="border-t border-ln2">
                <th className="py-2 text-left font-semibold" scope="row"><span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: `var(--${k})` }} />{t}</th>
                <td className="num py-2 text-right text-[16px]">{formatoNumero(dia.totales[k])}</td>
                <td className="py-2 text-right text-mu">{formatoNumero(metas[k])} g</td>
                <td className={`py-2 text-right font-semibold ${q < 0 ? 'text-miss' : ''}`}>{q < 0 ? `+${formatoNumero(-q)}` : formatoNumero(q)} g</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 border-t border-ln2 pt-3">
        <div className="etiqueta mb-2">Calorías por comida</div>
        {total ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-ln2" aria-hidden>
              {porComida.map((c, i) => <div key={c.id} style={{ width: `${(c.kcal / total) * 100}%`, background: 'var(--gold)', opacity: tonos[i % tonos.length] }} className="border-r border-sf last:border-0" />)}
            </div>
            <ul className="mt-2.5 flex flex-col gap-1 text-[13px]" data-testid="por-comida">
              {porComida.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'var(--gold)', opacity: tonos[i % tonos.length] }} />
                  <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                  <span className="num">{formatoNumero(c.kcal)}</span>
                  <span className="w-10 text-right text-mu">{Math.round((c.kcal / total) * 100)} %</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-[13px] text-mu">Cuando registres algo, acá ves en qué comidas se reparten tus calorías.</p>}
      </div>
    </section>
  );
}

/** Nombre para una comida guardada */
function GuardarComo({ sugerido, items, alGuardar }: { sugerido: string; items: ItemComida[]; alGuardar: (nombre: string) => void }) {
  const [nombre, setNombre] = useState(sugerido);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-mu">{items.map((i) => i.nombre).join(', ')} · {formatoNumero(sumar(items).kcal)} kcal</p>
      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre de la comida guardada" />
      </label>
      <button className="btn w-full" disabled={!nombre.trim()} onClick={() => alGuardar(nombre.trim())}>Guardar</button>
    </div>
  );
}
