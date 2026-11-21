import { Emblema as EmblemaFamilia } from '../../familia/react';

/**
 * Las piezas comunes salen de la familia estoica (carpeta `familia/`, no se edita).
 * Acá solo queda lo propio de StoaFit: la manzana del emblema.
 */
export { Laurel, Grupo, Ficha, CabeceraPagina, romano, PanelDia, TuSemana, ElegirTema, AvisoPrueba, TEMAS, TEMA_PREDETERMINADO, Avatar, BotonFoto, TarjetaPerfil } from '../../familia/react';

/** Manzana de StoaFit sobre el lienzo de 512×512 del emblema (igual que en el ícono, agrandada ×1,42). */
const MANZANA = (
  <g transform="translate(256 256) scale(1.42) translate(-256 -256)">
    <g transform="translate(198.5 184) scale(1.15)">
      <path d="M50 36C41 28 22 27 15 44c-7 17 2 43 15 52 6 4 12 4 16 2 2.5-1.2 5.5-1.2 8 0 4 2 10 2 16-2 13-9 22-35 15-52-7-17-26-16-35-8Z" />
      <path fill="none" stroke="var(--marfil)" strokeWidth="5" strokeLinecap="round" d="M50 36c0-9 2-16 7-21" />
      <path fill="var(--gold)" d="M57 19c4-10 14-14 24-12-2 10-12 16-24 12Z" />
    </g>
  </g>
);

/** Emblema de StoaFit: laurel de la familia + manzana marfil (barra lateral de la PC). */
export function Emblema({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <EmblemaFamilia size={size} figura={MANZANA} className={className} />;
}
