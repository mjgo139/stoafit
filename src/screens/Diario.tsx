import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaCorta, fechaLarga, formatoNumero, nuevoId, semana, sumarDias } from '../lib/logica';
import { COMIDAS, NOMBRE_COMIDA, cantidadItems, copiarItems, diaCumplido, esSuelta, itemDe, metasDe, sumar } from '../lib/nutricion';
import type { Dia, ItemComida, TipoComida } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina, Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Anillo, LineaMacros, Macros3, Vasos, textoCantidad } from '../ui/nutri';
import { Cargando, Hoja } from '../ui/piezas';
import { useCopiar, useDia } from '../ui/usarDia';

/** Diario de comidas: un día a la vez, con todo lo registrado */
export default function Diario() {
  const { repo, usuario, perfil, aviso } = useSesion();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const hoy = claveDia();
  const fecha = params.get('fecha') && params.get('fecha')! <= hoy ? params.get('fecha')! : hoy;
  const { dia, quitar, reemplazar, agua, agregar, sumarDia } = useDia(fecha);
  const copiarA = useCopiar();
  const [editar, setEditar] = useState<{ comida: TipoComida; item: ItemComida } | null>(null);
  const [copiar, setCopiar] = useState<TipoComida | null>(null);
  const [traer, setTraer] = useState<TipoComida | null>(null);
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

      {dia && anterior && cantidadItems(anterior) > 0 && (
        <div className="tarjeta mt-5 flex items-center gap-3" data-testid="repetir-dia">
          <Icono n="repetir" className="shrink-0 oro" />
          <span className="min-w-0 flex-1 text-[14px]">
            <b>Repetir el día anterior</b>
            <span className="block text-[13px] text-mu">{cantidadItems(anterior)} alimentos · {formatoNumero(anterior.totales.kcal)} kcal{cantidadItems(dia) > 0 ? ' · se suman a lo que ya tenés' : ''}</span>
          </span>
          <button className="btn h-10 shrink-0 px-4 text-[12px]" onClick={async () => { await sumarDia(anterior); aviso('Repetiste el día anterior'); }}>Repetir</button>
        </div>
      )}

      {!dia ? <Cargando forma="pagina" /> : (
        <div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-6">
            {COMIDAS.map((c, n) => {
              const items = dia.comidas[c.id] ?? [];
              const t = sumar(items);
              return (
                <section key={c.id} id={c.id} className="scroll-mt-6" data-testid={`diario-${c.id}`}>
                  <Grupo n={n + 1} className="mb-2.5" extra={<span className="text-[13px] text-mu">{formatoNumero(t.kcal)} kcal</span>}>{c.nombre}</Grupo>
                  <div className="tarjeta py-1">
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
                    <div className={`flex min-h-[52px] flex-wrap items-center gap-2 py-2 ${items.length ? 'border-t border-ln2' : ''}`}>
                      <Link to={`/agregar?comida=${c.id}&fecha=${fecha}`} className="flex flex-1 items-center gap-2 text-[14px] font-semibold oro">
                        <Icono n="mas" size={18} />Agregar
                      </Link>
                      <button className="chip h-8 px-2.5 text-[12px]" onClick={() => setTraer(c.id)} aria-label={`Repetir ${c.nombre.toLowerCase()} de otro día`}><Icono n="repetir" size={14} />Repetir…</button>
                      {items.length > 0 && (
                        <>
                          <button className="chip h-8 px-2.5 text-[12px]" onClick={() => setCopiar(c.id)} aria-label={`Copiar ${c.nombre.toLowerCase()} a otro día`}><Icono n="copiar" size={14} /><span className="hidden lg:inline">Copiar</span></button>
                          <button className="chip h-8 px-2.5 text-[12px]" onClick={() => setGuardarComo(c.id)} aria-label={`Guardar ${c.nombre.toLowerCase()} como comida`}><Icono n="guardar" size={14} /><span className="hidden lg:inline">Guardar</span></button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
            <section className="tarjeta" data-testid="resumen-dia">
              <div className="flex items-center justify-between">
                <span className="etiqueta">Resumen del día</span>
                {cumplido && <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[.08em]" style={{ color: 'var(--verde)' }}><Icono n="check" size={14} />Cumplido</span>}
              </div>
              <div className="mt-3 flex items-center gap-4">
                <Anillo valor={dia.totales.kcal} meta={metas.kcal} tam={112} />
                <div className="min-w-0 flex-1 text-[13px] text-mu">
                  <div><b className="num text-[20px] text-tx">{formatoNumero(dia.totales.kcal)}</b> kcal</div>
                  <div>Meta: {formatoNumero(metas.kcal)} kcal</div>
                </div>
              </div>
              <div className="mt-4"><Macros3 t={dia.totales} metas={metas} /></div>
            </section>
            <section className="tarjeta">
              <div className="etiqueta mb-3">Agua</div>
              <Vasos ml={dia.agua} meta={metas.agua} alCambiar={(ml) => agua(ml)} />
            </section>
          </aside>
        </div>
      )}

      <Hoja abierta={!!copiar} alCerrar={() => setCopiar(null)} etiqueta={copiar ? `${NOMBRE_COMIDA[copiar]} · ${fechaCorta(fecha)}` : ''} titulo="Copiar a otro día">
        {copiar && dia && (
          <CopiarA origen={copiar} hoy={hoy} alCopiar={async (f, c) => {
            const items = dia.comidas[copiar] ?? [];
            if (f === fecha) await agregar(c, copiarItems(items, nuevoId));
            else await copiarA(f, c, items);
            setCopiar(null);
            aviso(`Copiado a ${NOMBRE_COMIDA[c].toLowerCase()} del ${fechaCorta(f)}`);
          }} />
        )}
      </Hoja>

      <Hoja abierta={!!traer} alCerrar={() => setTraer(null)} etiqueta={traer ? `${NOMBRE_COMIDA[traer]} · ${fechaCorta(fecha)}` : ''} titulo="Repetir de otro día">
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
          <GuardarComo sugerido={`Mi ${NOMBRE_COMIDA[guardarComo].toLowerCase()} de siempre`} items={dia.comidas[guardarComo] ?? []} alGuardar={async (nombre) => {
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
          {COMIDAS.map((c) => <button key={c.id} role="radio" aria-checked={comida === c.id} className={`chip ${comida === c.id ? 'chip-on' : ''}`} onClick={() => setComida(c.id)}>{c.nombre}</button>)}
        </div>
      </div>
      <button className="btn w-full" onClick={() => alCopiar(destino, comida)}>Copiar a {NOMBRE_COMIDA[comida].toLowerCase()} · {fechaCorta(destino)}</button>
    </div>
  );
}

/**
 * Repetir una comida de cualquier día (el desayuno del martes, la cena de ayer al almuerzo de hoy…).
 * Los días con registros salen del resumen del perfil (0 lecturas); se lee solo el día elegido (1 lectura).
 */
function TraerDe({ destino, fecha, alTraer }: { destino: TipoComida; fecha: string; alTraer: (items: ItemComida[], desde: string) => void }) {
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
          {COMIDAS.map((c) => <button key={c.id} role="radio" aria-checked={comida === c.id} className={`chip ${comida === c.id ? 'chip-on' : ''}`} onClick={() => setComida(c.id)}>{c.nombre}</button>)}
        </div>
      </div>
      <div className="rounded-[12px] border border-ln2 px-3 py-1" data-testid="traer-lista">
        {dia === undefined ? <Cargando forma="linea" /> : items.length === 0 ? (
          <p className="py-3 text-[14px] text-mu">Ese día no tiene nada en {NOMBRE_COMIDA[comida].toLowerCase()}.</p>
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
        {elegidos.length ? `Agregar a ${NOMBRE_COMIDA[destino].toLowerCase()} · ${formatoNumero(sumar(elegidos).kcal)} kcal` : 'Elegí al menos un alimento'}
      </button>
    </div>
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
