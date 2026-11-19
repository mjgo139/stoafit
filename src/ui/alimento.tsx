import { useState } from 'react';
import { formatoNumero, nuevoId } from '../lib/logica';
import { itemDe, type Etiqueta } from '../lib/nutricion';
import type { Alimento, ItemComida, Porcion } from '../lib/tipos';
import { Icono } from './Icono';
import { Selector } from './piezas';

const CANTIDADES = [0.5, 1, 1.5, 2, 3];

/** Porción, cantidad y lo que aporta. Opcionalmente favorito, editar y borrar (alimentos propios). */
export function ElegirPorcion({ alimento: a, favorito, alFavorito, alAgregar, alEditar, textoBoton = 'Agregar' }: {
  alimento: Alimento; favorito?: boolean; alFavorito?: () => void; alAgregar: (i: ItemComida) => void;
  alEditar?: () => void; textoBoton?: string;
}) {
  const [porcion, setPorcion] = useState(a.porciones[0]?.nombre ?? '100 g');
  const [cantidad, setCantidad] = useState(1);
  const item = itemDe(a, porcion, cantidad, nuevoId());
  return (
    <div>
      {(a.marca || a.codigo || a.receta) && (
        <p className="-mt-2 mb-3 text-[13px] text-mu">
          {a.receta ? `Receta · ${a.receta.ingredientes.length} ingredientes · rinde ${a.receta.porciones} porciones` : [a.marca, a.codigo && `Código ${a.codigo}`].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="etiqueta">Porción</div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Porción">
        {a.porciones.map((p) => (
          <button key={p.nombre} role="radio" aria-checked={porcion === p.nombre} onClick={() => setPorcion(p.nombre)} className={`chip ${porcion === p.nombre ? 'chip-on' : ''}`}>
            {p.nombre}{p.nombre !== '100 g' && p.nombre !== '100 ml' && !p.nombre.includes('(') && <span className="ml-1 opacity-70">({p.gramos} g)</span>}
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
      <p className="mt-2 text-center text-[12px] text-mu2">{formatoNumero(item.gramos)} g en total{a.fuente === 'off' ? ' · datos de Open Food Facts' : ''}</p>
      <div className="mt-4 flex gap-2">
        {alFavorito && (
          <button className="btn-sec h-[52px] w-[52px] shrink-0 px-0" aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={!!favorito} onClick={alFavorito}>
            <Icono n="estrella" size={20} className={favorito ? 'oro' : ''} />
          </button>
        )}
        {alEditar && (
          <button className="btn-sec h-[52px] w-[52px] shrink-0 px-0" aria-label={a.receta ? 'Editar receta' : 'Editar alimento'} onClick={alEditar}>
            <Icono n="editar" size={19} />
          </button>
        )}
        <button className="btn flex-1" onClick={() => alAgregar(item)}>{textoBoton}</button>
      </div>
    </div>
  );
}

/**
 * Formulario de etiqueta nutricional: como viene en el envase ("por porción" o "cada 100 g"),
 * con marca, código de barras y otras medidas caseras.
 */
export function FormEtiqueta({ inicial, alGuardar, alBorrar }: {
  inicial: Partial<Etiqueta>; alGuardar: (e: Etiqueta) => void; alBorrar?: () => void;
}) {
  const t = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','));
  const [nombre, setNombre] = useState(inicial.nombre ?? '');
  const [marca, setMarca] = useState(inicial.marca ?? '');
  const [codigo, setCodigo] = useState(inicial.codigo ?? '');
  const [modo, setModo] = useState<Etiqueta['modo']>(inicial.modo ?? 'porcion');
  const [porcion, setPorcion] = useState(inicial.porcion ?? '1 porción');
  const [gramos, setGramos] = useState(t(inicial.gramos ?? 100));
  const [v, setV] = useState({ kcal: t(inicial.kcal), prot: t(inicial.prot), carb: t(inicial.carb), gras: t(inicial.gras) });
  const [otras, setOtras] = useState<{ nombre: string; gramos: string }[]>((inicial.otras ?? []).map((o) => ({ nombre: o.nombre, gramos: String(o.gramos) })));
  const [borrar, setBorrar] = useState(false);
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  const g = num(gramos);
  const valido = nombre.trim() && v.kcal !== '' && g > 0;

  function guardar() {
    const o: Porcion[] = otras.filter((x) => x.nombre.trim() && num(x.gramos) > 0).map((x) => ({ nombre: x.nombre.trim().slice(0, 40), gramos: num(x.gramos) }));
    alGuardar({
      nombre, marca, codigo: codigo.replace(/\D/g, ''), modo, porcion: porcion.trim().slice(0, 40) || '1 porción', gramos: g,
      kcal: num(v.kcal), prot: num(v.prot), carb: num(v.carb), gras: num(v.gras), otras: o,
    });
  }
  const campo = (k: keyof typeof v, etiqueta: string) => (
    <label className="block"><span className="etiqueta">{etiqueta}</span>
      <input className="campo mt-1.5" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-label={etiqueta} placeholder="0" />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Nombre del alimento" placeholder="Ej.: Guiso de la abuela" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="etiqueta">Marca (opcional)</span>
          <input className="campo mt-1.5" value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={60} aria-label="Marca" />
        </label>
        <label className="block"><span className="etiqueta">Código de barras</span>
          <input className="campo mt-1.5" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-label="Código de barras" placeholder="Opcional" />
        </label>
      </div>
      <div>
        <div className="etiqueta mb-1.5">La etiqueta dice los valores…</div>
        <Selector<Etiqueta['modo']> nombre="Valores de la etiqueta" valor={modo} alCambiar={setModo}
          opciones={[{ v: 'porcion', t: 'Por porción' }, { v: '100', t: 'Cada 100 g / ml' }]} />
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <label className="block"><span className="etiqueta">Porción</span>
          <input className="campo mt-1.5" value={porcion} onChange={(e) => setPorcion(e.target.value)} maxLength={40} aria-label="Nombre de la porción" placeholder="1 paquete, 2 galletitas…" />
        </label>
        <label className="block"><span className="etiqueta">Gramos</span>
          <input className="campo mt-1.5" inputMode="decimal" value={gramos} onChange={(e) => setGramos(e.target.value)} aria-label="Gramos de la porción" />
        </label>
      </div>
      <p className="text-[13px] text-mu">Lo que aporta <b>{modo === 'porcion' ? `esa porción (${formatoNumero(g)} g)` : 'cada 100 g o 100 ml'}</b>:</p>
      <div className="grid grid-cols-2 gap-2">
        {campo('kcal', 'Calorías')}{campo('prot', 'Proteínas (g)')}{campo('carb', 'Carbohidratos (g)')}{campo('gras', 'Grasas (g)')}
      </div>
      <div>
        <div className="etiqueta">Otras medidas (opcional)</div>
        {otras.map((o, i) => (
          <div key={i} className="mt-1.5 grid grid-cols-[1fr_90px_40px] gap-2">
            <input className="campo" value={o.nombre} placeholder="1 paquete" aria-label={`Otra medida ${i + 1}`}
              onChange={(e) => setOtras(otras.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x)))} />
            <input className="campo" inputMode="decimal" value={o.gramos} placeholder="g" aria-label={`Gramos de otra medida ${i + 1}`}
              onChange={(e) => setOtras(otras.map((x, k) => (k === i ? { ...x, gramos: e.target.value } : x)))} />
            <button className="flex items-center justify-center text-mu2" aria-label={`Quitar medida ${i + 1}`} onClick={() => setOtras(otras.filter((_, k) => k !== i))}><Icono n="basura" size={17} /></button>
          </div>
        ))}
        {otras.length < 4 && <button className="mt-2 text-[13px] font-semibold oro" onClick={() => setOtras([...otras, { nombre: '', gramos: '' }])}>+ Agregar medida</button>}
      </div>
      <button className="btn mt-1 w-full" disabled={!valido} onClick={guardar}>Guardar alimento</button>
      {alBorrar && (borrar ? (
        <div className="rounded-[12px] border border-miss p-3 text-[14px]">
          <p>¿Borrar <b>{nombre}</b>? Lo que ya registraste en el diario queda igual.</p>
          <div className="mt-2 flex gap-2"><button className="btn-sec flex-1 text-miss" onClick={alBorrar}>Sí, borrar</button><button className="btn-sec flex-1" onClick={() => setBorrar(false)}>Cancelar</button></div>
        </div>
      ) : <button className="btn-sec text-miss" onClick={() => setBorrar(true)}><Icono n="basura" size={16} />Borrar alimento</button>)}
    </div>
  );
}
