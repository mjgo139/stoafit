import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claveDia, formatoNumero, nuevoId } from '../lib/logica';
import { ACTIVIDADES, COMIDAS, OBJETIVOS, nombreComida, repartoDe, basal, calcularMetas, datosDelPerfil, gastoTotal, metasDe, reparto } from '../lib/nutricion';
import { PLANTILLAS, itemsDePlantilla, totalesPlantilla, type Plantilla } from '../lib/plantillas';
import type { ItemComida, Metas, Plan as TPlan, RegistroCuerpo, TipoComida } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina, Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { LineaMacros, textoCantidad } from '../ui/nutri';
import { Cargando, Hoja } from '../ui/piezas';
import { useDia } from '../ui/usarDia';
import { useComidas } from '../ui/comidas';

/** Plan: la meta diaria (calculada o a mano), días de ejemplo y planes propios o de su nutricionista */
export default function Plan() {
  const { repo, usuario, perfil, cambiarPerfil, aviso } = useSesion();
  const [cuerpo, setCuerpo] = useState<RegistroCuerpo[] | null>(null);
  const [planes, setPlanes] = useState<TPlan[] | null>(null);
  const [editarMeta, setEditarMeta] = useState(false);
  const [verPlantilla, setVerPlantilla] = useState<Plantilla | null>(null);
  const [editarPlan, setEditarPlan] = useState<TPlan | null>(null);
  const hoy = useDia(claveDia());
  const metas = metasDe(perfil);
  const lista = useComidas();
  const orden = (id: string) => { const i = lista.findIndex((c) => c.id === id); return i < 0 ? 99 : i; };

  useEffect(() => {
    repo.leerCuerpo(usuario.uid).then(setCuerpo).catch(() => setCuerpo([]));
    repo.leerPlanes(usuario.uid).then(setPlanes).catch(() => setPlanes([]));
  }, [repo, usuario.uid]);

  const peso = cuerpo ? [...cuerpo].reverse().find((r) => r.peso)?.peso : undefined;
  const datos = datosDelPerfil(perfil, peso);
  const pct = reparto(metas);

  async function recalcular() {
    if (!datos) return;
    await cambiarPerfil({ metas: calcularMetas(datos), metasManual: false });
    aviso('Meta recalculada con tu peso actual');
  }

  async function cargarPlantilla(p: Plantilla) {
    const nuevos = itemsDePlantilla(p, nuevoId);
    const d = hoy.dia;
    const comidas = { ...(d?.comidas ?? {}) };
    // Si la persona cambió sus comidas, cada una del ejemplo va a la suya en la misma posición
    const destino = (c: TipoComida) => lista.some((x) => x.id === c) ? c
      : lista[Math.min(lista.length - 1, Math.round((COMIDAS.findIndex((x) => x.id === c) / (COMIDAS.length - 1)) * (lista.length - 1)))].id;
    for (const [c, l] of Object.entries(nuevos) as [TipoComida, ItemComida[]][]) { const k = destino(c); comidas[k] = [...(comidas[k] ?? []), ...l]; }
    await hoy.reemplazarComidas(comidas);
    setVerPlantilla(null);
    aviso(`"${p.nombre}" quedó cargado en tu diario de hoy`);
  }

  return (
    <div className="pt-6 lg:pt-10">
      <CabeceraPagina etiqueta="Plan" titulo="Tu medida" linea="Cuánto te conviene comer y cómo repartirlo en el día." />

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-6">
        <section>
          <Grupo n={1} className="mb-3" extra={<button className="text-[13.5px] font-semibold oro" onClick={() => setEditarMeta(true)}>Editar</button>}>Meta diaria</Grupo>
          <div className="panel-dia" data-testid="meta-diaria">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="etiqueta">Calorías por día</div>
                <div className="num mt-1 text-[48px] leading-none oro">{formatoNumero(metas.kcal)}</div>
              </div>
              <span className="ficha">{perfil.metasManual ? 'Ajustada a mano' : perfil.metas ? 'Calculada' : 'General'}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {([['Proteínas', metas.prot, pct.prot, 'var(--prot)'], ['Carbohidratos', metas.carb, pct.carb, 'var(--carb)'], ['Grasas', metas.gras, pct.gras, 'var(--gras)']] as const).map(([t, g, p, c]) => (
                <div key={t} className="rounded-[12px] border border-ln2 p-3 text-center">
                  <div className="num text-[22px]" style={{ color: c }}>{g} g</div>
                  <div className="text-[12.5px] text-mu">{t}<span className="block">{p} %</span></div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[15px] text-mu"><Icono n="agua" size={20} className="acento" />Agua: <b className="text-tx">{formatoNumero(metas.agua / 1000, 2)} L</b> ({metas.agua / 250} vasos)</div>
            {datos ? (
              <p className="mt-4 border-t border-ln2 pt-3 text-[13.5px] text-mu">
                Basal (Mifflin-St Jeor): <b className="text-tx">{formatoNumero(basal(datos))} kcal</b> · con actividad {ACTIVIDADES.find((a) => a.v === datos.actividad)?.t.toLowerCase()}: <b className="text-tx">{formatoNumero(gastoTotal(datos))} kcal</b> · objetivo: {OBJETIVOS.find((o) => o.v === datos.objetivo)?.t.toLowerCase()}.
              </p>
            ) : <p className="mt-4 border-t border-ln2 pt-3 text-[13.5px] text-mu">Completá tus datos para una meta a tu medida.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/conocerte?editar=1" className="btn-sec h-10 text-[13.5px]">Cambiar mis datos</Link>
              {datos && perfil.metasManual && <button className="btn-sec h-10 text-[13.5px]" onClick={recalcular}>Volver a la calculada</button>}
            </div>
          </div>
        </section>

        <section>
          <Grupo n={2} className="mb-3">Reparto del día</Grupo>
          <div className="tarjeta lg:h-[calc(100%-36px)]">
            <ul className="flex flex-col">
              {lista.map((c) => (
                <li key={c.id} className="fila last:border-0">
                  <span className="flex-1"><b>{c.nombre}</b><span className="block text-[12.5px] text-mu">{COMIDAS.find((x) => x.id === c.id)?.hora ?? 'A tu hora'}</span></span>
                  <span className="text-right"><span className="num text-[18px]">{formatoNumero(Math.round(metas.kcal * repartoDe(lista)[c.id] / 10) * 10)}</span> <span className="text-[12.5px] text-mu">kcal</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12.5px] text-mu2">Es una guía: lo que importa es el total del día.</p>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <Grupo n={3} className="mb-3">Días de ejemplo</Grupo>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {PLANTILLAS.map((p) => {
            const t = totalesPlantilla(p);
            return (
              <button key={p.id} className="tarjeta flex h-full flex-col text-left transition-colors hover:border-gold2" onClick={() => setVerPlantilla(p)} data-testid="plantilla">
                <span className="font-display text-[20px] font-semibold">{p.nombre}</span>
                <span className="mt-0.5 text-[13.5px] text-mu">{p.linea}</span>
                <span className="mt-auto flex items-end justify-between pt-3">
                  <span><span className="num text-[26px] oro">{formatoNumero(t.kcal)}</span> <span className="text-[12.5px] text-mu">kcal</span></span>
                  <LineaMacros m={t} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <Grupo n={4} className="mb-3" extra={<button className="text-[13.5px] font-semibold oro" onClick={() => setEditarPlan({ id: nuevoId(), nombre: '', comidas: {}, creado: Date.now() })}>+ Nuevo</button>}>Mis planes</Grupo>
        {!planes ? <Cargando /> : planes.length === 0 ? (
          <p className="tarjeta py-6 text-center text-[15px] text-mu">Anotá tu propio plan: qué comer en cada comida. Si tenés nutricionista, sus planes aparecen acá.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {planes.map((p) => (
              <li key={p.id} className="tarjeta" data-testid="plan">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.asignadaPor && <div className="etiqueta acento">De tu nutricionista · {p.nombreAsignador}</div>}
                    <div className="font-display text-[20px] font-semibold">{p.nombre}</div>
                    {p.descripcion && <p className="text-[13.5px] text-mu">{p.descripcion}</p>}
                  </div>
                  {!p.asignadaPor && <button className="chip h-8 shrink-0 px-2.5 text-[12.5px]" onClick={() => setEditarPlan(p)}><Icono n="editar" size={16} />Editar</button>}
                </div>
                <dl className="mt-3 flex flex-col gap-2 text-[15px]">
                  {Object.entries(p.comidas).filter(([, v]) => v).sort(([a], [b]) => orden(a) - orden(b)).map(([id, v]) => (
                    <div key={id}><dt className="etiqueta">{nombreComida(lista, id)}</dt><dd className="mt-0.5">{v}</dd></div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hoja abierta={editarMeta} alCerrar={() => setEditarMeta(false)} etiqueta="Meta diaria" titulo="Ajustar a mano">
        <EditarMeta inicial={metas} alGuardar={async (m) => { await cambiarPerfil({ metas: m, metasManual: true }); setEditarMeta(false); aviso('Meta guardada'); }} />
      </Hoja>

      <Hoja abierta={!!verPlantilla} alCerrar={() => setVerPlantilla(null)} etiqueta="Día de ejemplo" titulo={verPlantilla?.nombre ?? ''}>
        {verPlantilla && (
          <div>
            {(Object.entries(itemsDePlantilla(verPlantilla, nuevoId)) as [TipoComida, ItemComida[]][]).map(([c, l]) => (
              <div key={c} className="mb-3">
                <div className="etiqueta">{nombreComida(lista, c)}</div>
                <ul className="mt-1 text-[15px]">
                  {l.map((i) => <li key={i.id} className="flex justify-between gap-2 py-0.5"><span>{i.nombre} <span className="text-mu">· {textoCantidad(i)}</span></span><span className="shrink-0 text-mu">{formatoNumero(i.kcal)}</span></li>)}
                </ul>
              </div>
            ))}
            <button className="btn mt-3 w-full" onClick={() => cargarPlantilla(verPlantilla)}>Sumar a mi diario de hoy</button>
          </div>
        )}
      </Hoja>

      <Hoja abierta={!!editarPlan} alCerrar={() => setEditarPlan(null)} etiqueta="Plan propio" titulo={editarPlan?.nombre || 'Nuevo plan'}>
        {editarPlan && (
          <EditarPlan plan={editarPlan}
            alGuardar={async (p) => { await repo.guardarPlan(usuario.uid, p); setPlanes((l) => [p, ...(l ?? []).filter((x) => x.id !== p.id)]); setEditarPlan(null); aviso('Plan guardado'); }}
            alBorrar={planes?.some((x) => x.id === editarPlan.id) ? async () => { await repo.borrarPlan(usuario.uid, editarPlan.id); setPlanes((l) => (l ?? []).filter((x) => x.id !== editarPlan.id)); setEditarPlan(null); aviso('Plan borrado'); } : undefined} />
        )}
      </Hoja>
    </div>
  );
}

function EditarMeta({ inicial, alGuardar }: { inicial: Metas; alGuardar: (m: Metas) => void }) {
  const [m, setM] = useState(inicial);
  const campo = (k: keyof Metas, t: string, u: string) => (
    <label className="block"><span className="etiqueta">{t}</span>
      <span className="relative mt-1.5 block">
        <input className="campo pr-12" inputMode="numeric" value={m[k] || ''} aria-label={t}
          onChange={(e) => setM({ ...m, [k]: Math.max(0, Math.min(k === 'agua' ? 8000 : 9000, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13.5px] text-mu">{u}</span>
      </span>
    </label>
  );
  const desde = m.prot * 4 + m.carb * 4 + m.gras * 9;
  return (
    <div className="flex flex-col gap-3">
      {campo('kcal', 'Calorías', 'kcal')}
      <div className="grid grid-cols-3 gap-2">{campo('prot', 'Proteínas', 'g')}{campo('carb', 'Carbohidratos', 'g')}{campo('gras', 'Grasas', 'g')}</div>
      {campo('agua', 'Agua', 'ml')}
      <p className="text-[13.5px] text-mu">Los macros suman <b className="text-tx">{formatoNumero(desde)} kcal</b>{Math.abs(desde - m.kcal) > m.kcal * 0.08 ? ' · conviene que se parezcan a las calorías.' : '.'}</p>
      <button className="btn w-full" disabled={m.kcal < 800} onClick={() => alGuardar(m)}>Guardar meta</button>
    </div>
  );
}

function EditarPlan({ plan, alGuardar, alBorrar }: { plan: TPlan; alGuardar: (p: TPlan) => void; alBorrar?: () => void }) {
  const [p, setP] = useState(plan);
  const lista = useComidas();
  return (
    <div className="flex flex-col gap-3">
      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value.slice(0, 80) })} aria-label="Nombre del plan" placeholder="Ej.: Semana liviana" />
      </label>
      {lista.map((c) => (
        <label key={c.id} className="block"><span className="etiqueta">{c.nombre}</span>
          <textarea className="campo mt-1.5 h-[68px] py-2" value={p.comidas[c.id] ?? ''} maxLength={400} aria-label={`Plan para ${c.nombre}`}
            onChange={(e) => setP({ ...p, comidas: { ...p.comidas, [c.id]: e.target.value } })} />
        </label>
      ))}
      <button className="btn w-full" disabled={!p.nombre.trim()} onClick={() => alGuardar({ ...p, nombre: p.nombre.trim(), comidas: Object.fromEntries(Object.entries(p.comidas).filter(([, v]) => v?.trim())) })}>Guardar plan</button>
      {alBorrar && <button className="btn-sec text-miss" onClick={alBorrar}><Icono n="basura" size={16} />Borrar plan</button>}
    </div>
  );
}
