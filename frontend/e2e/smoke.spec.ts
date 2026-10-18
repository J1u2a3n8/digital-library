import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido completo contra Docker: health, listado, alta con autor existente y nuevo,
 * filtro, edición e historial con dos versiones.
 * Con SCREENSHOTS=1 guarda capturas en docs/screenshots para el README.
 */
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080';
const takeScreenshots = process.env.SCREENSHOTS === '1';
const screenshotDir = '../docs/screenshots';

async function capture(page: Page, name: string, fullPage = true) {
  if (takeScreenshots) {
    // Espera a que terminen las animaciones (drawer, toasts) antes de la captura.
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage });
  }
}

test('flujo principal de la bibliotecaria', async ({ page, request }) => {
  const suffix = Date.now().toString().slice(-6);
  const title = `Historias de cronopios ${suffix}`;
  const newAuthor = `Autora Invitada ${suffix}`;

  // 1. La API y la base responden.
  const health = await request.get(`${apiUrl}/health`);
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ status: 'Healthy' });

  // 2. La UI carga el listado desde la API.
  await page.goto('/works');
  await expect(page.getByRole('heading', { level: 1, name: 'Obras' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Listado de obras' }).getByRole('row').nth(1)).toBeVisible();
  await capture(page, '01-listado');

  await page.getByLabel('Tu nombre para el historial de cambios').fill('María');
  await page.getByLabel('Tu nombre para el historial de cambios').blur();

  // 3. Alta con un autor existente y uno nuevo.
  await page.getByRole('link', { name: 'Nueva obra' }).click();
  await expect(page.getByRole('heading', { name: 'Agregar obra' })).toBeVisible();
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Fecha de publicación').pressSequentially('15032001');
  await page.getByLabel('Buscar autor').fill('cortazar');
  await page.getByRole('checkbox', { name: 'Julio Cortázar' }).click();
  await page.getByLabel('Buscar autor').fill(newAuthor);
  await page.getByRole('button', { name: `Crear autor “${newAuthor}”` }).click();
  await expect(page.getByLabel('Autores seleccionados').getByText('Nuevo')).toBeVisible();
  await capture(page, '02-formulario');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Obra creada')).toBeVisible();
  await expect(page).toHaveURL(/\/works$/);

  // 4. Filtros acumulativos.
  await page.getByLabel('Título').fill(suffix);
  await page.getByLabel('Mínimo de autores').click();
  await page.getByRole('option', { name: '2+' }).click();
  await expect(page.getByRole('status')).toHaveText('1 obra');
  await expect(page).toHaveURL(
    new RegExp(`title=${suffix}.*minimumAuthorCount=2|minimumAuthorCount=2.*title=${suffix}`),
  );
  await capture(page, '03-filtros');

  // 5. Edición: título y autores.
  await page.getByRole('link', { name: `Editar ${title}` }).click();
  await expect(page.getByRole('heading', { name: 'Editar obra' })).toBeVisible();
  const titleInput = page.getByRole('textbox', { name: 'Título' });
  await expect(titleInput).toHaveValue(title);
  await titleInput.fill(`${title} (revisada)`);
  await page.getByRole('button', { name: `Quitar ${newAuthor}` }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Cambios guardados')).toBeVisible();

  // 6. Historial con dos versiones; la anterior queda intacta.
  await page.getByRole('button', { name: 'Ver historial' }).click();
  const drawer = page.getByRole('dialog', { name: 'Historial' });
  await expect(drawer.getByText('Versión 2')).toBeVisible();
  await expect(drawer.getByText('Versión 1')).toBeVisible();
  await expect(drawer.getByText(newAuthor)).toBeVisible();
  await expect(drawer.getByText('María').first()).toBeVisible();
  await capture(page, '04-historial', false);
});

test('dos pestañas editan la misma obra: la segunda recibe 409', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-AR' });
  const firstTab = await context.newPage();
  const secondTab = await context.newPage();
  const baseURL = test.info().project.use.baseURL;

  // Rayuela existe en el seed.
  await firstTab.goto(`${baseURL}/works?title=rayuela`);
  const editUrl = await firstTab
    .getByRole('link', { name: /^Editar Rayuela/ })
    .first()
    .getAttribute('href');
  await firstTab.goto(`${baseURL}${editUrl}`);
  await secondTab.goto(`${baseURL}${editUrl}`);

  for (const tab of [firstTab, secondTab]) {
    await expect(tab.getByRole('heading', { name: 'Editar obra' })).toBeVisible();
  }

  await firstTab.getByRole('textbox', { name: 'Título' }).fill(`Rayuela pestaña 1 ${Date.now()}`);
  await firstTab.getByRole('button', { name: 'Guardar' }).click();
  await expect(firstTab.getByText('Cambios guardados')).toBeVisible();

  await secondTab.getByRole('textbox', { name: 'Título' }).fill('Rayuela pestaña 2');
  await secondTab.getByRole('button', { name: 'Guardar' }).click();
  const dialog = secondTab.getByRole('dialog', { name: 'La obra fue modificada por otro usuario' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Recargar' }).click();
  await expect(secondTab.getByRole('textbox', { name: 'Título' })).toHaveValue(/Rayuela pestaña 1/);
  await context.close();
});

test('listado en mobile', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-AR' });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL}/works`);

  await expect(page.getByRole('list', { name: 'Listado de obras' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await capture(page, '05-mobile');
  await context.close();
});
