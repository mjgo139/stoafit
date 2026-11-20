import { Link } from 'react-router-dom';
import { formatoNumero } from '../lib/logica';
import { estadoMeta } from '../lib/nutricion';
import type { ItemComida, Macros, Metas, TipoComida } from '../lib/tipos';
import { Icono } from './Icono';

/** Anillo de calorías: lo comido contra la meta */
export function Anillo({ valor, meta, tam = 148 }: { valor: number; meta: number; tam?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const f = meta ? Math.min(1, valor / meta) : 0;
  const pasado = estadoMeta(valor, meta) === 'pasado';
  const resta = Math.round(meta - valor);
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }} data-testid="anillo">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" className="anillo-pista" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className={pasado ? 'anillo-pasado' : 'anillo-valor'}
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`num leading-none ${pasado ? 'text-miss' : 'oro'}`} style={{ fontSize: tam * 0.22 }}>{formatoNumero(Math.abs(resta))}</span>
        <span className="mt-1 font-bold uppercase text-mu" style={{ fontSize: Math.min(11, tam * 0.078), letterSpacing: tam < 130 ? '.06em' : '.12em' }}>{resta >= 0 ? 'kcal restan' : 'kcal de más'}</span>
      </div>
    </div>
  );
}

const COLOR: Record<'prot' | 'carb' | 'gras', string> = { prot: 'var(--prot)', carb: 'var(--carb)', gras: 'var(--gras)' };
const NOMBRE: Record<'prot' | 'carb' | 'gras', string> = { prot: 'Proteínas', carb: 'Carbohidratos', gras: 'Grasas' };

/** Barra fina de un macronutriente */
export function BarraMacro({ m, valor, meta }: { m: 'prot' | 'carb' | 'gras'; valor: number; meta: number }) {
  const f = meta ? Math.min(1, valor / meta) : 0;
  return (
    <div data-testid={`macro-${m}`}>
      <div className="flex items-baseline justify-between text-[13.5px]">
        <span className="font-semibold">{NOMBRE[m]}</span>
        <span className="text-mu"><b className="num text-[15px] text-tx">{formatoNumero(valor)}</b> / {formatoNumero(meta)} g</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ln2">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${f * 100}%`, background: COLOR[m] }} />
      </div>
    </div>
  );
}

export function Macros3({ t, metas }: { t: Macros; metas: Metas }) {
  return (
    <div className="flex flex-col gap-3">
      <BarraMacro m="prot" valor={t.prot} meta={metas.prot} />
      <BarraMacro m="carb" valor={t.carb} meta={metas.carb} />
      <BarraMacro m="gras" valor={t.gras} meta={metas.gras} />
    </div>
  );
}

/** Línea corta de macros: "P 20 · C 35 · G 8" */
export function LineaMacros({ m }: { m: Macros }) {
  return (
    <span className="text-[12.5px] text-mu">
      <b style={{ color: 'var(--prot)' }}>P</b> {formatoNumero(m.prot)} · <b style={{ color: 'var(--carb)' }}>C</b> {formatoNumero(m.carb)} · <b style={{ color: 'var(--gras)' }}>G</b> {formatoNumero(m.gras)}
    </span>
  );
}

export function textoCantidad(i: Pick<ItemComida, 'cantidad' | 'porcion' | 'gramos'>): string {
  if (i.porcion === 'rápida') return 'Solo calorías';
  if (i.porcion === 'g' || i.porcion === 'ml') return `${formatoNumero(i.cantidad)} ${i.porcion}`;
  const c = i.cantidad === 0.5 ? '½' : i.cantidad === 0.25 ? '¼' : i.cantidad === 1.5 ? '1½' : formatoNumero(i.cantidad, 2);
  const p = i.cantidad === 1 ? i.porcion : `${c} × ${i.porcion}`;
  return `${p} · ${formatoNumero(i.gramos)} g`;
}

/** Tarjeta de una comida en Hoy: total, qué se comió y botón para agregar */
export function TarjetaComida({ tipo, nombre, parte, items, metas, fecha }: { tipo: TipoComida; nombre: string; parte: number; items: ItemComida[]; metas: Metas; fecha: string }) {
  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const sugerido = Math.round(metas.kcal * parte);
  const vacia = items.length === 0;
  return (
    <div className="tarjeta flex items-center gap-3" data-testid={`comida-${tipo}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${vacia ? 'border border-dashed border-ln3 text-mu2' : 'bg-acentobg acento'}`}>
        <Icono n={vacia ? 'plato' : 'check'} size={20} />
      </span>
      <Link to={`/diario?fecha=${fecha}#${tipo}`} className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[18px] font-semibold">{nombre}</span>
          <span className="text-[13.5px] text-mu">{vacia ? `~${formatoNumero(sugerido)} kcal sugeridas` : `${formatoNumero(kcal)} kcal`}</span>
        </div>
        <div className="truncate text-[13.5px] text-mu">{vacia ? 'Todavía nada' : items.map((i) => i.nombre).join(', ')}</div>
      </Link>
      <Link to={`/agregar?comida=${tipo}&fecha=${fecha}`} className="btn-redondo h-10 w-10" aria-label={`Agregar a ${nombre}`}>
        <Icono n="mas" size={20} />
      </Link>
    </div>
  );
}

/** Vasos de agua: tocar llena hasta ese vaso; tocar el último lleno lo vacía */
export function Vasos({ ml, meta, alCambiar }: { ml: number; meta: number; alCambiar: (ml: number) => void }) {
  const total = Math.max(8, Math.ceil(meta / 250));
  const llenos = Math.round(ml / 250);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vasos de agua">
        {Array.from({ length: Math.max(total, llenos) }, (_, i) => (
          <button key={i} className={`vaso ${i < llenos ? 'vaso-lleno' : ''}`} aria-label={`Vaso ${i + 1}${i < llenos ? ' (tomado)' : ''}`}
            onClick={() => alCambiar((i + 1 === llenos ? i : i + 1) * 250)} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[15px] text-mu"><b className="num text-[20px] acento">{formatoNumero(ml / 1000, 2)}</b> de {formatoNumero(meta / 1000, 2)} L</span>
        <span className="flex gap-2">
          <button className="chip h-9 w-11" aria-label="Quitar un vaso" onClick={() => alCambiar(ml - 250)} disabled={ml <= 0}><Icono n="menos" size={16} /></button>
          <button className="chip h-9 px-3" aria-label="Agregar un vaso" onClick={() => alCambiar(ml + 250)}><Icono n="mas" size={16} />Vaso</button>
        </span>
      </div>
    </div>
  );
}
