import type { Alimento, GrupoAlimento, Porcion } from './tipos';

/**
 * Biblioteca de alimentos comunes de Paraguay y la región.
 * Valores APROXIMADOS cada 100 g (o 100 ml), tomados de tablas de composición generales
 * (cocido = como se come). Las porciones caseras son las más usadas.
 */
export const GRUPOS: { v: GrupoAlimento; t: string }[] = [
  { v: 'tipicos', t: 'Típicos' },
  { v: 'carnes', t: 'Carnes y huevos' },
  { v: 'lacteos', t: 'Lácteos' },
  { v: 'cereales', t: 'Cereales y panes' },
  { v: 'legumbres', t: 'Legumbres' },
  { v: 'verduras', t: 'Verduras' },
  { v: 'frutas', t: 'Frutas' },
  { v: 'bebidas', t: 'Bebidas' },
  { v: 'grasas', t: 'Aceites y frutos secos' },
  { v: 'dulces', t: 'Dulces' },
  { v: 'rapida', t: 'Al paso' },
];

const p = (nombre: string, gramos: number): Porcion => ({ nombre, gramos });
const g100 = p('100 g', 100);
const ml100 = p('100 ml', 100);

type Fila = [id: string, nombre: string, grupo: GrupoAlimento, kcal: number, prot: number, carb: number, gras: number, porciones: Porcion[], alias?: string[]];

