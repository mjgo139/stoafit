import { expect, test, type Page } from '@playwright/test';

// v1.2.0: base compartida de productos (un código = un producto), cargadores y lectura de etiquetas con IA (modo prueba)

async function captura(page: Page, nombre: string) {
  await expect(page.getByTestId('esqueleto')).toHaveCount(0);
  const ancho = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${nombre}: la página es más ancha que la pantalla`).toBeLessThanOrEqual(ancho);
  await page.screenshot({ path: `capturas/${test.info().project.name}/${nombre}.png`, fullPage: true, animations: 'disabled' });
}

async function entrar(page: Page, email: string, nombre: string) {
  await page.goto('/');
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('stoafit');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`, ${nombre}`) })).toBeVisible();
}

async function escanear(page: Page, codigo: string) {
  await page.getByTestId('boton-escanear').click();
  await page.getByLabel('Código de barras a mano').fill(codigo);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
}

test('usuario común: crea un producto "sin verificar", sin foto, y puede reportar errores', async ({ page }) => {
  await entrar(page, 'lucas@ejemplo.com', 'Lucas');
  await page.goto('/agregar?comida=merienda');
  // Producto que no existe: lo carga a mano (sin la opción de foto)
  await escanear(page, '7840000000062');
  await expect(page.getByRole('dialog', { name: 'Cargar producto' })).toBeVisible();
  await expect(page.getByTestId('leer-foto')).toHaveCount(0);
  await page.getByLabel('Nombre del alimento').fill('Jugo de naranja');
  await page.getByLabel('Nombre de la porción').fill('1 vaso');
  await page.getByLabel('Gramos de la porción').fill('200');
  await page.getByLabel('Calorías').fill('90');
  await page.getByLabel('Carbohidratos (g)').fill('21');
  await captura(page, '90-cargar-producto-comun');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'quedó cargado para todos' })).toBeVisible();
  await expect(page.getByTestId('estado-producto')).toContainText('Sin verificar');
  // Un usuario común no puede corregir; sí reportar
  await expect(page.getByRole('button', { name: 'Corregir producto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();

  // Producto que ya existe (lo cargó otro): aparece ese mismo, con su código
  await escanear(page, '7840000000048');
  await expect(page.getByRole('dialog', { name: 'Galletitas de maíz' })).toBeVisible();
  await page.getByRole('button', { name: /Reportar error/ }).click();
  await page.getByRole('button', { name: 'La porción está mal' }).click();
  await captura(page, '91-reportar');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'un cargador lo va a revisar' })).toBeVisible();

  // Volver a escanear el código nuevo: un código = un producto
  await escanear(page, '7840000000062');
  await expect(page.getByRole('dialog', { name: 'Jugo de naranja' })).toBeVisible();

  // No ve el panel de productos
  await page.goto('/perfil');
  await expect(page.getByTestId('ir-productos')).toHaveCount(0);
});

test('admin: lee la etiqueta con foto, revisa reportes, verifica y marca cargadores', async ({ page }) => {
  await entrar(page, 'sofia@ejemplo.com', 'Sofía');
  await page.goto('/agregar?comida=desayuno');
  await escanear(page, '7840000000079');
  await expect(page.getByTestId('leer-foto')).toBeVisible();
  // La foto de la etiqueta (en modo prueba la "lectura" es de ejemplo)
  await page.getByLabel('Foto de la etiqueta').setInputFiles('public/icono-192.png');
  await expect(page.getByTestId('leer-foto')).toContainText('revisá los valores');
  await expect(page.getByLabel('Calorías')).toHaveValue('145');
  await expect(page.getByLabel('Proteínas (g)')).toHaveValue('3,5');
  await expect(page.getByLabel('Gramos de la porción')).toHaveValue('50');
  await expect(page.getByLabel('Nombre del alimento')).toHaveValue('Pan de leche');
  await captura(page, '92-etiqueta-leida');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByTestId('estado-producto')).toContainText('Verificado');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();

  // Panel de productos
  await page.goto('/perfil');
  await page.getByTestId('ir-productos').click();
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await expect(page.getByTestId('reporte')).toHaveCount(1);
  await captura(page, '93-panel-reportes');
  await page.getByTestId('reporte').getByRole('button', { name: 'Revisar' }).click();
  await page.getByLabel('Calorías').fill('132');
  await page.getByRole('button', { name: 'Guardar y verificar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'corregido y verificado' })).toBeVisible();
  await page.getByTestId('reporte').getByRole('button', { name: 'Archivar' }).click();
  await expect(page.getByTestId('reporte')).toHaveCount(0);

  await page.getByRole('radio', { name: /Sin verificar/ }).click();
  await expect(page.getByTestId('pendiente')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Cargadores' }).click();
  await page.getByLabel('Correo del nuevo cargador').fill('nadie@ejemplo.com');
  await page.getByRole('button', { name: 'Hacer cargador' }).click();
  await expect(page.getByRole('alert')).toContainText('No hay ninguna cuenta');
  await page.getByLabel('Correo del nuevo cargador').fill('lucas@ejemplo.com');
  await page.getByRole('button', { name: 'Hacer cargador' }).click();
  await expect(page.getByTestId('cargador')).toContainText('Lucas');
  await captura(page, '94-cargadores');
});

test('cargador: "Leer etiqueta con foto" también al crear un alimento propio', async ({ page }) => {
  await entrar(page, 'sofia@ejemplo.com', 'Sofía');
  await page.getByRole('link', { name: 'Agregar a Almuerzo' }).click();
  await page.getByRole('button', { name: /Crear alimento/ }).filter({ visible: true }).first().click();
  await expect(page.getByTestId('leer-foto')).toBeVisible();
});

test('etiqueta: la foto se saca con la cámara de adentro de la app (sin salir a la cámara del sistema)', async ({ page }) => {
  await entrar(page, 'sofia@ejemplo.com', 'Sofía');
  await page.goto('/agregar?comida=desayuno');
  await escanear(page, '7840000000086');
  await page.getByRole('button', { name: 'Leer etiqueta con foto' }).click();
  await expect(page.getByTestId('camara-foto')).toBeVisible();
  await expect(page.getByTestId('sacar-foto')).toBeEnabled();
  await page.screenshot({ path: `capturas/${test.info().project.name}/93b-camara-etiqueta.png`, animations: 'disabled' });
  await page.getByTestId('sacar-foto').click();
  await expect(page.getByTestId('camara-foto')).toHaveCount(0);
  await expect(page.getByTestId('leer-foto')).toContainText('revisá los valores');
  await expect(page.getByLabel('Calorías')).toHaveValue('145');
  // El botón atrás de Android cierra la cámara sin salir de la pantalla
  await page.getByRole('button', { name: 'Leer otra foto' }).click();
  await expect(page.getByTestId('camara-foto')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('stoafit:atras')));
  await expect(page.getByTestId('camara-foto')).toHaveCount(0);
  await expect(page.getByTestId('leer-foto')).toBeVisible();
});

test('crear alimento con código de barras: queda en la base compartida y otro usuario lo encuentra al escanear', async ({ page }) => {
  await entrar(page, 'sofia@ejemplo.com', 'Sofía');
  await page.goto('/agregar?comida=desayuno');
  await page.getByRole('button', { name: /Crear alimento/ }).filter({ visible: true }).first().click();
  await page.getByLabel('Foto de la etiqueta').setInputFiles('public/icono-192.png');
  await expect(page.getByTestId('leer-foto')).toContainText('revisá los valores');
  await page.getByLabel('Código de barras del alimento').fill('7840000000111');
  await expect(page.getByTestId('codigo-nuevo')).toContainText('quien lo escanee después lo encuentra');
  await page.getByRole('button', { name: 'Guardar producto para todos' }).click();
  await expect(page.getByText(/quedó cargado para todos/)).toBeVisible();

  // Otro usuario lo escanea y le aparece el producto (modo prueba: la base está en memoria, misma sesión del navegador)
  await page.goto('/agregar?comida=almuerzo');
  await escanear(page, '7840000000111');
  await expect(page.getByRole('dialog', { name: 'Pan de leche' })).toBeVisible();
});

test('buscar por nombre: un usuario común encuentra productos de la base compartida que nunca escaneó', async ({ page }) => {
  await entrar(page, 'lucas@ejemplo.com', 'Lucas');
  await page.goto('/agregar?comida=desayuno');
  await page.getByLabel('Buscar alimento').fill('lactal');
  await expect(page.getByTestId('alimento').filter({ hasText: 'Pan lactal integral' })).toBeVisible();
  // También por la marca
  await page.getByLabel('Buscar alimento').fill('panificadora');
  await expect(page.getByTestId('alimento').filter({ hasText: 'Pan lactal integral' })).toBeVisible();
});

test('recetas: pestaña propia y una receta con un producto de StoaFit en gramos', async ({ page }) => {
  await entrar(page, 'lucas@ejemplo.com', 'Lucas');
  await page.goto('/agregar?comida=almuerzo');
  await page.getByRole('tab', { name: 'Recetas' }).click();
  await expect(page.getByText('Tus recetas').first()).toBeVisible();
  await page.getByTestId('crear-receta').click();
  await page.getByLabel('Nombre de la receta').fill('Tostadas de la casa');
  await page.getByLabel('Buscar ingrediente').fill('lactal');
  await page.getByTestId('resultado-ingrediente').filter({ hasText: 'Pan lactal integral' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Unidad').selectOption('g');
  await d.getByLabel('Cantidad', { exact: true }).fill('200');
  await d.getByRole('button', { name: 'Sumar a la receta' }).click();
  await expect(page.getByTestId('ingrediente')).toHaveCount(1);
  await expect(page.getByTestId('ingrediente')).toContainText('500'); // 200 g × 250 kcal/100 g
  await page.getByRole('button', { name: 'Guardar receta' }).click();
  await page.getByRole('tab', { name: 'Recetas' }).click();
  await expect(page.getByTestId('alimento').filter({ hasText: 'Tostadas de la casa' })).toBeVisible();
  await page.getByRole('tab', { name: 'Mis alimentos' }).click();
  await expect(page.getByTestId('alimento').filter({ hasText: 'Tostadas de la casa' })).toHaveCount(0);
});

test('crear alimento sin código: queda para todos; el privado de Mis alimentos solo lo ve quien lo creó', async ({ page }) => {
  await entrar(page, 'lucas@ejemplo.com', 'Lucas');
  await page.goto('/agregar?comida=merienda');
  // Público, sin código
  await page.getByRole('button', { name: /Crear alimento/ }).filter({ visible: true }).first().click();
  await expect(page.getByTestId('aviso-visibilidad')).toContainText('lo encuentren todos');
  await page.getByLabel('Nombre del alimento').fill('Chipa de doña Rosa');
  await page.getByLabel('Calorías').fill('210');
  await page.getByRole('button', { name: 'Guardar alimento' }).click();
  await expect(page.getByText(/quedó cargado para todos/)).toBeVisible();
  await page.keyboard.press('Escape');
  // Privado, desde Mis alimentos
  await page.goto('/agregar?comida=merienda');
  await page.getByRole('tab', { name: 'Mis alimentos' }).click();
  await page.getByTestId('crear-privado').click();
  await expect(page.getByTestId('aviso-visibilidad')).toContainText('Solo lo ves vos');
  await page.getByLabel('Nombre del alimento').fill('Torta secreta de mi abuela');
  await page.getByLabel('Calorías').fill('350');
  await page.getByRole('button', { name: 'Guardar alimento' }).click();
  await expect(page.getByText(/quedó guardado/)).toBeVisible();

  // Otra cuenta (sin borrar la base de prueba): Sofía encuentra la chipa por nombre pero no la torta privada
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill('sofia@ejemplo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('stoafit');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('sofia@ejemplo.com').filter({ visible: true }).first()).toBeVisible();
  await page.goto('/agregar?comida=merienda');
  await page.getByLabel('Buscar alimento').fill('doña rosa');
  await expect(page.getByTestId('alimento').filter({ hasText: 'Chipa de doña Rosa' })).toBeVisible();
  await page.getByLabel('Buscar alimento').fill('torta secreta');
  await expect(page.getByTestId('alimento').filter({ hasText: 'Torta secreta' })).toHaveCount(0);
  // Sofía (admin) ve en Perfil cuántos pendientes hay para revisar
  await page.goto('/perfil');
  await expect(page.getByTestId('pendientes')).toBeVisible();
});
