import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aKg, aUnidad, claveDia, fechaCorta, fechaDeClave, formatoNumero, hastaHoy, racha, sumarDias } from '../lib/logica';
import { cantidadItems, diaCumplido, metasDe, promedio, reparto } from '../lib/nutricion';
import type { Dia, RegistroCuerpo } from '../lib/tipos';
import { useSesion } from '../ui/contexto';
import { CabeceraPagina, Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Cargando, GraficoBarras, GraficoLinea, Hoja, Selector } from '../ui/piezas';

type Medida = 'peso' | 'cintura' | 'cadera' | 'brazo' | 'muslo';
const MEDIDAS: { v: Medida; t: string }[] = [
  { v: 'peso', t: 'Peso' }, { v: 'cintura', t: 'Cintura' }, { v: 'cadera', t: 'Cadera' }, { v: 'brazo', t: 'Brazo' }, { v: 'muslo', t: 'Muslo' },
];

/** Progreso: peso y medidas, semanas cumplidas, promedios de macros e historial */
export default function Progreso() {
  const { repo, usuario, perfil, aviso } = useSesion();
  const [cuerpo, setCuerpo] = useState<RegistroCuerpo[] | null>(null);
  const [dias, setDias] = useState<Dia[] | null>(null);
  const [medida, setMedida] = useState<Medida>('peso');
  const [rango, setRango] = useState<'7' | '30'>('7');
  const [registrar, setRegistrar] = useState(false);
  const [cuantos, setCuantos] = useState(14);
  const hoy = claveDia();
  const cumplidosHasta = hastaHoy(perfil.resumen.cumplidos, hoy);
  const diasHasta = hastaHoy(perfil.resumen.dias, hoy);
  const u = perfil.unidad;
  const metas = metasDe(perfil);

  useEffect(() => {
    repo.leerCuerpo(usuario.uid).then(setCuerpo).catch(() => setCuerpo([]));
    repo.leerDias(usuario.uid, sumarDias(hoy, -55), hoy).then(setDias).catch(() => setDias([]));
  }, [repo, usuario.uid, hoy]);

  const pesos = (cuerpo ?? []).filter((r) => r.peso);
  const actual = pesos.at(-1)?.peso;
  const inicial = pesos[0]?.peso;
  const puntos = (cuerpo ?? []).filter((r) => typeof r[medida] === 'number').map((r) => ({ x: r.fecha, y: medida === 'peso' ? aUnidad(r[medida]!, u) : r[medida]! }));

  // 8 semanas, de lunes a domingo
  const lunes = sumarDias(hoy, -((fechaDeClave(hoy).getDay() + 6) % 7));
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const desde = sumarDias(lunes, -(7 - i) * 7 + 7);
    const claves = Array.from({ length: 7 }, (_, k) => sumarDias(desde, k));
    return { fecha: +fechaDeClave(desde), y: claves.filter((c) => cumplidosHasta.includes(c)).length, registrados: claves.filter((c) => diasHasta.includes(c)).length };
  });

  const enRango = (dias ?? []).filter((d) => d.fecha > sumarDias(hoy, -Number(rango)));
  const prom = promedio(enRango);
  const pct = reparto(prom);
  const historial = [...(dias ?? [])].filter((d) => cantidadItems(d) > 0).reverse();

  return (
    <div className="pt-6 lg:pt-10">
      <CabeceraPagina etiqueta="Progreso" titulo="Tu camino" linea="Lo que se mide, se puede mejorar."
        accion={<button className="btn h-11 px-4 text-[12px]" onClick={() => setRegistrar(true)}><Icono n="balanza" size={17} />Registrar</button>} />

      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="resumen-progreso">
        <Dato t="Peso actual" v={actual ? `${formatoNumero(aUnidad(actual, u), 1)} ${u}` : '—'} />
        <Dato t="Desde el inicio" v={actual && inicial ? `${actual - inicial > 0 ? '+' : ''}${formatoNumero(aUnidad(actual - inicial, u), 1)} ${u}` : '—'} />
        <Dato t="Días cumplidos" v={formatoNumero(cumplidosHasta.length)} />
        <Dato t="Racha" v={`${racha(cumplidosHasta, hoy)} días`} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-6">
        <section>
          <Grupo n={1} className="mb-3">Peso y medidas</Grupo>
          <div className="tarjeta lg:min-h-[330px]" data-testid="grafico-peso">
            <div className="-mx-1 overflow-x-auto px-1"><Selector nombre="Medida" valor={medida} alCambiar={setMedida} opciones={MEDIDAS.map((m) => ({ v: m.v, t: m.t }))} /></div>
            <div className="mt-4">
              {!cuerpo ? <Cargando forma="tarjeta" /> : (
                <GraficoLinea puntos={puntos} etiqueta={`Evolución de ${medida}`} formato={(n) => `${formatoNumero(n, 1)} ${medida === 'peso' ? u : 'cm'}`} />
              )}
            </div>
          </div>
        </section>

        <section>
          <Grupo n={2} className="mb-3">Cumplimiento por semana</Grupo>
          <div className="tarjeta lg:min-h-[330px]" data-testid="semanas">
            <GraficoBarras datos={semanas.map(({ fecha, y }) => ({ fecha, y }))} etiqueta="Días cumplidos por semana" formato={(n) => `${n} días`} formatoCorto={(n) => String(Math.round(n))}
              detalle={(i) => <span>Semana del <b>{fechaCorta(semanas[i].fecha)}</b>: <b className="oro">{semanas[i].y}/7</b> días cumplidos · {semanas[i].registrados} con registros</span>} />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <Grupo n={3} className="mb-3" extra={<div className="w-[180px]"><Selector nombre="Período" valor={rango} alCambiar={setRango} opciones={[{ v: '7', t: '7 días' }, { v: '30', t: '30 días' }]} /></div>}>Promedios</Grupo>
        {!dias ? <Cargando /> : prom.n === 0 ? <p className="tarjeta py-6 text-center text-mu">Sin registros en este período.</p> : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="promedios">
            <div className="tarjeta text-center"><div className="etiqueta">Calorías</div><div className="num mt-1 text-[26px] oro">{formatoNumero(prom.kcal)}</div><div className="text-[12px] text-mu">meta {formatoNumero(metas.kcal)}</div></div>
            <div className="tarjeta text-center"><div className="etiqueta">Proteínas</div><div className="num mt-1 text-[26px]" style={{ color: 'var(--prot)' }}>{formatoNumero(prom.prot)} g</div><div className="text-[12px] text-mu">{pct.prot} % · meta {metas.prot} g</div></div>
            <div className="tarjeta text-center"><div className="etiqueta">Carbohidratos</div><div className="num mt-1 text-[26px]" style={{ color: 'var(--carb)' }}>{formatoNumero(prom.carb)} g</div><div className="text-[12px] text-mu">{pct.carb} % · meta {metas.carb} g</div></div>
            <div className="tarjeta text-center"><div className="etiqueta">Grasas</div><div className="num mt-1 text-[26px]" style={{ color: 'var(--gras)' }}>{formatoNumero(prom.gras)} g</div><div className="text-[12px] text-mu">{pct.gras} % · meta {metas.gras} g</div></div>
          </div>
        )}
        {prom.n > 0 && <p className="mt-2 text-[12px] text-mu2">Promedio de {prom.n} día{prom.n > 1 ? 's' : ''} con registros.</p>}
      </section>

      <section className="mt-8">
        <Grupo n={4} className="mb-3">Historial</Grupo>
        {!dias ? <Cargando /> : !historial.length ? <p className="tarjeta py-6 text-center text-mu">Todavía no hay días registrados.</p> : (
          <>
            <ul className="tarjeta py-1" data-testid="historial">
              {historial.slice(0, cuantos).map((d) => {
                const ok = diaCumplido(d, d.metas ?? metas);
                return (
                  <li key={d.fecha} className="fila last:border-0">
                    <Link to={`/diario?fecha=${d.fecha}`} className="flex flex-1 items-center gap-3 py-2">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? 'text-white' : 'border border-ln3 text-mu2'}`} style={ok ? { background: 'var(--verde)' } : undefined}>
                        <Icono n={ok ? 'check' : 'plato'} size={15} />
                      </span>
                      <span className="flex-1"><b className="first-letter:uppercase">{new Intl.DateTimeFormat('es-PY', { weekday: 'long', day: 'numeric', month: 'short' }).format(fechaDeClave(d.fecha)).replace('.', '')}</b>
                        <span className="block text-[12px] text-mu">{ok ? 'Cumplido' : d.totales.kcal > (d.metas ?? metas).kcal * 1.1 ? 'Pasado de la meta' : 'Por debajo de la meta'} · agua {formatoNumero(d.agua / 1000, 2)} L</span></span>
                      <span className="num text-[17px]">{formatoNumero(d.totales.kcal)}<span className="ml-1 font-body text-[12px] text-mu">kcal</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {historial.length > cuantos && <button className="btn-sec mt-3 w-full" onClick={() => setCuantos((n) => n + 14)}>Ver más días</button>}
          </>
        )}
      </section>

      <Hoja abierta={registrar} alCerrar={() => setRegistrar(false)} etiqueta="Peso y medidas" titulo="Registro de hoy">
        <RegistrarCuerpo unidad={u} previo={(cuerpo ?? []).find((r) => r.id === hoy)} alGuardar={async (r) => {
          await repo.guardarCuerpo(usuario.uid, r);
          setCuerpo((l) => [...(l ?? []).filter((x) => x.id !== r.id), r].sort((a, b) => a.fecha - b.fecha));
          setRegistrar(false);
          aviso('Registro guardado');
        }} />
      </Hoja>
    </div>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="tarjeta py-3 text-center">
      <div className="etiqueta truncate">{t}</div>
      <div className="num mt-1 text-[22px] oro">{v}</div>
    </div>
  );
}

function RegistrarCuerpo({ unidad, previo, alGuardar }: { unidad: 'kg' | 'lb'; previo?: RegistroCuerpo; alGuardar: (r: RegistroCuerpo) => void }) {
  const ini = (k: Medida) => (previo?.[k] !== undefined ? String(k === 'peso' ? formatoNumero(aUnidad(previo[k]!, unidad), 1) : previo[k]) : '');
  const [v, setV] = useState<Record<Medida, string>>({ peso: ini('peso'), cintura: ini('cintura'), cadera: ini('cadera'), brazo: ini('brazo'), muslo: ini('muslo') });
  const num = (s: string) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : undefined; };
  const peso = num(v.peso);
  const valido = MEDIDAS.some((m) => num(v[m.v]));
  function guardar() {
    const hoy = claveDia();
    const r: RegistroCuerpo = { id: hoy, fecha: Date.now() };
    if (peso) r.peso = Math.round(aKg(peso, unidad) * 10) / 10;
    for (const m of MEDIDAS) if (m.v !== 'peso' && num(v[m.v])) r[m.v] = num(v[m.v]);
    alGuardar(r);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {MEDIDAS.map((m) => (
          <label key={m.v} className={m.v === 'peso' ? 'col-span-2 block' : 'block'}><span className="etiqueta">{m.t} ({m.v === 'peso' ? unidad : 'cm'})</span>
            <input className="campo mt-1.5" inputMode="decimal" value={v[m.v]} onChange={(e) => setV({ ...v, [m.v]: e.target.value })} aria-label={m.t} placeholder="—" />
          </label>
        ))}
      </div>
      <p className="text-[13px] text-mu">Pesate siempre a la misma hora, mejor a la mañana en ayunas.</p>
      <button className="btn w-full" disabled={!valido} onClick={guardar}>Guardar</button>
    </div>
  );
}
