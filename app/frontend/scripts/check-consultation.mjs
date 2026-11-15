import assert from 'node:assert/strict';

const { chromium } = await import(process.env.BROWSER_TEST_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let documentLoads = 0;
let batchRequests = 0;
page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) documentLoads++; });
page.on('request', (request) => {
  if (request.url().includes('/api/analiticas/analizar-carpeta')) batchRequests++;
});
if (process.env.BROWSER_TEST_API_URL) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${process.env.BROWSER_TEST_API_URL}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
}
try {
  await page.goto(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8000');
  await page.getByRole('button', { name: /Abrir Seguimiento 01/ }).waitFor();
  await page.getByRole('button', { name: /Abrir Seguimiento 01/ }).click();
  const nav = page.getByRole('complementary', { name: 'Pacientes del cupo' });
  await nav.getByRole('button', { name: 'Abrir Paciente 02', exact: true }).waitFor();
  const patientButton = nav.getByRole('button', { name: 'Abrir Paciente 02', exact: true });
  const patientNameBox = await patientButton.locator('strong').boundingBox();
  const priorityBox = await patientButton.locator('.priority').boundingBox();
  assert.ok(priorityBox.x > patientNameBox.x, 'La prioridad queda a la derecha del nombre.');
  assert.ok(Math.abs(priorityBox.y - patientNameBox.y) < 8, 'El nombre y la prioridad comparten línea.');
  assert.doesNotMatch(await nav.innerText(), /Deterioro Silente|Alto Riesgo/);
  const back = page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true });
  const headingBox = await page.getByRole('heading', { name: 'Paciente 01', level: 1 }).boundingBox();
  const backBox = await back.boundingBox();
  assert.ok(backBox.x > headingBox.x, 'El botón de regreso aparece a la derecha del título.');
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Evaluar paciente', exact: true }).count(), 0);
  const evolution = page.locator('.patient-history-disclosure');
  await evolution.locator('summary').first().click();
  await page.getByRole('heading', { name: 'Evolución de las analíticas', exact: true }).waitFor();
  const result = page.getByRole('region', { name: 'Resultado del paciente', exact: true });
  await result.waitFor();
  await result.getByRole('img', { name: /puntuación experimental \d+ de 100/ }).first().waitFor();
  assert.match(await result.innerText(), /Seguimiento/);
  await page.getByLabel('Parámetro del gráfico', { exact: true }).selectOption('colesterol_total');
  await page.getByText('Ver una analítica concreta', { exact: true }).click();
  await page.getByLabel('Fecha de la analítica', { exact: true }).selectOption('2025-02_analitica_basal.json');
  assert.match(await page.getByRole('region', { name: 'Detalle de la analítica', exact: true }).innerText(), /2025-02/);
  assert.match(await result.innerText(), /Seguimiento/);
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  await page.getByRole('button', { name: /Abrir Seguimiento 02/ }).click();
  await result.getByText('Datos observados', { exact: true }).waitFor();
  assert.doesNotMatch(await result.innerText(), /Seguimiento 01/);
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  await page.getByLabel('Buscar paciente', { exact: true }).fill('no-existe');
  await page.getByText('No hay pacientes que coincidan con estos filtros.', { exact: true }).waitFor();
  await page.getByLabel('Buscar paciente', { exact: true }).fill('');
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: /Abrir Seguimiento 06/ }).click();
  await page.locator('.patient-history-disclosure').locator('summary').first().click();
  await page.getByText('Solo hay una analítica disponible; todavía no se puede mostrar una evolución.', { exact: true }).waitFor();
  await result.waitFor();
  assert.match(await result.innerText(), /Analítica aislada/);
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  const initialLoads = documentLoads;
  const initialBatches = batchRequests;
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).click();
    await page.getByRole('button', { name: /Abrir Seguimiento 01/ }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((button) => button.textContent.trim() === 'Revisar de nuevo' && !button.disabled));
    assert.equal(documentLoads, initialLoads, 'Revisar el cupo no debe recargar la página.');
    assert.equal(batchRequests, initialBatches + attempt + 1, 'Cada pulsación debe generar un único análisis.');
  }
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByRole('button', { name: 'Cargar archivos externos', exact: true }).click();
  await page.getByLabel('Cargar analíticas desde tu ordenador').waitFor();
  await page.getByRole('button', { name: 'Volver al cupo', exact: true }).click();
  await page.getByRole('heading', { name: 'Pacientes por revisar', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: automatic real evaluation, chronological chart, parameter selection, optional lab detail, patient isolation, single visit, search, refresh, external upload navigation, mobile 375px.');
} finally {
  await browser.close();
}
