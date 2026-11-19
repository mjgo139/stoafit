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
  await page.getByRole('button', { name: 'Buscar' }).click();
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
