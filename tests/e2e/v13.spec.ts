import { expect, test, type Page } from '@playwright/test';

// v1.3.0: agregar en gramos, varios días y el botón atrás (modo prueba, datos inventados)

async function captura(page: Page, nombre: string) {
  await expect(page.getByTestId('esqueleto')).toHaveCount(0);
  const ancho = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${nombre}: la página es más ancha que la pantalla`).toBeLessThanOrEqual(ancho);
  await page.screenshot({ path: `capturas/${test.info().project.name}/${nombre}.png`, fullPage: true, animations: 'disabled' });
}

async function entrar(page: Page) {
  await page.goto('/');
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill('sofia@ejemplo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('stoafit');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /(Buen día|Buenas tardes|Buenas noches), Sofía/ })).toBeVisible();
}

const ir = (page: Page, nombre: 'Hoy' | 'Diario' | 'Plan') => page.getByRole('link', { name: nombre, exact: true }).filter({ visible: true }).click();
const atras = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('stoafit:atras')));

test('agregar en gramos, ver la meta del día y sumarlo a varios días', async ({ page }) => {
  await entrar(page);
  await page.getByRole('link', { name: 'Agregar a Almuerzo' }).click();
  await expect(page.getByTestId('accesos')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
  await captura(page, '88-agregar-ventana');
  // El "+" de una fila agrega directo, como la última vez
  await page.getByRole('button', { name: /^Agregar .+ ya$/ }).first().click();
  await expect(page.getByTestId('ya-en-comida')).toContainText('1 alimento');
  // Adición rápida
  await page.getByRole('button', { name: /Adición rápida/ }).click();
  await page.getByLabel('Qué fue').fill('Empanada en la feria');
  await page.getByLabel('Calorías', { exact: true }).fill('280');
  await page.getByRole('button', { name: 'Agregar 280 kcal' }).click();
  await expect(page.getByTestId('ya-en-comida')).toContainText('2 alimentos');
  await page.getByLabel('Buscar alimento').fill('mbeju');
  await page.getByTestId('alimento').first().click();
  const hoja = page.getByRole('dialog');
  // Pasar a gramos sueltos mantiene lo elegido y se escribe la cantidad
  await hoja.getByLabel('Unidad').selectOption('g');
  await hoja.getByLabel('Cantidad', { exact: true }).fill('50');
  await expect(hoja.getByTestId('aporte')).toContainText('kcal');
  await expect(hoja.getByTestId('de-tu-meta')).toContainText('%');
  await hoja.getByRole('button', { name: /^Sumar también el/ }).first().click();
  await hoja.getByRole('button', { name: /^Sumar también el/ }).nth(1).click();
  await captura(page, '90-agregar-gramos');
  await hoja.getByRole('button', { name: 'Agregar a 3 días' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'agregado a 3 días' })).toBeVisible();
  await page.goto('/diario');
  await expect(page.getByTestId('diario-almuerzo')).toContainText('50 g');
  await expect(page.getByTestId('diario-almuerzo')).toContainText('Adición rápida');
  await expect(page.getByTestId('restantes')).toContainText('Meta');
  await page.getByRole('button', { name: 'Más opciones de almuerzo' }).click();
  await captura(page, '89-diario-opciones');
});

test('botón atrás: cierra la hoja, vuelve a Hoy y pide confirmar para salir', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Plan');
  await expect(page).toHaveURL(/\/plan$/);
  await atras(page);
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Agregar a Cena' }).click();
  await page.getByLabel('Buscar alimento').fill('banana');
  await page.getByTestId('alimento').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await atras(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/agregar/);
  await atras(page);
  await expect(page).toHaveURL(/\/$/);
  await atras(page);
  await expect(page.getByRole('status').filter({ hasText: 'Tocá atrás otra vez para salir' })).toBeVisible();
});
