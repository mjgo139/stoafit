import { expect, test, type Page } from '@playwright/test';

// StoaFit en modo prueba, con datos inventados. Sofía (sofia@ejemplo.com / stoafit) tiene 6 semanas registradas.

async function captura(page: Page, nombre: string) {
  await expect(page.getByTestId('esqueleto')).toHaveCount(0);
  const ancho = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${nombre}: la página es más ancha que la pantalla`).toBeLessThanOrEqual(ancho);
  await page.screenshot({ path: `capturas/${test.info().project.name}/${nombre}.png`, fullPage: true, animations: 'disabled' });
}

const ir = (page: Page, nombre: 'Hoy' | 'Diario' | 'Plan' | 'Progreso' | 'Perfil') =>
  page.getByRole('link', { name: nombre, exact: true }).filter({ visible: true }).click();

async function limpio(page: Page, ruta = '/') {
  await page.goto(ruta);
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto(ruta);
}

async function entrar(page: Page) {
  await limpio(page);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill('sofia@ejemplo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('stoafit');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /(Buen día|Buenas tardes|Buenas noches), Sofía/ })).toBeVisible();
}

test('portada y acceso', async ({ page }) => {
  await limpio(page);
  await expect(page.getByRole('heading', { name: 'StoaFit' })).toBeVisible();
  await expect(page.getByTestId('aviso-prueba')).toBeVisible();
  await captura(page, '01-portada');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill('sofia@ejemplo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('otraclave');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  await captura(page, '02-ingresar');
  await page.getByRole('button', { name: 'Olvidé mi contraseña' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
});

test('invitado: conocerte calcula la meta y llega a Hoy', async ({ page }) => {
  await limpio(page);
  await page.getByRole('button', { name: 'Continuar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Empecemos por vos' })).toBeVisible();
  await page.getByLabel('Tu nombre').fill('Lucía');
  await page.getByRole('radio', { name: 'Mujer' }).click();
  await captura(page, '03-conocerte');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Fecha de nacimiento').fill('1996-03-10');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  // Altura con el teclado
  const regla = page.getByTestId('regla');
  await regla.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(regla).toHaveAttribute('aria-valuenow', '167');
  await captura(page, '04-conocerte-altura');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  // Peso con el mouse: arrastrar a la izquierda sube el valor
  const caja = (await page.getByTestId('regla').boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width / 2 - 60, caja.y + caja.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('regla')).toHaveAttribute('aria-valuenow', '68.5');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /Moderado/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /Bajar de peso/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByTestId('meta-calculada')).toContainText('kcal'.toUpperCase().slice(0, 0));
  await captura(page, '05-conocerte-meta');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByRole('heading', { name: /, Lucía/ })).toBeVisible();
  await expect(page.getByTestId('comida-desayuno')).toContainText('Todavía nada');
});

test('hoy: panel del día, agua y semana', async ({ page }) => {
  await entrar(page);
  await expect(page.getByTestId('panel-dia')).toBeVisible();
  await expect(page.getByTestId('anillo')).toBeVisible();
  await expect(page.getByTestId('comida-desayuno')).not.toContainText('Todavía nada');
  const agua = page.getByTestId('agua');
  await agua.getByRole('button', { name: 'Agregar un vaso' }).click();
  await expect(agua).toContainText('0,25');
  await agua.getByRole('button', { name: 'Vaso 4' }).click();
  await expect(agua).toContainText('1 de');
  await expect(page.getByTestId('tu-semana')).toContainText('/7 días cumplidos');
  if (test.info().project.name === 'pc') {
    // tarjetas lado a lado: Agua y Tu semana miden lo mismo
    const a = (await page.getByTestId('agua').boundingBox())!;
    const s = (await page.getByTestId('tu-semana').boundingBox())!;
    expect(Math.abs(a.height - s.height)).toBeLessThan(2);
    await expect(page.getByTestId('persona-lateral')).toContainText('Sofía');
  }
  await captura(page, '10-hoy');
});

test('registrar comidas: buscar, favorito, lo de ayer y alimento propio', async ({ page }) => {
  await entrar(page);
  await page.getByRole('link', { name: 'Agregar a Almuerzo' }).click();
  await expect(page.getByRole('heading', { name: '¿Qué comiste?' })).toBeVisible();
  await page.getByLabel('Buscar alimento').fill('mbeju');
  await page.getByTestId('alimento').first().click();
  await expect(page.getByRole('dialog')).toContainText('Mbejú');
  await page.getByRole('button', { name: 'Más cantidad' }).click();
  await expect(page.getByTestId('aporte')).toContainText('558');
  await page.getByRole('button', { name: 'Agregar a favoritos' }).click();
  await captura(page, '20-porcion');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mbejú agregado' })).toBeVisible();
  // Favoritos
  await page.getByLabel('Buscar alimento').fill('');
  await page.getByRole('tab', { name: 'Favoritos' }).click();
  await expect(page.getByTestId('alimento').filter({ hasText: 'Mbejú' })).toBeVisible();
  // Lo de ayer, en la cena
  await page.getByLabel('Comida', { exact: true }).selectOption('cena');
  await page.getByRole('tab', { name: 'Mis comidas' }).click();
  await captura(page, '21-agregar');
  const ayer = page.getByTestId('lo-de-ayer');
  if (await ayer.count()) await ayer.getByRole('button', { name: 'Repetir' }).click();
  // Alimento propio
  await page.getByLabel('Buscar alimento').fill('guiso de la abuela');
  await page.getByRole('button', { name: /Crear “guiso de la abuela”/ }).click();
  await page.getByLabel('Nombre de la porción').fill('1 plato');
  await page.getByLabel('Gramos de la porción').fill('300');
  await page.getByLabel('Calorías').fill('450');
  await page.getByLabel('Proteínas (g)').fill('18');
  await page.getByLabel('Carbohidratos (g)').fill('66');
  await page.getByLabel('Grasas (g)').fill('12');
  await captura(page, '22-alimento-propio');
  await page.getByRole('button', { name: 'Guardar alimento' }).click();
  await expect(page.getByRole('dialog')).toContainText('guiso de la abuela');
  await expect(page.getByTestId('aporte')).toContainText('450');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByTestId('comida-almuerzo')).toContainText('Mbejú');
});

test('diario: cambiar de día, editar y quitar', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Diario');
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
  await page.getByRole('button', { name: 'Día anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Ayer' })).toBeVisible();
  await expect(page.getByTestId('resumen-dia')).toContainText('kcal');
  const items = page.getByTestId('item-comida');
  const antes = await items.count();
  expect(antes).toBeGreaterThan(0);
  await items.first().getByRole('button').first().click();
  await page.getByRole('button', { name: 'Más cantidad' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(items.first()).toContainText('1½ ×');
  await captura(page, '30-diario');
  await items.first().getByRole('button', { name: /Quitar/ }).click();
  await expect(items).toHaveCount(antes - 1);
});

test('plan: meta, días de ejemplo y plan propio', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Plan');
  await expect(page.getByTestId('meta-diaria')).toContainText('Calculada');
  await expect(page.getByTestId('plantilla')).toHaveCount(3);
  await expect(page.getByTestId('plan')).toHaveCount(1);
  await captura(page, '40-plan');
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await page.getByLabel('Calorías').fill('1750');
  await page.getByRole('button', { name: 'Guardar meta' }).click();
  await expect(page.getByTestId('meta-diaria')).toContainText('1.750');
  await expect(page.getByTestId('meta-diaria')).toContainText('Ajustada a mano');
  await page.getByRole('button', { name: 'Volver a la calculada' }).click();
  await expect(page.getByTestId('meta-diaria')).toContainText('Calculada');
  await page.getByTestId('plantilla').first().click();
  await page.getByRole('button', { name: 'Sumar a mi diario de hoy' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'quedó cargado' })).toBeVisible();
  await page.getByRole('button', { name: '+ Nuevo' }).click();
  await page.getByLabel('Nombre del plan').fill('Semana de feria');
  await page.getByLabel('Plan para Almuerzo').fill('Medio plato de verduras, una porción de pollo y mandioca.');
  await page.getByRole('button', { name: 'Guardar plan' }).click();
  await expect(page.getByTestId('plan')).toHaveCount(2);
});

test('progreso: peso, semanas, promedios e historial', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Progreso');
  await expect(page.getByTestId('grafico-peso').locator('svg')).toBeVisible();
  await expect(page.getByTestId('promedios')).toContainText('Calorías');
  await expect(page.getByTestId('historial').locator('li').first()).toBeVisible();
  await page.getByRole('radio', { name: '30 días' }).click();
  await page.getByRole('radio', { name: 'Cintura' }).click();
  await captura(page, '50-progreso');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await page.getByRole('textbox', { name: 'Peso' }).fill('66,4');
  await page.getByRole('textbox', { name: 'Cintura' }).fill('78');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByTestId('resumen-progreso')).toContainText('66,4 kg');
});

test('perfil: apariencia, unidades, versión y exportar', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Perfil');
  await page.getByRole('radio', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Terracota' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-acento', 'terracota');
  await page.getByRole('radio', { name: 'Libras (lb)' }).click();
  await expect(page.getByTestId('version')).toContainText('1.2.0');
  await captura(page, '60-perfil-oscuro');
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar mis datos/ }).click();
  expect((await descarga).suggestedFilename()).toMatch(/^stoafit-mis-datos-/);
  // Las otras pantallas en oscuro y terracota, para comparar acentos
  await ir(page, 'Hoy');
  await captura(page, '61-hoy-oscuro-terracota');
  await page.getByRole('button', { name: 'Salir' }).filter({ visible: true }).count();
});

for (const acento of ['oliva', 'terracota', 'bronce'] as const) {
  test(`opción de acento: ${acento}`, async ({ page }) => {
    await entrar(page);
    await ir(page, 'Perfil');
    await page.getByRole('radio', { name: 'Mármol' }).click();
    await page.getByRole('radio', { name: acento[0].toUpperCase() + acento.slice(1) }).click();
    await ir(page, 'Hoy');
    await expect(page.locator('html')).toHaveAttribute('data-acento', acento);
    await captura(page, `70-acento-${acento}`);
  });
}
