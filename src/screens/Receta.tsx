import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BIBLIOTECA, buscar } from '../lib/alimentos';
import { formatoNumero, nuevoId } from '../lib/logica';
import { alimentoDeReceta, sumar } from '../lib/nutricion';
import type { Alimento, ItemComida } from '../lib/tipos';
import { ElegirPorcion } from '../ui/alimento';
import { useSesion } from '../ui/contexto';
import { Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { LineaMacros, textoCantidad } from '../ui/nutri';
import { Cargando, Encabezado, Hoja } from '../ui/piezas';

/** Receta casera: ingredientes, cuánto rinde y lo que aporta cada porción */
export default function Receta() {
  const { repo, usuario, aviso } = useSesion();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editarId = params.get('id');
  const [propios, setPropios] = useState<Alimento[] | null>(null);
  const [nombre, setNombre] = useState('');
  const [ingredientes, setIngredientes] = useState<ItemComida[]>([]);
  const [porciones, setPorciones] = useState(4);
  const [peso, setPeso] = useState('');
  const [texto, setTexto] = useState('');
  const [elegido, setElegido] = useState<Alimento | null>(null);
  const [borrar, setBorrar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    repo.leerPropios(usuario.uid).then((l) => {
      setPropios(l);
      const r = editarId ? l.find((x) => x.id === editarId) : undefined;
      if (r?.receta) {
        setNombre(r.nombre);
        setIngredientes(r.receta.ingredientes);
        setPorciones(r.receta.porciones);
        setPeso(r.receta.pesoTotal ? String(r.receta.pesoTotal) : '');
      }
    }).catch(() => setPropios([]));
  }, [repo, usuario.uid, editarId]);

  // Ingredientes posibles: la biblioteca y los alimentos propios (no otras recetas)
  const fuentes = useMemo(() => [...(propios ?? []).filter((a) => !a.receta), ...BIBLIOTECA], [propios]);
  const resultados = texto.trim() ? buscar(texto, fuentes).slice(0, 12) : [];
  const total = sumar(ingredientes);
  const crudo = ingredientes.reduce((s, i) => s + i.gramos, 0);
  const pesoNum = Number(peso.replace(',', '.')) || 0;
  const pesoFinal = pesoNum > 0 ? pesoNum : crudo;
  const n = Math.max(1, porciones);
  const valido = nombre.trim() && ingredientes.length > 0;

  async function guardar() {
    setGuardando(true);
    try {
      const a = alimentoDeReceta(editarId ?? 'r-' + nuevoId(), nombre.trim().slice(0, 80), { ingredientes, porciones: n, ...(pesoNum > 0 ? { pesoTotal: pesoNum } : {}) });
      await repo.guardarPropio(usuario.uid, a);
      aviso(`Receta "${a.nombre}" guardada`);
      nav(-1);
    } finally { setGuardando(false); }
  }

  if (!propios) return <Cargando forma="pagina" />;
  return (
    <div className="lg:mx-auto lg:max-w-[880px]">
      <Encabezado atras etiqueta="Receta" titulo={editarId ? 'Editar receta' : 'Nueva receta'}
        linea="Sumá los ingredientes de la olla entera y decí en cuántas porciones se reparte." />

      <label className="block"><span className="etiqueta">Nombre</span>
        <input className="campo mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Nombre de la receta" placeholder="Ej.: Sopa paraguaya de mamá" />
      </label>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <section>
          <Grupo n={1} className="mb-3" extra={<span className="text-[13px] text-mu">{ingredientes.length}</span>}>Ingredientes</Grupo>
          <div className="tarjeta py-1" data-testid="ingredientes">
            {ingredientes.map((i) => (
              <div key={i.id} className="fila last:border-0" data-testid="ingrediente">
                <span className="min-w-0 flex-1 py-2">
                  <span className="block truncate font-semibold">{i.nombre}</span>
                  <span className="block text-[13px] text-mu">{textoCantidad(i)}</span>
                </span>
                <span className="shrink-0 text-right"><span className="num block text-[16px]">{formatoNumero(i.kcal)}</span><LineaMacros m={i} /></span>
                <button className="flex h-9 w-9 shrink-0 items-center justify-center text-mu2 hover:text-miss" aria-label={`Quitar ${i.nombre}`}
                  onClick={() => setIngredientes((l) => l.filter((x) => x.id !== i.id))}><Icono n="basura" size={17} /></button>
              </div>
            ))}
            <div className={`py-3 ${ingredientes.length ? 'border-t border-ln2' : ''}`}>
              <div className="relative">
                <Icono n="buscar" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mu" />
                <input className="campo pl-10" placeholder="Agregar ingrediente: harina de maíz, queso…" value={texto}
                  onChange={(e) => setTexto(e.target.value)} aria-label="Buscar ingrediente" />
              </div>
              {resultados.length > 0 && (
                <ul className="mt-2 flex flex-col" aria-label="Resultados">
                  {resultados.map((a) => (
                    <li key={a.id}>
                      <button className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-2 text-left hover:bg-sf2" onClick={() => setElegido(a)} data-testid="resultado-ingrediente">
                        <span className="truncate">{a.nombre}</span><Icono n="mas" size={18} className="shrink-0 oro" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {texto.trim() && !resultados.length && <p className="mt-2 text-[13px] text-mu">No encontramos “{texto}”. Podés crearlo como alimento propio desde Agregar.</p>}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <section className="tarjeta">
            <div className="etiqueta">Rinde</div>
            <div className="mt-2 flex items-center gap-3">
              <button className="chip h-11 w-11" aria-label="Menos porciones" onClick={() => setPorciones((p) => Math.max(1, p - 1))}><Icono n="menos" size={16} /></button>
              <span className="num w-12 text-center text-[28px] oro" aria-label="Porciones">{n}</span>
              <button className="chip h-11 w-11" aria-label="Más porciones" onClick={() => setPorciones((p) => Math.min(60, p + 1))}><Icono n="mas" size={16} /></button>
              <span className="text-[14px] text-mu">porciones</span>
            </div>
            <label className="mt-4 block"><span className="etiqueta">Peso de la fuente terminada (opcional)</span>
              <span className="relative mt-1.5 block">
                <input className="campo pr-10" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} aria-label="Peso total cocido" placeholder={crudo ? `${formatoNumero(crudo)} (suma de ingredientes)` : 'en gramos'} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-mu">g</span>
              </span>
            </label>
            <p className="mt-1.5 text-[12px] text-mu2">Al cocinar cambia el peso (se evapora agua). Si pesás la fuente sin el recipiente, la porción en gramos sale exacta.</p>
          </section>

          <section className="panel-dia" data-testid="por-porcion">
            <div className="etiqueta">Cada porción ({formatoNumero(pesoFinal / n)} g)</div>
            <div className="num mt-1 text-[40px] leading-none oro">{formatoNumero(total.kcal / n)} <span className="font-body text-[14px] text-mu">kcal</span></div>
            <div className="mt-3"><LineaMacros m={{ kcal: 0, prot: total.prot / n, carb: total.carb / n, gras: total.gras / n }} /></div>
            <p className="mt-3 text-[13px] text-mu">Receta entera: {formatoNumero(total.kcal)} kcal · {formatoNumero(pesoFinal)} g</p>
          </section>

          <button className="btn w-full" disabled={!valido || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar receta'}</button>
          {editarId && (borrar ? (
            <div className="rounded-[12px] border border-miss p-3 text-[14px]">
              <p>¿Borrar la receta? Lo que ya registraste en el diario queda igual.</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-sec flex-1 text-miss" onClick={async () => { await repo.borrarPropio(usuario.uid, editarId); aviso('Receta borrada'); nav(-1); }}>Sí, borrar</button>
                <button className="btn-sec flex-1" onClick={() => setBorrar(false)}>Cancelar</button>
              </div>
            </div>
          ) : <button className="btn-sec text-miss" onClick={() => setBorrar(true)}><Icono n="basura" size={16} />Borrar receta</button>)}
        </aside>
      </div>

      <Hoja abierta={!!elegido} alCerrar={() => setElegido(null)} etiqueta="Ingrediente" titulo={elegido?.nombre ?? ''}>
        {elegido && (
          <ElegirPorcion key={elegido.id} alimento={elegido} textoBoton="Sumar a la receta"
            alAgregar={(item) => { setIngredientes((l) => [...l, item]); setElegido(null); setTexto(''); }} />
        )}
      </Hoja>
    </div>
  );
}
