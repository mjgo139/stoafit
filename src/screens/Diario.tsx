import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { buscarAlimento } from '../lib/alimentos';
import { claveDia, fechaLarga, formatoNumero, semana, sumarDias } from '../lib/logica';
import { COMIDAS, diaCumplido, itemDe, metasDe, sumar } from '../lib/nutricion';
import type { ItemComida, TipoComida } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina, Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Anillo, LineaMacros, Macros3, Vasos, textoCantidad } from '../ui/nutri';
import { Cargando, Hoja } from '../ui/piezas';
import { useDia } from '../ui/usarDia';

/** Diario de comidas: un día a la vez, con todo lo registrado */
export default function Diario() {
  const { perfil } = useSesion();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const hoy = claveDia();
  const fecha = params.get('fecha') && params.get('fecha')! <= hoy ? params.get('fecha')! : hoy;
  const { dia, quitar, reemplazar, agua } = useDia(fecha);
  const [editar, setEditar] = useState<{ comida: TipoComida; item: ItemComida } | null>(null);
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
                    <Link to={`/agregar?comida=${c.id}&fecha=${fecha}`} className={`flex min-h-[52px] items-center gap-2 text-[14px] font-semibold oro ${items.length ? 'border-t border-ln2' : ''}`}>
                      <Icono n="mas" size={18} />Agregar a {c.nombre.toLowerCase()}
                    </Link>
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
        <button className="chip h-11 w-11" aria-label="Menos cantidad" onClick={() => setCantidad((c) => Math.max(0.25, c - 0.5))}><Icono n="menos" size={16} /></button>
        <span className="num w-20 text-center text-[32px] oro">{formatoNumero(cantidad, 2)}</span>
        <button className="chip h-11 w-11" aria-label="Más cantidad" onClick={() => setCantidad((c) => c + 0.5)}><Icono n="mas" size={16} /></button>
      </div>
      <p className="mt-2 text-center text-[14px] text-mu">{formatoNumero(nuevo.gramos)} g · <b className="text-tx">{formatoNumero(nuevo.kcal)} kcal</b></p>
      <div className="mt-5 flex flex-col gap-2">
        <button className="btn" onClick={() => alGuardar(nuevo)}>Guardar</button>
        <button className="btn-sec text-miss" onClick={alQuitar}><Icono n="basura" size={16} />Quitar del diario</button>
      </div>
    </div>
  );
}
