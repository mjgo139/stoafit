import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { formatoNumero } from '../lib/logica';

/**
 * Regla deslizable: se arrastra con el dedo o el mouse, con la rueda o con las flechas.
 * No usa scroll nativo (en PC no se podía arrastrar).
 */
export function Regla({ valor, min, max, paso = 1, unidad, etiqueta, alCambiar, decimales = 0 }: {
  valor: number; min: number; max: number; paso?: number; unidad: string; etiqueta: string; decimales?: number;
  alCambiar: (v: number) => void;
}) {
  const ancho = 12; // px por paso
  const arrastre = useRef<{ x: number; v: number } | null>(null);
  const ajustar = (v: number) => Math.min(max, Math.max(min, Math.round(v / paso) * paso));
  const fijar = (v: number) => alCambiar(Number(ajustar(v).toFixed(decimales)));

  function bajar(e: PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, v: valor };
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (!arrastre.current) return;
    fijar(arrastre.current.v - ((e.clientX - arrastre.current.x) / ancho) * paso);
  }
  function soltar() { arrastre.current = null; }
  function rueda(e: WheelEvent<HTMLDivElement>) {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    fijar(valor + Math.sign(d) * paso);
  }
  function tecla(e: KeyboardEvent<HTMLDivElement>) {
    const m: Record<string, number> = { ArrowRight: paso, ArrowUp: paso, ArrowLeft: -paso, ArrowDown: -paso, PageUp: paso * 10, PageDown: -paso * 10 };
    if (e.key in m) { e.preventDefault(); fijar(valor + m[e.key]); }
  }

  const marcas = [];
  const desde = Math.floor((valor - 20 * paso) / paso) * paso;
  for (let i = 0; i <= 40; i++) {
    const v = Number((desde + i * paso).toFixed(4));
    if (v < min || v > max) continue;
    const grande = Math.abs(Math.round(v / (paso * 5)) * paso * 5 - v) < paso / 2;
    marcas.push(
      <div key={v} className="absolute bottom-0 flex flex-col items-center" style={{ left: `calc(50% + ${((v - valor) / paso) * ancho}px)`, transform: 'translateX(-50%)' }}>
        {grande && Math.abs(Math.round(v / (paso * 10)) * paso * 10 - v) < paso / 2 && (
          <span className="mb-1 text-[11px] text-mu2">{formatoNumero(v, decimales)}</span>
        )}
        <span className={`w-px ${grande ? 'h-6 bg-ln3' : 'h-3.5 bg-ln'}`} />
      </div>,
    );
  }

  return (
    <div>
      <div className="text-center">
        <span className="num text-[44px] leading-none oro">{formatoNumero(valor, decimales)}</span>
        <span className="ml-1.5 text-[16px] font-semibold text-mu">{unidad}</span>
      </div>
      <div role="slider" tabIndex={0} aria-label={etiqueta} aria-valuemin={min} aria-valuemax={max} aria-valuenow={valor} data-testid="regla"
        className="regla relative mt-3 h-16 cursor-grab touch-none select-none overflow-hidden rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
        onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onWheel={rueda} onKeyDown={tecla}>
        {marcas}
        <span className="absolute bottom-0 left-1/2 h-10 w-[3px] -translate-x-1/2 rounded-full bg-gold" aria-hidden />
      </div>
      <div className="mt-2 flex justify-center gap-2">
        <button type="button" className="chip h-9 w-11" aria-label={`Menos ${etiqueta.toLowerCase()}`} onClick={() => fijar(valor - paso)}>−</button>
        <button type="button" className="chip h-9 w-11" aria-label={`Más ${etiqueta.toLowerCase()}`} onClick={() => fijar(valor + paso)}>+</button>
      </div>
    </div>
  );
}
