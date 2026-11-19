import { expect, test, type Page } from '@playwright/test';

// v1.1.0: código de barras, repetir comidas, recetas y crear alimento mejorado (modo prueba, datos inventados)

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

const ir = (page: Page, nombre: 'Hoy' | 'Diario') => page.getByRole('link', { name: nombre, exact: true }).filter({ visible: true }).click();

test('código de barras: producto encontrado y producto nuevo', async ({ page }) => {
  await entrar(page);
  await page.getByRole('link', { name: 'Escanear un producto' }).click();
  await expect(page.getByRole('dialog', { name: 'Escanear código de barras' })).toBeVisible();
  // Sin cámara en las pruebas: se escribe el código a mano
  await page.getByLabel('Código de barras a mano').fill('7840000000017');
  await captura(page, '80-escaner');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('dialog', { name: 'Galletitas de agua integrales' })).toContainText('Marca Ejemplo');
  await expect(page.getByTestId('aporte')).toContainText('126');
  await captura(page, '81-producto-escaneado');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Galletitas de agua integrales agregado' })).toBeVisible();
  // Pasó a la base compartida con su código y se puede buscar por nombre
  await page.getByLabel('Buscar alimento').fill('galletitas de agua');
  await expect(page.getByTestId('alimento').filter({ hasText: 'Galletitas de agua integrales' })).toContainText('envasado');
  await page.getByLabel('Buscar alimento').fill('');

  // Un código que no está: se carga la etiqueta "por porción"
  await page.getByTestId('boton-escanear').click();
  await page.getByLabel('Código de barras a mano').fill('7840000000994');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByTestId('aviso-codigo')).toContainText('todavía no está');
  await expect(page.getByTestId('codigo-fijo')).toContainText('7840000000994');
  await page.getByLabel('Nombre del alimento').fill('Mbejú congelado');
  await page.getByLabel('Marca').fill('Granja Ejemplo');
  await page.getByLabel('Nombre de la porción').fill('1 unidad');
  await page.getByLabel('Gramos de la porción').fill('80');
  await page.getByLabel('Calorías').fill('240');
  await page.getByLabel('Proteínas (g)').fill('6');
  await page.getByLabel('Carbohidratos (g)').fill('32');
  await page.getByLabel('Grasas (g)').fill('9');
  await page.getByRole('button', { name: '+ Agregar medida' }).click();
  await page.getByLabel('Otra medida 1', { exact: true }).fill('1 paquete');
  await page.getByLabel('Gramos de otra medida 1').fill('480');
  await captura(page, '82-crear-alimento');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByRole('dialog', { name: 'Mbejú congelado' })).toContainText('Granja Ejemplo');
  await page.getByRole('radio', { name: /1 paquete/ }).click();
  await expect(page.getByTestId('aporte')).toContainText('1.440');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();

  // La próxima vez el mismo código lo encuentra entre los propios
  await page.getByTestId('boton-escanear').click();
  await page.getByLabel('Código de barras a mano').fill('7840000000994');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('dialog', { name: 'Mbejú congelado' })).toBeVisible();
  // Sofía es admin (y cargadora): puede corregirlo y queda verificado
  await page.getByRole('button', { name: 'Corregir producto' }).click();
  await page.getByLabel('Calorías').fill('250');
  await page.getByRole('button', { name: 'Guardar y verificar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'corregido y verificado' })).toBeVisible();
  await expect(page.getByTestId('estado-producto')).toContainText('Verificado');
});

