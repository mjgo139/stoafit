import type { ReactNode } from 'react';
import { romano } from '../lib/logica';

/**
 * Piezas de la familia de apps estoicas (Stoica, TITANUS…).
 * Son iguales en todas: el laurel, los títulos de sección "I · TEXTO ——" y las fichas (chips).
 */

/** Laurel de la familia (mismo dibujo que Stoica). `marca` = sello pequeño; `fondo` = marca de agua */
export function Laurel({ size = 34, fondo = false, className = '' }: { size?: number; fondo?: boolean; className?: string }) {
  return (
    <svg width={size} height={size * 120 / 132} viewBox="0 0 132 120" aria-hidden className={`${fondo ? 'laurel-fondo' : ''} ${className}`}>
      <g fill="none" stroke="var(--gold)" strokeWidth={fondo ? 2 : 3} strokeLinecap="round">
        <path d="M58 108C26 98 12 66 20 24" /><path d="M74 108c32-10 46-42 38-84" />
      </g>
      <g fill="var(--gold)">
        {[[13, 34, -25], [12, 54, -50], [17, 73, -65], [28, 89, -80], [119, 34, 25], [120, 54, 50], [115, 73, 65], [104, 89, 80]].map(([x, y, g]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4" ry="9.5" transform={`rotate(${g} ${x} ${y})`} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Emblema de StoaFit: el laurel del ícono (con sus hojitas interiores) y la manzana marfil al centro.
 * Para la barra lateral, como el emblema con la mancuerna de StoaGym.
 */
export function Emblema({ size = 40, className = '' }: { size?: number; className?: string }) {
  const hojas = [[13, 34, -25], [12, 54, -50], [17, 73, -65], [28, 89, -80], [119, 34, 25], [120, 54, 50], [115, 73, 65], [104, 89, 80]];
  const interiores = [[27, 41, 25], [28, 60, 8], [105, 41, -25], [104, 60, -8]];
  return (
    <svg width={size} height={size * 120 / 132} viewBox="0 0 132 120" aria-hidden className={className}>
      <g fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M58 108C26 98 12 66 20 24" /><path d="M74 108c32-10 46-42 38-84" />
      </g>
      <g fill="var(--gold)">
        {hojas.map(([x, y, g]) => <ellipse key={`h${x}-${y}`} cx={x} cy={y} rx="4.6" ry="10.5" transform={`rotate(${g} ${x} ${y})`} />)}
        {interiores.map(([x, y, g]) => <ellipse key={`i${x}-${y}`} cx={x} cy={y} rx="3.6" ry="7.6" transform={`rotate(${g} ${x} ${y})`} />)}
      </g>
      <g transform="translate(66 62) scale(.52) translate(-50 -54)">
        <path fill="#F3EDDF" d="M50 36C41 28 22 27 15 44c-7 17 2 43 15 52 6 4 12 4 16 2 2.5-1.2 5.5-1.2 8 0 4 2 10 2 16-2 13-9 22-35 15-52-7-17-26-16-35-8Z" />
        <path fill="none" stroke="#F3EDDF" strokeWidth="5" strokeLinecap="round" d="M50 36c0-9 2-16 7-21" />
        <path fill="var(--gold)" d="M57 19c4-10 14-14 24-12-2 10-12 16-24 12Z" />
      </g>
    </svg>
  );
}

/** Título de sección de la familia: "I · ENTRENAMIENTO DE HOY ————" con número romano y línea fina */
export function Grupo({ n, children, extra, className = '' }: { n?: number; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <h2 className="grupo">{n ? <>{romano(n)} · </> : null}{children}</h2>
      <span className="h-px flex-1 bg-ln" aria-hidden />
      {extra}
    </div>
  );
}

/** Ficha (chip) de la familia: texto chico con ícono, borde fino y fondo oscuro */
export function Ficha({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`ficha ${className}`}>{children}</span>;
}

/** Cabecera de página de la familia: etiqueta en oro, título grande y una línea (ritmo de Stoica) */
export function CabeceraPagina({ etiqueta, titulo, linea, accion }: { etiqueta: string; titulo: ReactNode; linea?: ReactNode; accion?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="grupo">{etiqueta}</div>
        <h1 className="titulo mt-1.5">{titulo}</h1>
        {linea && <p className="mt-1.5 text-[15px] font-medium text-mu">{linea}</p>}
      </div>
      {accion}
    </header>
  );
}
