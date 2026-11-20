import { useMemo, useState } from 'react';
import { nuevoId } from '../lib/logica';
import { COMIDAS, MAX_COMIDAS, comidasDe, limpiarComidas } from '../lib/nutricion';
import type { ComidaDelDia } from '../lib/tipos';
import { useSesion } from './contexto';
import { Icono } from './Icono';

/** Las comidas del día de la persona (con nombre y orden propios) */
export function useComidas(): ComidaDelDia[] {
  const { perfil } = useSesion();
  return useMemo(() => comidasDe(perfil), [perfil]);
}

/**
 * Editar las comidas del día: cambiar nombres, ordenar, quitar o agregar (hasta 10).
 * Quitar una comida no borra lo registrado: los días que la tienen la siguen mostrando.
 * Guardar = 1 escritura en el perfil.
 */
export function EditorComidas({ alGuardar }: { alGuardar: (l: ComidaDelDia[]) => void }) {
  const actuales = useComidas();
  const [l, setL] = useState<ComidaDelDia[]>(actuales);
  const cambiar = (i: number, nombre: string) => setL((x) => x.map((c, n) => (n === i ? { ...c, nombre: nombre.slice(0, 30) } : c)));
  const mover = (i: number, d: -1 | 1) => setL((x) => {
    const y = [...x];
    [y[i], y[i + d]] = [y[i + d], y[i]];
    return y;
  });
  const listos = limpiarComidas(l);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-mu">Poné los nombres que uses (por ejemplo "Pre entreno" o "Comida 1"), ordenalas o quitá las que no hacés. Lo que ya registraste no se borra.</p>
      <ul className="flex flex-col gap-2" aria-label="Tus comidas">
        {l.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1.5" data-testid="editar-comida">
            <span className="num w-6 shrink-0 text-center text-[15px] text-mu">{i + 1}</span>
            <input className="campo h-11 min-w-0 flex-1" value={c.nombre} onChange={(e) => cambiar(i, e.target.value)} aria-label={`Nombre de la comida ${i + 1}`} placeholder="Nombre" />
            <button className="chip h-11 w-9 shrink-0 px-0" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${c.nombre || 'comida'}`}><Icono n="abajo" size={16} className="rotate-180" /></button>
            <button className="chip h-11 w-9 shrink-0 px-0" disabled={i === l.length - 1} onClick={() => mover(i, 1)} aria-label={`Bajar ${c.nombre || 'comida'}`}><Icono n="abajo" size={16} /></button>
            <button className="chip h-11 w-9 shrink-0 px-0 hover:text-miss" disabled={l.length <= 1} onClick={() => setL((x) => x.filter((_, n) => n !== i))} aria-label={`Quitar ${c.nombre || 'comida'}`}><Icono n="basura" size={16} /></button>
          </li>
        ))}
      </ul>
      <button className="btn-sec" disabled={l.length >= MAX_COMIDAS} onClick={() => setL((x) => [...x, { id: 'c-' + nuevoId().slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '0'), nombre: `Comida ${x.length + 1}` }])}>
        <Icono n="mas" size={20} />Agregar otra comida
      </button>
      <button className="text-[13.5px] font-semibold text-mu underline" onClick={() => setL(COMIDAS.map(({ id, nombre }) => ({ id, nombre })))}>Volver a las de siempre</button>
      <button className="btn w-full" disabled={!listos.length} onClick={() => alGuardar(listos)}>Guardar comidas</button>
    </div>
  );
}
