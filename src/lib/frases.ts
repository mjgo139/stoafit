/** Frases estoicas: vienen de la familia (familia/frases.ts). StoaFit usa el tema 'medida'. */
import { fraseDelDia as delTema } from '../../familia/frases';
export { FRASES } from '../../familia/frases';
export const fraseDelDia = (fecha = new Date()) => delTema('medida', fecha.getTime());
