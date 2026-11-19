/** Novedades de cada versión: se muestran en Perfil → Ajustes (solo admin) */
export const NOVEDADES: { version: string; fecha: string; cambios: string[] }[] = [
  {
    version: '1.2.1',
    fecha: '2026-11-19',
    cambios: [
      'Repetir una comida de cualquier día: en cada comida del Diario, "Repetir…" → elegís el día, la comida (el desayuno del martes, la cena de ayer…) y qué alimentos traer.',
    ],
  },
  {
    version: '1.2.0',
    fecha: '2026-11-19',
    cambios: [
      'Base compartida de productos: un código de barras = un solo producto, igual para todos los usuarios.',
      'Si un código no está, cualquiera lo carga a mano y queda "sin verificar" para todos; lo de Open Food Facts también pasa a la base.',
      'Cargadores (los marca el admin): leen la etiqueta con una foto (IA) y corrigen o verifican productos.',
      'Reportar error en un producto; panel Productos con reportes, sin verificar y cargadores.',
    ],
  },
  {
    version: '1.1.0',
    fecha: '2026-11-19',
    cambios: [
      'Código de barras gratis: escaneá el envase con la cámara (o escribí el código) y busca en Open Food Facts; si no está, cargás la etiqueta una vez.',
      'Repetir: el día anterior entero, "Copiar a…" otro día o comida, y comidas guardadas ("Mi desayuno de siempre").',
      'Recetas: ingredientes, en cuántas porciones se reparte y el peso cocido; se buscan como cualquier alimento.',
      'Crear alimento mejorado: valores "por porción" o "cada 100 g", marca, código, otras medidas, editar y borrar.',
      'Ingredientes crudos nuevos para recetas: harinas, almidón de mandioca, arroz y fideos secos, carne picada.',
    ],
  },
  {
    version: '1.0.0',
    fecha: '2026-11-19',
    cambios: [
      'Primera versión de StoaFit: acceso con correo, Google o invitado.',
      'Bienvenida "Conocerte" con meta diaria calculada (Mifflin-St Jeor).',
      'Hoy: panel del día, comidas, agua, racha y tu semana.',
      'Diario con biblioteca de alimentos de Paraguay, favoritos, "lo de ayer" y alimentos propios.',
      'Plan con meta editable y días de ejemplo; Progreso con peso, medidas, semanas y promedios.',
    ],
  },
];
