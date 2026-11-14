import assert from 'node:assert/strict';

// BROWSER_TEST_PACKAGE allows running the check with a temporary Playwright installation.
const { chromium } = await import(process.env.BROWSER_TEST_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let mode = 'success';
let demoApiCalls = 0;
const makePatient = (name, egfr) => ({
  archivo: name,
  datos_entrada: { edad: 60, egfr, uacr: 0, ap_hi: 120 },
  evaluacion: {
    nivel_prioridad: 'MEDIA',
    conclusion_diagnostica: `Resultado de prueba para ${name}`,
    recomendacion_preventiva: 'Recomendación de prueba.',
    tipos_riesgo: { riesgo_cardiorrenal: { valor: 0.2, umbral: 0.18, alerta: true, interpretacion: 'Interpretación de prueba.' } },
    factores_clave: [{ variable: 'egfr', valor_actual: `${egfr}`, impacto: '+8%', descripcion: `Factor de prueba ${name}` }],
  },
});
await page.route('**/api/**', async (route) => {
  if (new URL(page.url()).searchParams.get('demo') === '1') demoApiCalls += 1;
  const url = route.request().url();
  if (url.endsWith('/health')) return route.fulfill({ json: { modelo_cargado: true } });
  if (url.endsWith('/analizar-carpeta')) {
    if (mode === 'unavailable') return route.fulfill({ status: 501, json: { detail: 'Missing model' } });
    return route.fulfill({ json: mode === 'empty-result' ? [] : [makePatient('fixture-a.json', 68), makePatient('fixture-b.json', 92)] });
  }
  return route.fulfill({ json: mode === 'empty-files' ? [] : [{ archivo: 'fixture.json', fecha_modificacion: '2026-01-01', tamano_bytes: 1024, tiene_progresion: false }] });
});
try {
  await page.goto(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173');
  await page.getByText('Opciones de analíticas', { exact: true }).click();
  await page.getByRole('button', { name: 'Cargar analíticas', exact: true }).click();
  await page.getByRole('button', { name: 'Analizar lote', exact: true }).click();
  await page.getByRole('heading', { name: 'Selecciona un paciente' }).waitFor();
  await page.getByRole('button', { name: /fixture-a.json/ }).click();
  await page.getByRole('heading', { name: 'fixture-a.json', exact: true }).waitFor();
  await page.getByRole('button', { name: /fixture-b.json/ }).click();
  const result = page.getByRole('region', { name: 'Resultado del paciente' });
  assert.match(await result.innerText(), /Resultado de prueba para fixture-b.json/);
  assert.doesNotMatch(await result.innerText(), /fixture-a.json/);
  const sections = await result.locator('h3').allTextContents();
  assert.equal(sections[0], 'Riesgos estimados');
  assert.equal(sections.at(-1), 'Parámetros de la analítica');
  if (process.env.BROWSER_SCREENSHOT) await page.screenshot({ path: process.env.BROWSER_SCREENSHOT, fullPage: true });
  await page.getByLabel('Buscar paciente o archivo').fill('no-coincide');
  await page.getByText('No hay resultados con estos filtros.').waitFor();
  await page.getByLabel('Buscar paciente o archivo').fill('');
  await page.getByLabel('Prioridad de revisión').selectOption('ALTA');
  await page.getByText('No hay resultados con estos filtros.').waitFor();
  await page.getByLabel('Prioridad de revisión').selectOption('');
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Volver a pacientes', exact: true }).click();
  await page.getByRole('button', { name: /fixture-a.json/ }).click();
  await page.getByRole('heading', { name: 'fixture-a.json', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Volver a pacientes', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a los archivos' }).click();
  mode = 'unavailable';
  await page.getByRole('button', { name: 'Analizar lote', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'El modelo todavía no está disponible' }).waitFor();
  mode = 'empty-result';
  await page.getByRole('button', { name: 'Analizar lote', exact: true }).click();
  await page.getByText('El servicio no devolvió pacientes evaluables.').waitFor();
  mode = 'empty-files';
  await page.getByText('Opciones de analíticas', { exact: true }).click();
  await page.getByRole('button', { name: 'Actualizar archivos' }).click();
  await page.getByRole('heading', { name: 'No hay analíticas disponibles' }).waitFor();
  await page.goto(`${process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173'}?demo=1`);
  await page.getByRole('note').filter({ hasText: 'datos completamente ficticios' }).waitFor();
  await page.getByRole('heading', { name: 'Paciente DEMO 01', exact: true }).waitFor();
  assert.equal(await page.getByRole('list', { name: 'Proceso de revisión' }).count(), 0);
  await page.getByText('Opciones de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Actualizar archivos', exact: true }).click();
  await page.getByRole('button', { name: 'Analizar lote', exact: true }).click();
  await page.getByRole('button', { name: /Paciente DEMO 01/ }).click();
  await page.getByText('DEMO FICTICIA').waitFor();
  if (process.env.BROWSER_SCREENSHOT) await page.screenshot({ path: process.env.BROWSER_SCREENSHOT, fullPage: true });
  assert.equal(demoApiCalls, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: load, analyze, patient isolation, search, priority filter, mobile navigation (375px), no overflow, 501, empty results/files, no browser exceptions. API responses are test fixtures.');
} finally {
  await browser.close();
}