test('repetir: día anterior, copiar a otro día y comidas guardadas', async ({ page }) => {
  await entrar(page);
  await ir(page, 'Diario');
  await expect(page.getByTestId('repetir-dia')).toBeVisible();
  const items = page.getByTestId('item-comida');
  const antes = await items.count();
  await page.getByTestId('repetir-dia').getByRole('button', { name: 'Repetir' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Repetiste el día anterior' })).toBeVisible();
  expect(await items.count()).toBeGreaterThan(antes);
  await captura(page, '83-diario-repetir');

  // Guardar el desayuno como comida
  await page.getByRole('button', { name: 'Guardar desayuno como comida' }).click();
  await page.getByLabel('Nombre de la comida guardada').fill('Desayuno de feria');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Desayuno de feria' })).toBeVisible();

  // Copiar el desayuno de hoy al de mañana… y al almuerzo de hoy
  await page.getByRole('button', { name: 'Copiar desayuno a otro día' }).click();
  await page.getByRole('radio', { name: 'Hoy' }).click();
  await page.getByRole('radiogroup', { name: 'Comida de destino' }).getByRole('radio', { name: 'Almuerzo' }).click();
  await captura(page, '84-copiar-a');
  const almuerzo = page.getByTestId('diario-almuerzo').getByTestId('item-comida');
  const enAlmuerzo = await almuerzo.count();
  const enDesayuno = await page.getByTestId('diario-desayuno').getByTestId('item-comida').count();
  await page.getByRole('button', { name: /^Copiar a almuerzo/ }).click();
  await expect(almuerzo).toHaveCount(enAlmuerzo + enDesayuno);

  // En Agregar → Guardadas aparece la nueva y la de ejemplo
  await page.goto('/agregar?comida=cena');
  await page.getByRole('tab', { name: 'Guardadas' }).click();
  await expect(page.getByTestId('guardada')).toHaveCount(2);
  await page.getByTestId('guardada').filter({ hasText: 'Mi desayuno de siempre' }).getByRole('button', { name: 'Agregar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'agregada' })).toBeVisible();
  await captura(page, '85-guardadas');
});

test('recetas: ingredientes, porciones y peso cocido', async ({ page }) => {
  await entrar(page);
  await page.goto('/agregar?comida=almuerzo');
  await page.getByRole('link', { name: 'Crear receta' }).last().click();
  await expect(page.getByRole('heading', { name: 'Nueva receta' })).toBeVisible();
  await page.getByLabel('Nombre de la receta').fill('Sopa paraguaya de mamá');
  for (const [buscar, porcion, veces] of [['harina de maiz', '1 taza', 2], ['queso paraguay', '1 trozo', 3], ['huevo', '2 unidades', 0], ['leche entera', '1 taza', 1]] as const) {
    await page.getByLabel('Buscar ingrediente').fill(buscar);
    await page.getByTestId('resultado-ingrediente').first().click();
    const d = page.getByRole('dialog');
    await d.getByRole('radio', { name: new RegExp(porcion) }).click();
    for (let k = 0; k < veces; k++) await d.getByRole('button', { name: 'Más cantidad' }).click();
    await d.getByRole('button', { name: 'Sumar a la receta' }).click();
  }
  await expect(page.getByTestId('ingrediente')).toHaveCount(4);
  await page.getByRole('button', { name: 'Más porciones' }).click();
  await page.getByRole('button', { name: 'Más porciones' }).click();
  await page.getByRole('button', { name: 'Más porciones' }).click();
  await page.getByRole('button', { name: 'Más porciones' }).click(); // 8 porciones
  await expect(page.getByLabel('Porciones', { exact: true })).toHaveText('8');
  await page.getByLabel('Peso total cocido').fill('1000');
  await expect(page.getByTestId('por-porcion')).toContainText('125 g');
  await captura(page, '86-receta');
  await page.getByRole('button', { name: 'Guardar receta' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Receta "Sopa paraguaya de mamá" guardada' })).toBeVisible();
  // Vuelve a Agregar y la receta se busca como un alimento
  await page.getByLabel('Buscar alimento').fill('sopa paraguaya de mama');
  await expect(page.getByTestId('alimento').first()).toContainText('receta');
  await page.getByTestId('alimento').first().click();
  await expect(page.getByRole('dialog')).toContainText('rinde 8 porciones');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'agregado' })).toBeVisible();
  // Editar la receta
  await page.getByTestId('alimento').first().click();
  await page.getByRole('button', { name: 'Editar receta' }).click();
  await expect(page.getByRole('heading', { name: 'Editar receta' })).toBeVisible();
  await expect(page.getByTestId('ingrediente')).toHaveCount(4);
});
