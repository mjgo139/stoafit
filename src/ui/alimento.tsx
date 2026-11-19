import { useRef, useState } from 'react';
import { fechaCorta, fechaDeClave, formatoNumero, nuevoId, sumarDias } from '../lib/logica';
import { esSuelta, itemDe, metasDe, repartoMacros, unidadSuelta, type Etiqueta } from '../lib/nutricion';
import { useSesion } from './contexto';
import type { Alimento, ItemComida, Porcion } from '../lib/tipos';
import type { LecturaEtiqueta } from '../lib/productos';
import { mensajeError } from '../data/repo';
import { Icono } from './Icono';
import { Selector } from './piezas';

const CANTIDADES = [0.5, 1, 1.5, 2, 3];
const GRAMOS = [25, 50, 100, 150, 200];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const num = (s: string) => Number(s.replace(',', '.')) || 0;
const texto = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Agregar un alimento: cantidad libre (se escribe) en la porción que quieras o en gramos sueltos,
 * lo que aporta, cuánto es de tu meta del día y, si se pide, sumarlo a varios días de una vez.
 */
export function ElegirPorcion({ alimento: a, favorito, alFavorito, alAgregar, alEditar, alReportar, textoBoton = 'Agregar', fecha }: {
  alimento: Alimento; favorito?: boolean; alFavorito?: () => void; alAgregar: (i: ItemComida, otrosDias: string[]) => void;
  alEditar?: () => void; alReportar?: () => void; textoBoton?: string;
  /** Si viene, se puede sumar también a los 6 días siguientes */
  fecha?: string;
}) {
  const { perfil } = useSesion();
  const metas = metasDe(perfil);
  const suelta = unidadSuelta(a);
  const [porcion, setPorcion] = useState(a.porciones[0]?.nombre ?? '100 g');
  const [cant, setCant] = useState('1');
  const [dias, setDias] = useState<string[]>([]);
  const cantidad = num(cant);
  const item = itemDe(a, porcion, cantidad, nuevoId());
  const enGramos = esSuelta(porcion);
  const r = repartoMacros(item);

  function cambiarUnidad(p: string) {
    // a gramos: se mantiene lo mismo que ya elegiste; de gramos a una porción: 1
    if (esSuelta(p) && !enGramos) setCant(String(item.gramos || 100));
    else if (!esSuelta(p) && enGramos) setCant('1');
    setPorcion(p);
  }
  const proximos = fecha ? Array.from({ length: 7 }, (_, n) => sumarDias(fecha, n)) : [];
  const pct = (v: number, m: number) => (m ? Math.round((v / m) * 100) : 0);

  return (
    <div>
      {a.compartido && (
        <p className="-mt-2 mb-2 flex flex-wrap items-center gap-2 text-[12px]" data-testid="estado-producto">
          {a.verificado
            ? <span className="inline-flex items-center gap-1 font-bold uppercase tracking-[.08em]" style={{ color: 'var(--verde)' }}><Icono n="check" size={13} />Verificado</span>
            : <span className="rounded-full border border-ln3 px-2 py-0.5 font-bold uppercase tracking-[.08em] text-mu">Sin verificar</span>}
          <span className="text-mu2">Base compartida de StoaFit</span>
        </p>
      )}
      {(a.marca || a.codigo || a.receta) && (
        <p className="-mt-2 mb-3 text-[13px] text-mu">
          {a.receta ? `Receta · ${a.receta.ingredientes.length} ingredientes · rinde ${a.receta.porciones} porciones` : [a.marca, a.codigo && `Código ${a.codigo}`].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="etiqueta">Cuánto</div>
      <div className="mt-2 flex items-center gap-2">
        <button className="chip h-11 w-11 shrink-0" aria-label="Menos cantidad" onClick={() => setCant((c) => texto(Math.max(enGramos ? 1 : 0.25, num(c) - (enGramos ? 10 : 0.5))))}><Icono n="menos" size={16} /></button>
        <input className="campo num h-11 w-[84px] shrink-0 text-center text-[22px]" inputMode="decimal" value={cant} aria-label="Cantidad"
          onChange={(e) => setCant(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 7))} onFocus={(e) => e.target.select()} />
        <button className="chip h-11 w-11 shrink-0" aria-label="Más cantidad" onClick={() => setCant((c) => texto(num(c) + (enGramos ? 10 : 0.5)))}><Icono n="mas" size={16} /></button>
        <select className="campo h-11 min-w-0 flex-1 px-3 text-[14px]" value={porcion} onChange={(e) => cambiarUnidad(e.target.value)} aria-label="Unidad">
          {a.porciones.map((p) => (
            <option key={p.nombre} value={p.nombre}>{p.nombre}{p.nombre !== '100 g' && p.nombre !== '100 ml' && !p.nombre.includes('(') ? ` (${formatoNumero(p.gramos)} g)` : ''}</option>
          ))}
          <option value={suelta}>{suelta === 'ml' ? 'mililitros (ml)' : 'gramos (g)'}</option>
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(enGramos ? GRAMOS : CANTIDADES).map((c) => (
          <button key={c} className={`chip h-8 px-2.5 text-[12px] ${cantidad === c ? 'chip-on' : ''}`} onClick={() => setCant(texto(c))}>
            {enGramos ? `${c} ${porcion}` : c === 0.5 ? '½' : c === 1.5 ? '1½' : c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-[12px] border border-ln2 p-3" data-testid="aporte">
        <AnilloMacros kcal={item.kcal} r={r} />
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center">
          {([['prot', 'Proteínas'], ['carb', 'Carbohidr.'], ['gras', 'Grasas']] as const).map(([k, t]) => (
            <div key={k}>
              <div className="text-[11px] font-bold" style={{ color: `var(--${k})` }}>{r[k]} %</div>
              <div className="num text-[18px]">{formatoNumero(item[k], 1)} <span className="text-[12px] text-mu">g</span></div>
              <div className="text-[11px] text-mu">{t}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[12px] text-mu2">{formatoNumero(item.gramos)} {suelta === 'ml' && enGramos ? 'ml' : 'g'} en total{a.fuente === 'off' ? ' · datos de Open Food Facts' : ''}</p>

      <div className="mt-3" data-testid="de-tu-meta">
        <div className="etiqueta mb-2">De tu meta del día</div>
        <div className="grid grid-cols-4 gap-2">
          {([['kcal', 'Calorías', 'var(--gold)', ''], ['prot', 'Proteínas', 'var(--prot)', ' g'], ['carb', 'Carbohidr.', 'var(--carb)', ' g'], ['gras', 'Grasas', 'var(--gras)', ' g']] as const).map(([k, t, color, u]) => (
            <div key={k} className="min-w-0">
              <div className="truncate text-[11px] text-mu">{t}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ln2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, pct(item[k], metas[k]))}%`, background: color }} /></div>
              <div className="mt-1 flex justify-between gap-1 text-[11px]"><b>{pct(item[k], metas[k])} %</b><span className="truncate text-mu2">{formatoNumero(metas[k])}{u}</span></div>
            </div>
          ))}
        </div>
      </div>

      {fecha && (
        <div className="mt-4">
          <div className="etiqueta mb-2">También en otros días</div>
          <div className="flex justify-between gap-1" role="group" aria-label="Otros días">
            {proximos.map((d, n) => {
              const on = n === 0 || dias.includes(d);
              return (
                <button key={d} disabled={n === 0} aria-pressed={on} aria-label={n === 0 ? `${fechaCorta(d)} (este día)` : `Sumar también el ${fechaCorta(d)}`}
                  onClick={() => setDias((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}
                  className={`flex h-14 flex-1 flex-col items-center justify-center rounded-[12px] border text-[11px] ${on ? 'border-gold bg-goldbg oro' : 'border-ln2 text-mu'}`}>
                  <span>{DIAS_CORTOS[fechaDeClave(d).getDay()]}</span>
                  <span className="num text-[16px]">{fechaDeClave(d).getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {alReportar && <button className="mx-auto mt-3 block text-[12px] font-semibold text-mu underline" onClick={alReportar}>¿Algún dato está mal? Reportar error</button>}
      <div className="mt-4 flex gap-2">
        {alFavorito && (
          <button className="btn-sec h-[52px] w-[52px] shrink-0 px-0" aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={!!favorito} onClick={alFavorito}>
            <Icono n="estrella" size={20} className={favorito ? 'oro' : ''} />
          </button>
        )}
        {alEditar && (
          <button className="btn-sec h-[52px] w-[52px] shrink-0 px-0" aria-label={a.receta ? 'Editar receta' : a.compartido ? 'Corregir producto' : 'Editar alimento'} onClick={alEditar}>
            <Icono n="editar" size={19} />
          </button>
        )}
        <button className="btn flex-1" disabled={cantidad <= 0} onClick={() => alAgregar(item, [...dias].sort())}>
          {dias.length ? `${textoBoton} a ${dias.length + 1} días` : textoBoton}
        </button>
      </div>
    </div>
  );
}

/** Anillo de calorías partido según de dónde vienen (proteínas, carbohidratos, grasas) */
function AnilloMacros({ kcal, r }: { kcal: number; r: { prot: number; carb: number; gras: number } }) {
  const R = 40, C = 2 * Math.PI * R;
  let ini = 0;
  const partes = (['carb', 'gras', 'prot'] as const).map((k) => { const p = { k, ini, largo: (r[k] / 100) * C }; ini += p.largo; return p; });
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ln2)" strokeWidth="8" />
        {partes.map((p) => p.largo > 0 && (
          <circle key={p.k} cx="50" cy="50" r={R} fill="none" stroke={`var(--${p.k})`} strokeWidth="8"
            strokeDasharray={`${Math.max(0, p.largo - 1.5)} ${C}`} strokeDashoffset={-p.ini} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[22px] leading-none oro">{formatoNumero(kcal)}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[.08em] text-mu">kcal</span>
      </div>
    </div>
  );
}

/**
 * Formulario de etiqueta nutricional: como viene en el envase ("por porción" o "cada 100 g"),
 * con marca, código de barras y otras medidas caseras.
 */
export function FormEtiqueta({ inicial, alGuardar, alBorrar, codigoFijo, leerFoto, textoGuardar = 'Guardar alimento' }: {
  inicial: Partial<Etiqueta>; alGuardar: (e: Etiqueta, via: 'manual' | 'foto') => void; alBorrar?: () => void;
  /** Producto de la base compartida: el código queda fijo (un código = un producto) */
  codigoFijo?: string;
  /** Solo cargadores: leer la etiqueta con una foto */
  leerFoto?: (foto: Blob) => Promise<LecturaEtiqueta>;
  textoGuardar?: string;
}) {
  const t = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','));
  const [nombre, setNombre] = useState(inicial.nombre ?? '');
  const [marca, setMarca] = useState(inicial.marca ?? '');
  const codigo = inicial.codigo ?? '';
  const [modo, setModo] = useState<Etiqueta['modo']>(inicial.modo ?? 'porcion');
  const [porcion, setPorcion] = useState(inicial.porcion ?? '1 porción');
  const [gramos, setGramos] = useState(t(inicial.gramos ?? 100));
  const [v, setV] = useState({ kcal: t(inicial.kcal), prot: t(inicial.prot), carb: t(inicial.carb), gras: t(inicial.gras) });
  const [otras, setOtras] = useState<{ nombre: string; gramos: string }[]>((inicial.otras ?? []).map((o) => ({ nombre: o.nombre, gramos: String(o.gramos) })));
  const [borrar, setBorrar] = useState(false);
  const [via, setVia] = useState<'manual' | 'foto'>('manual');
  const [leyendo, setLeyendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const [leida, setLeida] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  const g = num(gramos);
  const valido = nombre.trim() && v.kcal !== '' && g > 0;

  function guardar() {
    const o: Porcion[] = otras.filter((x) => x.nombre.trim() && num(x.gramos) > 0).map((x) => ({ nombre: x.nombre.trim().slice(0, 40), gramos: num(x.gramos) }));
    alGuardar({
      nombre, marca, codigo: codigoFijo ?? codigo.replace(/\D/g, ''), modo, porcion: porcion.trim().slice(0, 40) || '1 porción', gramos: g,
      kcal: num(v.kcal), prot: num(v.prot), carb: num(v.carb), gras: num(v.gras), otras: o,
    }, via);
  }

  async function foto(f: File | undefined) {
    if (!f || !leerFoto) return;
    setErrorFoto('');
    setLeyendo(true);
    try {
      const l = await leerFoto(await comprimir(f));
      const t = (n?: number) => (n === undefined ? undefined : String(n).replace('.', ','));
      if (l.nombre && !nombre.trim()) setNombre(l.nombre);
      if (l.marca && !marca.trim()) setMarca(l.marca);
      setModo('porcion');
      if (l.porcion) setPorcion(l.porcion);
      if (l.gramos) setGramos(t(l.gramos)!);
      setV((x) => ({ kcal: t(l.kcal) ?? x.kcal, prot: t(l.prot) ?? x.prot, carb: t(l.carb) ?? x.carb, gras: t(l.gras) ?? x.gras }));
      setVia('foto');
      setLeida(true);
    } catch (e) {
      setErrorFoto(mensajeError(e));
    } finally {
      setLeyendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  }
  const campo = (k: keyof typeof v, etiqueta: string) => (
    <label className="block"><span className="etiqueta">{etiqueta}</span>
      <input className="campo mt-1.5" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-label={etiqueta} placeholder="0" />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      {leerFoto && (
        <div className="rounded-[14px] border border-gold2 p-3" data-testid="leer-foto">
          <input ref={archivo} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Foto de la etiqueta"
            onChange={(e) => foto(e.target.files?.[0])} />
          <button className="btn w-full" disabled={leyendo} onClick={() => archivo.current?.click()}>
            <Icono n="camara" size={18} />{leyendo ? 'Leyendo la etiqueta…' : leida ? 'Leer otra foto' : 'Leer etiqueta con foto'}
          </button>
          <p className="mt-2 text-center text-[12px] text-mu">
            {leida ? <b className="oro">Listo: revisá los valores antes de guardar.</b> : 'Sacale una foto de cerca a la tabla "Información Nutricional", sin brillo.'}
          </p>
          {errorFoto && <p className="mt-1 text-center text-[13px] text-miss" role="alert">{errorFoto}</p>}
        </div>
      )}
      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Nombre del alimento" placeholder={codigoFijo ? 'Ej.: Pan de leche' : 'Ej.: Guiso de la abuela'} />
      </label>
      <div className={codigoFijo ? 'grid grid-cols-2 gap-2' : ''}>
        <label className="block"><span className="etiqueta">Marca (opcional)</span>
          <input className="campo mt-1.5" value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={60} aria-label="Marca" />
        </label>
        {codigoFijo && (
          <div><span className="etiqueta">Código de barras</span>
            <div className="campo mt-1.5 flex items-center gap-2 bg-sf2 text-mu" aria-label="Código de barras" data-testid="codigo-fijo"><Icono n="barras" size={16} />{codigoFijo}</div>
          </div>
        )}
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
      <button className="btn mt-1 w-full" disabled={!valido || leyendo} onClick={guardar}>{textoGuardar}</button>
      {alBorrar && (borrar ? (
        <div className="rounded-[12px] border border-miss p-3 text-[14px]">
          <p>¿Borrar <b>{nombre}</b>? Lo que ya registraste en el diario queda igual.</p>
          <div className="mt-2 flex gap-2"><button className="btn-sec flex-1 text-miss" onClick={alBorrar}>Sí, borrar</button><button className="btn-sec flex-1" onClick={() => setBorrar(false)}>Cancelar</button></div>
        </div>
      ) : <button className="btn-sec text-miss" onClick={() => setBorrar(true)}><Icono n="basura" size={16} />Borrar alimento</button>)}
    </div>
  );
}

/** Achica la foto (máximo 1280 px, JPEG) para que la lectura sea rápida y barata */
export async function comprimir(f: Blob, max = 1280): Promise<Blob> {
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b ?? f), 'image/jpeg', 0.8));
  } catch {
    return f;
  }
}