const FILAS: Fila[] = [
  // ── Típicos de Paraguay ──
  ['chipa', 'Chipa', 'tipicos', 330, 9, 40, 15, [p('1 unidad mediana', 60), p('1 chipa grande', 100), g100], ['chipa almidon']],
  ['chipa-guasu', 'Chipa guasu', 'tipicos', 230, 8, 22, 12, [p('1 porción', 150), g100], ['chipa guazu']],
  ['sopa-paraguaya', 'Sopa paraguaya', 'tipicos', 290, 9, 28, 16, [p('1 porción', 120), p('1 cuadradito', 70), g100]],
  ['mbeju', 'Mbejú', 'tipicos', 310, 8, 42, 12, [p('1 unidad', 120), g100], ['mbeyu']],
  ['vori-vori', 'Vorí vorí de gallina', 'tipicos', 95, 6, 10, 3.5, [p('1 plato hondo', 350), p('1 taza', 250), g100], ['bori bori', 'sopa']],
  ['bife-koygua', 'Bife koygua', 'tipicos', 185, 18, 4, 11, [p('1 porción', 200), g100], ['bife escondido']],
  ['pira-caldo', 'Pira caldo', 'tipicos', 85, 8, 3, 4.5, [p('1 plato hondo', 350), g100], ['caldo de pescado']],
  ['soo-yosopy', "So'o yosopy", 'tipicos', 80, 7, 6, 3, [p('1 plato hondo', 350), g100], ['soyo']],
  ['tortilla-py', 'Tortilla paraguaya', 'tipicos', 260, 9, 22, 15, [p('1 unidad', 80), g100], ['tortilla']],
  ['kiveve', 'Kiveve', 'tipicos', 140, 3.5, 17, 7, [p('1 porción', 200), g100]],
  ['pastel-mandio', "Pastel mandi'o", 'tipicos', 260, 7, 28, 13, [p('1 unidad', 90), g100], ['pastel mandioca']],
  ['payagua-mascada', 'Payaguá mascada', 'tipicos', 245, 10, 24, 12, [p('1 unidad', 80), g100]],
  ['locro', 'Locro', 'tipicos', 110, 5, 14, 3.5, [p('1 plato hondo', 350), g100]],
  ['mbaipy', 'Mbaipy', 'tipicos', 120, 6, 15, 4, [p('1 plato', 300), g100]],
  ['guiso-arroz', "Guiso de arroz (arroz quesú / kesu)", 'tipicos', 150, 6, 22, 4, [p('1 plato', 300), p('1 cucharón', 150), g100], ['guiso', 'arroz quesu']],
  ['guiso-fideo', 'Guiso de fideo', 'tipicos', 145, 7, 20, 4, [p('1 plato', 300), p('1 cucharón', 150), g100], ['tallarin']],
  ['mandioca', 'Mandioca hervida', 'tipicos', 125, 1, 30, 0.3, [p('1 trozo', 100), p('1 porción', 200), g100], ['mandio', 'yuca']],
  ['cocido-leche', 'Cocido con leche y azúcar', 'bebidas', 65, 2, 9, 2, [p('1 taza', 250), p('1 jarro', 350), ml100], ['cocido']],
  ['cocido-negro', 'Cocido negro con azúcar', 'bebidas', 25, 0, 6.5, 0, [p('1 taza', 250), ml100]],
  ['terere', 'Tereré (sin azúcar)', 'bebidas', 2, 0, 0.4, 0, [p('1 guampa', 150), p('1 jarra', 1000), ml100], ['yerba', 'agua']],
  ['mate', 'Mate (sin azúcar)', 'bebidas', 2, 0, 0.4, 0, [p('1 mate', 60), ml100]],
  ['queso-py', 'Queso Paraguay', 'lacteos', 280, 20, 2, 21, [p('1 rodaja', 30), p('1 trozo', 50), g100], ['queso fresco']],
  ['empanada-carne', 'Empanada de carne (frita)', 'rapida', 300, 11, 26, 17, [p('1 unidad', 110), g100], ['empanada']],
  ['empanada-mandioca', 'Empanada de mandioca', 'rapida', 280, 8, 30, 14, [p('1 unidad', 100), g100]],
  ['croqueta', 'Croqueta de carne', 'rapida', 270, 12, 20, 16, [p('1 unidad', 70), g100]],
  ['lomito-arabe', 'Lomito árabe', 'rapida', 220, 12, 20, 10, [p('1 unidad', 350), p('medio', 175), g100], ['shawarma']],
  ['pancho', 'Pancho (con pan)', 'rapida', 270, 10, 25, 14, [p('1 unidad', 120), g100], ['hot dog', 'salchicha']],
  ['hamburguesa', 'Hamburguesa completa', 'rapida', 250, 13, 22, 12, [p('1 unidad', 220), g100]],
  ['pizza', 'Pizza de muzzarella', 'rapida', 270, 11, 32, 10, [p('1 porción', 120), g100]],
  ['milanesa-carne', 'Milanesa de carne (frita)', 'carnes', 290, 20, 14, 17, [p('1 unidad', 130), g100], ['milanesa']],
  ['milanesa-pollo', 'Milanesa de pollo (al horno)', 'carnes', 220, 22, 12, 9, [p('1 unidad', 130), g100]],
  ['asado-costilla', 'Asado de costilla', 'carnes', 330, 24, 0, 26, [p('1 porción', 200), g100], ['costilla', 'asado']],
  ['chorizo', 'Chorizo parrillero', 'carnes', 300, 15, 2, 26, [p('1 unidad', 90), g100]],
  ['butifarra', 'Butifarra', 'carnes', 290, 14, 3, 25, [p('1 unidad', 80), g100]],
  // ── Carnes y huevos ──
  ['carne-magra', 'Carne vacuna magra (asada)', 'carnes', 200, 28, 0, 9, [p('1 bife', 150), p('1 porción', 120), g100], ['bife', 'nalga', 'lomo']],
  ['carne-picada', 'Carne picada común (cocida)', 'carnes', 250, 25, 0, 16, [p('1 porción', 100), g100]],
  ['pollo-pechuga', 'Pechuga de pollo (a la plancha)', 'carnes', 165, 31, 0, 3.6, [p('1 pechuga', 150), p('1 filet', 100), g100], ['pollo']],
  ['pollo-muslo', 'Muslo de pollo con piel (asado)', 'carnes', 230, 24, 0, 15, [p('1 pata muslo', 160), g100]],
  ['cerdo', 'Carne de cerdo magra (asada)', 'carnes', 210, 27, 0, 11, [p('1 porción', 120), g100], ['chancho']],
  ['surubi', 'Surubí (a la plancha)', 'carnes', 120, 21, 0, 4, [p('1 filet', 150), g100], ['pescado']],
  ['merluza', 'Merluza (al horno)', 'carnes', 95, 19, 0, 1.5, [p('1 filet', 150), g100], ['pescado']],
  ['atun-lata', 'Atún al natural (lata)', 'carnes', 115, 26, 0, 1, [p('1 lata escurrida', 120), g100]],
  ['huevo', 'Huevo', 'carnes', 145, 12.5, 0.7, 10, [p('1 unidad', 50), p('2 unidades', 100)], ['huevo duro', 'huevo frito']],
  ['jamon-cocido', 'Jamón cocido', 'carnes', 120, 18, 1, 4.5, [p('1 feta', 20), p('3 fetas', 60), g100], ['jamon']],
  ['mortadela', 'Mortadela', 'carnes', 310, 15, 3, 27, [p('1 feta', 15), g100]],
  // ── Lácteos ──
  ['leche-entera', 'Leche entera', 'lacteos', 62, 3.2, 4.7, 3.3, [p('1 vaso', 200), p('1 taza', 250), ml100]],
  ['leche-descremada', 'Leche descremada', 'lacteos', 35, 3.4, 5, 0.1, [p('1 vaso', 200), p('1 taza', 250), ml100]],
  ['yogur-bebible', 'Yogur bebible', 'lacteos', 80, 3, 13, 1.8, [p('1 vaso', 200), ml100], ['yogurt']],
  ['yogur-natural', 'Yogur natural', 'lacteos', 62, 3.5, 4.7, 3.3, [p('1 pote', 125), g100], ['yogurt']],
  ['queso-muzzarella', 'Queso muzzarella', 'lacteos', 300, 22, 2.2, 22, [p('1 feta', 20), p('1 trozo', 30), g100]],
  ['queso-crema', 'Queso crema', 'lacteos', 250, 6, 4, 24, [p('1 cucharada', 15), g100]],
  ['ricota', 'Ricota', 'lacteos', 140, 11, 3, 9, [p('1 cucharada', 30), g100]],
  // ── Cereales y panes ──
  ['arroz', 'Arroz blanco cocido', 'cereales', 130, 2.7, 28, 0.3, [p('1 taza', 160), p('1 cucharón', 120), p('1 cucharada', 20), g100]],
  ['arroz-integral', 'Arroz integral cocido', 'cereales', 112, 2.6, 23, 0.9, [p('1 taza', 160), g100]],
  ['fideos', 'Fideos cocidos', 'cereales', 155, 5.5, 31, 0.9, [p('1 plato', 220), p('1 taza', 140), g100], ['tallarines', 'pasta']],
  ['pan-felipe', 'Pan felipe', 'cereales', 270, 9, 55, 1.5, [p('1 unidad', 50), p('medio', 25), g100], ['pan']],
  ['pan-lactal', 'Pan lactal', 'cereales', 260, 8, 48, 4, [p('1 rodaja', 25), p('2 rodajas', 50), g100], ['pan de molde']],
  ['pan-integral', 'Pan integral', 'cereales', 250, 10, 43, 4, [p('1 rodaja', 30), p('2 rodajas', 60), g100]],
  ['galleta', 'Galleta cuadrada', 'cereales', 410, 9, 70, 10, [p('1 unidad', 15), p('3 unidades', 45), g100], ['galletita']],
  ['galletita-agua', 'Galletitas de agua', 'cereales', 420, 10, 70, 11, [p('3 unidades', 25), g100]],
  ['avena', 'Avena en copos', 'cereales', 380, 13, 60, 7, [p('1 cucharada', 10), p('½ taza', 40), g100]],
  ['harina-maiz', 'Polenta cocida', 'cereales', 85, 2, 18, 0.5, [p('1 porción', 200), g100], ['mbaipy sin queso']],
  ['granola', 'Granola', 'cereales', 450, 10, 64, 17, [p('½ taza', 50), g100]],
  ['tortilla-trigo', 'Tortilla de trigo (wrap)', 'cereales', 300, 8, 50, 7, [p('1 unidad', 45), g100], ['rapidita']],
  // ── Legumbres ──
  ['poroto', 'Poroto cocido', 'legumbres', 130, 8.5, 22, 0.6, [p('1 taza', 170), p('1 cucharón', 120), g100], ['frijol', 'feijao']],
  ['lenteja', 'Lenteja cocida', 'legumbres', 115, 9, 20, 0.4, [p('1 taza', 200), p('1 cucharón', 120), g100]],
  ['garbanzo', 'Garbanzo cocido', 'legumbres', 165, 9, 27, 2.6, [p('1 taza', 165), g100]],
  ['soja', 'Soja cocida', 'legumbres', 175, 17, 10, 9, [p('½ taza', 90), g100]],
  ['locote-relleno', 'Poroto con locro (porotos con maíz)', 'legumbres', 125, 6, 21, 2, [p('1 plato', 300), g100]],
  // ── Verduras ──
  ['ensalada-mixta', 'Ensalada mixta (lechuga, tomate, cebolla)', 'verduras', 20, 1, 4, 0.2, [p('1 plato', 150), g100], ['ensalada']],
  ['tomate', 'Tomate', 'verduras', 18, 0.9, 3.9, 0.2, [p('1 unidad', 120), g100]],
  ['lechuga', 'Lechuga', 'verduras', 15, 1.4, 2.9, 0.2, [p('1 plato', 60), g100]],
  ['zanahoria', 'Zanahoria', 'verduras', 41, 0.9, 10, 0.2, [p('1 unidad', 80), p('1 taza rallada', 110), g100]],
  ['zapallo', 'Zapallo cocido', 'verduras', 30, 1, 7, 0.1, [p('1 porción', 150), g100], ['calabaza']],
  ['papa', 'Papa hervida', 'verduras', 87, 1.9, 20, 0.1, [p('1 unidad mediana', 150), g100]],
  ['papa-frita', 'Papas fritas', 'verduras', 310, 3.4, 41, 15, [p('1 porción', 120), g100]],
  ['pure-papa', 'Puré de papas', 'verduras', 105, 2, 15, 4, [p('1 porción', 200), g100], ['pure']],
  ['batata', 'Batata asada', 'verduras', 90, 2, 21, 0.1, [p('1 unidad', 150), g100], ['camote', 'jety']],
  ['choclo', 'Choclo hervido', 'verduras', 96, 3.4, 21, 1.5, [p('1 mazorca', 100), g100], ['maiz']],
  ['locote', 'Locote', 'verduras', 26, 1, 6, 0.3, [p('1 unidad', 120), g100], ['morron', 'pimiento']],
  ['cebolla', 'Cebolla', 'verduras', 40, 1.1, 9, 0.1, [p('1 unidad', 110), g100]],
  ['brocoli', 'Brócoli cocido', 'verduras', 35, 2.4, 7, 0.4, [p('1 taza', 150), g100]],
  ['repollo', 'Repollo', 'verduras', 25, 1.3, 6, 0.1, [p('1 taza', 90), g100]],
  ['acelga', 'Acelga cocida', 'verduras', 20, 1.9, 4, 0.1, [p('1 taza', 175), g100]],
  ['pepino', 'Pepino', 'verduras', 15, 0.7, 3.6, 0.1, [p('1 unidad', 200), g100]],
  ['berenjena', 'Berenjena asada', 'verduras', 35, 0.8, 8.7, 0.2, [p('1 porción', 120), g100]],
  // ── Frutas ──
  ['banana', 'Banana', 'frutas', 89, 1.1, 23, 0.3, [p('1 unidad', 120), g100], ['banano']],
  ['naranja', 'Naranja', 'frutas', 47, 0.9, 12, 0.1, [p('1 unidad', 180), g100]],
  ['mandarina', 'Mandarina', 'frutas', 53, 0.8, 13, 0.3, [p('1 unidad', 90), g100]],
  ['pomelo', 'Pomelo', 'frutas', 42, 0.8, 11, 0.1, [p('½ unidad', 150), g100], ['toronja']],
  ['manzana', 'Manzana', 'frutas', 52, 0.3, 14, 0.2, [p('1 unidad', 180), g100]],
  ['pera', 'Pera', 'frutas', 57, 0.4, 15, 0.1, [p('1 unidad', 170), g100]],
  ['mango', 'Mango', 'frutas', 60, 0.8, 15, 0.4, [p('1 unidad', 200), g100]],
  ['mamon', 'Mamón', 'frutas', 43, 0.5, 11, 0.3, [p('1 taza', 145), g100], ['papaya']],
  ['sandia', 'Sandía', 'frutas', 30, 0.6, 7.6, 0.2, [p('1 tajada', 280), g100]],
  ['melon', 'Melón', 'frutas', 34, 0.8, 8, 0.2, [p('1 tajada', 160), g100]],
  ['pina', 'Piña', 'frutas', 50, 0.5, 13, 0.1, [p('1 rodaja', 100), g100], ['anana']],
  ['frutilla', 'Frutilla', 'frutas', 32, 0.7, 7.7, 0.3, [p('1 taza', 150), g100], ['fresa']],
  ['uva', 'Uva', 'frutas', 69, 0.7, 18, 0.2, [p('1 racimo chico', 120), g100]],
  ['guayaba', 'Guayaba', 'frutas', 68, 2.6, 14, 1, [p('1 unidad', 90), g100]],
  ['mburucuya', 'Mburucuyá (pulpa)', 'frutas', 97, 2.2, 23, 0.7, [p('1 unidad', 40), g100], ['maracuya']],
  ['palta', 'Palta', 'frutas', 160, 2, 8.5, 15, [p('½ unidad', 100), p('1 cucharada', 20), g100], ['aguacate']],
  ['coco-rallado', 'Coco rallado', 'frutas', 660, 7, 24, 64, [p('1 cucharada', 7), g100]],
  // ── Bebidas ──
  ['agua', 'Agua', 'bebidas', 0, 0, 0, 0, [p('1 vaso', 250), p('1 botella', 500)]],
  ['jugo-naranja', 'Jugo de naranja natural', 'bebidas', 45, 0.7, 10.4, 0.2, [p('1 vaso', 250), ml100]],
  ['jugo-polvo', 'Jugo en polvo con azúcar', 'bebidas', 40, 0, 10, 0, [p('1 vaso', 250), ml100]],
  ['gaseosa', 'Gaseosa común', 'bebidas', 42, 0, 10.6, 0, [p('1 vaso', 250), p('1 lata', 350), ml100], ['coca', 'refresco']],
  ['gaseosa-zero', 'Gaseosa sin azúcar', 'bebidas', 0.4, 0, 0.1, 0, [p('1 vaso', 250), p('1 lata', 350), ml100]],
  ['cerveza', 'Cerveza', 'bebidas', 43, 0.5, 3.6, 0, [p('1 vaso', 250), p('1 lata', 350), p('1 botella', 1000), ml100]],
  ['vino', 'Vino tinto', 'bebidas', 85, 0.1, 2.6, 0, [p('1 copa', 150), ml100]],
  ['cafe-negro', 'Café negro sin azúcar', 'bebidas', 2, 0.1, 0, 0, [p('1 taza', 200), ml100]],
  ['cafe-con-leche', 'Café con leche y azúcar', 'bebidas', 60, 2.2, 8, 2, [p('1 taza', 250), ml100]],
  ['licuado-banana', 'Licuado de banana con leche', 'bebidas', 80, 2.8, 13, 2, [p('1 vaso', 300), ml100], ['batido']],
  // ── Aceites y frutos secos ──
  ['aceite', 'Aceite', 'grasas', 884, 0, 0, 100, [p('1 cucharadita', 5), p('1 cucharada', 14)]],
  ['manteca', 'Manteca', 'grasas', 717, 0.9, 0.1, 81, [p('1 cucharadita', 5), p('1 cucharada', 14)], ['mantequilla']],
  ['mayonesa', 'Mayonesa', 'grasas', 680, 1, 1, 75, [p('1 cucharada', 15), p('1 cucharadita', 5)]],
  ['mani', 'Maní tostado', 'grasas', 585, 24, 21, 50, [p('1 puñado', 30), g100], ['cacahuate']],
  ['nueces', 'Nueces', 'grasas', 654, 15, 14, 65, [p('1 puñado', 30), g100]],
  ['almendras', 'Almendras', 'grasas', 580, 21, 22, 50, [p('1 puñado', 30), g100]],
  // ── Dulces ──
  ['azucar', 'Azúcar', 'dulces', 400, 0, 100, 0, [p('1 cucharadita', 5), p('1 cucharada', 12)]],
  ['miel', 'Miel de abeja', 'dulces', 304, 0.3, 82, 0, [p('1 cucharada', 20), p('1 cucharadita', 7)]],
  ['miel-cana', 'Miel de caña', 'dulces', 290, 0, 75, 0, [p('1 cucharada', 20)], ['melaza']],
  ['dulce-leche', 'Dulce de leche', 'dulces', 315, 7, 55, 7.5, [p('1 cucharada', 20), g100]],
  ['mermelada', 'Mermelada', 'dulces', 250, 0.4, 62, 0.1, [p('1 cucharada', 20), g100]],
  ['chocolate', 'Chocolate con leche', 'dulces', 535, 7.7, 59, 30, [p('1 barrita', 25), p('1 tableta', 100)]],
  ['alfajor', 'Alfajor', 'dulces', 430, 5, 62, 18, [p('1 unidad', 50)]],
  ['torta', 'Torta (bizcochuelo con relleno)', 'dulces', 340, 5, 50, 14, [p('1 porción', 90), g100], ['pastel']],
  ['helado', 'Helado de crema', 'dulces', 210, 3.5, 24, 11, [p('1 bocha', 70), p('1 vasito', 120), g100]],
  ['kosereva', 'Kosereva', 'dulces', 260, 0.5, 65, 0.2, [p('1 porción', 50), g100]],
  ['dulce-mamon', 'Dulce de mamón', 'dulces', 230, 0.3, 58, 0.1, [p('1 porción', 50), g100]],
  ['arroz-con-leche', 'Arroz con leche', 'dulces', 135, 3.5, 23, 3, [p('1 taza', 200), g100]],
  ['budin', 'Budín de pan', 'dulces', 230, 6, 35, 7, [p('1 porción', 120), g100]],
];

