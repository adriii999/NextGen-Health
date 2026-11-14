import assert from 'node:assert/strict';

const { chromium } = await import(process.env.BROWSER_TEST_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button', { name: /Seguimiento 01/ }).click();
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Evaluar paciente', exact: true }).count(), 0);
  await page.getByRole('heading', { name: 'Evolución de las analíticas', exact: true }).waitFor();
  const result = page.getByRole('region', { name: 'Resultado del paciente', exact: true });
  await result.waitFor();
  assert.match(await result.innerText(), /Modo B/);
  await page.getByLabel('Parámetro del gráfico', { exact: true }).selectOption('colesterol_total');
  await page.getByText('Ver una analítica concreta', { exact: true }).click();
  await page.getByLabel('Fecha de la analítica', { exact: true }).selectOption('2025-02_analitica_basal.json');
  assert.match(await page.getByRole('region', { name: 'Detalle de la analítica', exact: true }).innerText(), /2025-02/);
  assert.match(await result.innerText(), /Modo B/);
  await page.getByRole('button', { name: /Seguimiento 02/ }).click();
  await result.getByRole('heading', { name: /Seguimiento 02/ }).waitFor();
  assert.doesNotMatch(await result.innerText(), /Seguimiento 01/);
  await page.getByLabel('Buscar paciente', { exact: true }).fill('no-existe');
  await page.getByText('No hay pacientes con esa búsqueda.', { exact: true }).waitFor();
  await page.getByLabel('Buscar paciente', { exact: true }).fill('');
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: /06/ }).click();
  await page.getByText('Solo hay una analítica disponible; todavía no se puede mostrar una evolución.', { exact: true }).waitFor();
  await result.waitFor();
  assert.match(await result.innerText(), /Modo A/);
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.getByRole('heading', { name: 'Selecciona al paciente de la consulta', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cargar archivos externos', exact: true }).click();
  await page.getByLabel('Cargar analíticas desde tu ordenador').waitFor();
  await page.getByRole('button', { name: 'Volver a la consulta', exact: true }).click();
  await page.getByRole('heading', { name: 'Pacientes', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: automatic real evaluation, chronological chart, parameter selection, optional lab detail, patient isolation, single visit, search, refresh, external upload navigation, mobile 375px.');
} finally {
  await browser.close();
}
