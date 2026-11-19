/** Frases estoicas sobre templanza y moderación (traducciones libres) */
export const FRASES: { texto: string; autor: string }[] = [
  { texto: 'No es pobre el que tiene poco, sino el que desea más.', autor: 'Séneca' },
  { texto: 'Come para vivir; no vivas para comer.', autor: 'Sócrates, citado por los estoicos' },
  { texto: 'La medida es la mejor de las cosas.', autor: 'Cleóbulo, citado por Diógenes Laercio' },
  { texto: 'Si querés hacer rico a alguien, no le agregues dinero: quitale deseos.', autor: 'Epicuro, citado por Séneca' },
  { texto: 'Nadie es libre si no es dueño de sí mismo.', autor: 'Epicteto' },
  { texto: 'Pedile a tu cuerpo solo lo necesario: comida para el hambre, bebida para la sed.', autor: 'Séneca' },
  { texto: 'Que la comida sacie el hambre, no que la provoque.', autor: 'Séneca' },
  { texto: 'Muy poco hace falta para una vida feliz.', autor: 'Marco Aurelio' },
  { texto: 'Primero decí quién querés ser; después hacé lo que tengas que hacer.', autor: 'Epicteto' },
  { texto: 'La felicidad se alcanza con pasos pequeños, pero no es cosa pequeña.', autor: 'Zenón de Citio' },
  { texto: 'Cuidá el cuerpo lo suficiente para que esté sano, y nada más.', autor: 'Séneca' },
  { texto: 'Ningún hombre es libre si es esclavo de su cuerpo.', autor: 'Séneca' },
  { texto: 'Lo que hacemos cada día importa más que lo que hacemos de vez en cuando.', autor: 'Inspirado en Séneca' },
  { texto: 'Tenés poder sobre tu mente, no sobre lo de afuera. Date cuenta y vas a encontrar fuerza.', autor: 'Marco Aurelio' },
];

/** La frase del día: cambia cada día, igual para todos */
export function fraseDelDia(fecha = new Date()): { texto: string; autor: string } {
  const n = Math.floor(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime() / 86_400_000);
  return FRASES[n % FRASES.length];
}