export const BIBLIOTECA: Alimento[] = FILAS.map(([id, nombre, grupo, kcal, prot, carb, gras, porciones, alias]) => ({
  id, nombre, grupo, por100: { kcal, prot, carb, gras }, porciones, ...(alias ? { alias } : {}),
}));

const POR_ID = new Map(BIBLIOTECA.map((a) => [a.id, a]));

export function buscarAlimento(id: string, propios: Alimento[] = []): Alimento | undefined {
  return POR_ID.get(id) ?? propios.find((a) => a.id === id);
}

/** Quita tildes y apóstrofos para buscar "mbeju" = "Mbejú", "soo" = "So'o" */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').toLowerCase().trim();
}

/** Busca por nombre o alias. Primero los que empiezan con lo escrito. */
export function buscar(texto: string, lista: Alimento[] = BIBLIOTECA): Alimento[] {
  const q = normalizar(texto);
  if (!q) return lista;
  const palabras = q.split(/\s+/);
  const puntaje = (a: Alimento) => {
    const n = normalizar(a.nombre);
    const al = (a.alias ?? []).map(normalizar).join(' ');
    const todo = `${n} ${al}`;
    if (!palabras.every((w) => todo.includes(w))) return -1;
    if (n.startsWith(q)) return 3;
    if (n.split(/[\s(]+/).some((w) => w.startsWith(palabras[0]))) return 2;
    return 1;
  };
  return lista.map((a) => ({ a, s: puntaje(a) })).filter((x) => x.s >= 0).sort((x, y) => y.s - x.s || x.a.nombre.localeCompare(y.a.nombre)).map((x) => x.a);
}
