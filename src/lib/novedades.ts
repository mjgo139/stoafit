/** Novedades de cada versión: se muestran en Perfil → Ajustes (solo admin) */
export const NOVEDADES: { version: string; fecha: string; cambios: string[] }[] = [
  {
    version: '1.9.0',
    fecha: '2026-11-21',
    cambios: [
      'Ahora StoaFit arranca en Noche romana, como el resto de la familia. El tema se elige entre Noche romana, Mármol y Sistema.',
      'El Panel del día y Tu semana son las mismas piezas que en StoaGym.',
      'Perfil, Progreso y Plan tienen la cabecera igual que en las otras apps (por ejemplo, "Tu camino" arriba y "Progreso" como título).',
      'Aviso de modo prueba arriba de cada pantalla, como en StoaGym.',
    ],
  },
  {
    version: '1.8.1',
    fecha: '2026-11-21',
    cambios: [
      'La barra lateral de la PC y las pestañas del celular ahora son las mismas piezas que usan todas las apps de la familia estoica.',
    ],
  },
  {
    version: '1.8.0',
    fecha: '2026-11-21',
    cambios: [
      'El diseño ahora sale de la familia estoica (el mismo de StoaGym, Stoica y la futura app de mente): colores, letras, íconos y piezas iguales en las 4 apps.',
      'Barra lateral de la PC con los colores de la familia; los días cumplidos se marcan con el verde de la familia.',
      'Tu color de acento y los colores de los gráficos se mantienen.',
    ],
  },
  {
    version: '1.7.2',
    fecha: '2026-11-20',
    cambios: [
      'Letras y tamaños unificados con una sola escala, como StoaGym (11 · 12,5 · 13,5 · 15 · 16 · 18 · 20 · 26).',
      'Íconos parejos: mismo trazo y tres tamaños (16, 20 y 23); se redibujaron el plato, el código de barras y la llama de la racha.',
      'Saludo de Hoy y pestañas de abajo con el mismo tamaño y peso que StoaGym; los atajos de Agregar quedan alineados.',
    ],
  },
  {
    version: '1.7.1',
    fecha: '2026-11-20',
    cambios: [
      'PC: la barra lateral muestra el emblema (laurel con la manzana), StoaFit en dorado y una línea dorada, como StoaGym.',
    ],
  },
  {
    version: '1.7.0',
    fecha: '2026-11-20',
    cambios: [
      'Nuevo estilo, igual al de StoaGym: oscuro "Noche romana" con oro brillante, fondo de mármol con vetas doradas y bordes marrón dorado.',
      'Títulos de página con la letra Cinzel, botones dorados con degradé y campos y fichas con las medidas de la familia.',
    ],
  },
  {
    version: '1.6.4',
    fecha: '2026-11-19',
    cambios: [
      'Android: la app ahora pide permiso para la cámara (escanear códigos y sacar la foto de la etiqueta).',
      'Cargadores y admin: "Leer etiqueta con foto" también aparece en "Crear alimento".',
      'Si te dan permisos de admin o cargador, se activan al volver a la app, sin cerrar sesión.',
    ],
  },
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
