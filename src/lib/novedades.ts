/** Novedades de cada versión: se muestran en Perfil → Ajustes (solo admin) */
export const NOVEDADES: { version: string; fecha: string; cambios: string[] }[] = [
  {
    version: '1.6.3',
    fecha: '2026-11-19',
    cambios: [
      'Android: al abrir la app ya no aparece el borde blanco alrededor del logo, y el ícono se adapta a la forma de tu teléfono.',
    ],
  },
  {
    version: '1.6.2',
    fecha: '2026-11-19',
    cambios: [
      'Al crear tu cuenta ya no te vuelve a pedir el nombre: te saluda y seguís.',
      'Perfil: la inicial y tu nombre quedan alineados.',
    ],
  },
  {
    version: '1.6.1',
    fecha: '2026-11-19',
    cambios: [
      'Ícono nuevo: el laurel y la manzana más grandes, igual que el resto de la familia de íconos.',
    ],
  },
  {
    version: '1.6.0',
    fecha: '2026-11-19',
    cambios: [
      'Planificá: el Diario ahora va a días futuros (hasta 60 días). Lo planificado se marca con un punto dorado y cuenta para tu racha recién cuando llega el día.',
      'Gráficos más claros: cada comida tiene su propio color en "Calorías por comida", y proteínas, carbohidratos y grasas usan colores bien distintos (también para daltonismo).',
    ],
  },
  {
    version: '1.5.2',
    fecha: '2026-11-19',
    cambios: [
      'Tocar un alimento del Diario abre la misma pantalla que al agregarlo: medida o gramos, cantidad escrita, aporte y % de tu meta, con "Guardar cambios" y "Quitar del diario".',
    ],
  },
  {
    version: '1.5.1',
    fecha: '2026-11-19',
    cambios: [
      'El agua quedó solo en el Diario; Hoy se enfoca en tus comidas y tu semana.',
      'El Diario ya no repite el anillo de Hoy: ahora tiene "Nutrientes del día" (comido · meta · quedan) y "Calorías por comida".',
    ],
  },
  {
    version: '1.5.0',
    fecha: '2026-11-19',
    cambios: [
      'Tus comidas, a tu manera: cambiá los nombres (Comida 1, Pre entreno…), ordenalas, quitá las que no hacés o agregá hasta 10. Diario → "Editar comidas" o "•••".',
      'Lo que ya registraste nunca se borra: si quitás una comida, los días que la tienen la siguen mostrando.',
      'Agregar: el título de la comida queda bien centrado y los atajos tienen diseño propio (Escanear · Solo calorías · Crear alimento).',
      'En la PC: Agregar muestra a la derecha lo que ya tiene esa comida y el Diario lleva las calorías restantes y el resumen al costado.',
    ],
  },
  {
    version: '1.4.0',
    fecha: '2026-11-19',
    cambios: [
      'Agregar tiene su ventana por comida: arriba "Desayuno ▾" (se cambia ahí), cuánto llevás en esa comida y el buscador con el escáner adentro.',
      'Pestañas más claras: Recientes · Favoritos · Mis comidas · Mis alimentos · Todos. En Recientes, "Escanear" y "Adición rápida" (solo calorías).',
      'Cada alimento tiene su "+" para agregarlo de un toque, como la última vez que lo comiste.',
      'Diario más ordenado: "Calorías restantes" (meta − comido = restan) y cada comida en su tarjeta con "Agregar alimento" y "•••" (repetir, copiar, guardar).',
    ],
  },
  {
    version: '1.3.0',
    fecha: '2026-11-19',
    cambios: [
      'Agregar alimento renovado: escribís la cantidad y elegís la medida o gramos (ml en líquidos) sueltos.',
      'Ves el anillo de calorías con el % de proteínas, carbohidratos y grasas, y cuánto es de tu meta del día.',
      'También en otros días: sumás el mismo alimento a varios días de la semana de una vez.',
      'Botón atrás de Android: cierra la hoja abierta, vuelve a Hoy y, en Hoy, hay que tocarlo dos veces para salir.',
    ],
  },
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
