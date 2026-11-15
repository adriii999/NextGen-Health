import assert from 'node:assert/strict';

const { chromium } = await import(process.env.BROWSER_TEST_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(7000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let mode = 'success';
let releaseBatch;
let signalBatch;
const batchStarted = new Promise((resolve) => { signalBatch = resolve; });
let batchCalls = 0;
let individualCalls = 0;
let sourceVersion = 'version-1';
const fixture = (id, priority, egfr, delta) => ({
  archivo: id,
  datos_entrada: {
    paciente_id: id, nombre: `Prueba ${id}`, edad: 60,
    fecha_analitica: '2026-03-10', egfr, uacr: 0,
    progresion: delta === null ? null : { delta_egfr: delta, delta_uacr: 0 },
    historial_visitas: delta === null ? [] : [
      { nombre_archivo: 'previa.json', fecha_analitica: '2025-03-10', egfr: 91, uacr: 0 },
      { nombre_archivo: 'actual.json', fecha_analitica: '2026-03-10', egfr, uacr: 0 },
    ],
  },
  evaluacion: {
    nivel_prioridad: priority, hay_riesgo: priority !== 'BAJA',
    motivos_prioridad: priority === 'ALTA'
      ? ['ALERTA_RINON_CORAZON', 'DESCENSO_RAPIDO']
      : priority === 'MEDIA' ? ['ALERTA_CORAZON'] : ['SIN_ALERTAS'],
    conclusion_diagnostica: `Motivo de prueba ${id}`,
    perfil_renal: priority === 'MEDIA' ? null : {
      estadio_gfr: 'G2', estadio_uacr: 'A2', cuadrante_kdigo: 'MODERADO',
      progresor_rapido: delta !== null && delta <= -5,
      descripcion_clinica: 'Perfil renal calculado a partir de eGFR, uACR y su evolución.',
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: { valor: 0.08, umbral: 0.1, alerta: false },
      riesgo_insuficiencia_cardiaca: { valor: 0.07, umbral: 0.08, alerta: false },
      riesgo_cardiorrenal: { valor: priority === 'ALTA' ? 0.3 : 0.05, umbral: 0.12, alerta: priority === 'ALTA' },
    },
    factores_clave: priority === 'ALTA'
      ? [{ variable: 'egfr', valor_actual: '82 mL/min', impacto: '+5%', descripcion: 'Factor de prueba' }]
      : [],
  },
});
const patients = [
  fixture('alta', 'ALTA', 82, -9),
  fixture('media', 'MEDIA', 89, 0),
  fixture('baja', 'BAJA', 95, null),
];
const incompletePatient = {
  archivo: 'pendiente.json', estado: 'DATOS_INSUFICIENTES',
  campos_pendientes: ['uacr'], errores_datos: [], evaluacion: null,
  datos_entrada: {
    paciente_id: 'pendiente', nombre: 'Prueba pendiente',
    edad: 67, egfr: 56, uacr: null, fecha_analitica: '2026-04-10',
  },
};
await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/version-fuentes')) {
    return route.fulfill({ json: { version: sourceVersion } });
  }
  if (url.pathname.endsWith('/analizar-carpeta')) {
    batchCalls++;
    assert.equal(route.request().method(), 'POST');
    assert.equal(url.searchParams.get('modo'), 'B');
    if (mode === 'pending') await new Promise((resolve) => {
      releaseBatch = resolve;
      signalBatch();
    });
    if (mode === 'unavailable') return route.fulfill({ status: 501, json: { detail: 'Missing model' } });
    if (mode === 'network') return route.abort();
    return route.fulfill({ json: mode === 'empty' ? [] : [...patients, incompletePatient] });
  }
  if (url.pathname.endsWith('/evaluar')) individualCalls++;
  return route.fulfill({ json: mode === 'empty-files' ? [] : patients.map((p) => ({
    archivo: p.archivo, nombre: p.datos_entrada.nombre, es_carpeta: true, analiticas: [],
  })) });
});

try {
  mode = 'pending';
  await page.goto(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8000');
  await page.getByRole('heading', { name: 'Pacientes por revisar', exact: true }).waitFor();
  await page.getByText('Prototipo experimental', { exact: true }).waitFor();
  assert.equal(await page.getByText(/Revisamos las analíticas disponibles/).count(), 0);
  assert.equal(await page.getByText(/Esta herramienta es experimental/).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Cargar archivos externos', exact: true }).isVisible(), false);
  await batchStarted;
  assert.equal(batchCalls, 1, 'El análisis del cupo comienza al abrir la bandeja.');
  await page.getByRole('status').filter({ hasText: 'Revisando las analíticas' }).waitFor();
  mode = 'success';
  releaseBatch();
  const rows = page.locator('.inbox-table tbody tr');
  await page.getByRole('button', { name: 'Abrir Prueba alta', exact: true }).waitFor();
  await page.getByText(/^Analíticas revisadas · /).waitFor();
  sourceVersion = 'version-2';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText('Hay cambios en las analíticas. Revisa el cupo de nuevo.', { exact: true }).waitFor();
  sourceVersion = 'version-1';
  assert.deepEqual(await rows.locator('.patient-name').allTextContents(), ['Prueba alta', 'Prueba media', 'Prueba baja']);
  assert.match(await rows.first().innerText(), /Filtrado del riñón 82/);
  assert.match(await rows.first().innerText(), /Albúmina en orina 0/);
  assert.doesNotMatch(await rows.first().innerText(), /eGFR|uACR|KDIGO|cardiorrenal/);
  await page.getByText('3 evaluados · 1 pendiente', { exact: true }).waitFor();
  const headers = await page.locator('.inbox-table thead th').allTextContents();
  assert.deepEqual(headers, ['Paciente', 'Prioridad', 'Señal principal', 'Abrir']);
  assert.equal(await rows.first().locator('td').count(), 4);
  assert.match(await rows.first().innerText(), /Filtrado del riñón 82/);
  assert.match(await rows.first().innerText(), /cambio( anual)? −9/);
  assert.match(await rows.first().innerText(), /Motivo de prioridad: descenso rápido del filtrado del riñón/i);
  assert.match(await rows.first().innerText(), /Alerta experimental: riñón y corazón/i);
  assert.match(await rows.nth(1).innerText(), /Alerta experimental: insuficiencia cardíaca/i);
  assert.match(await rows.nth(2).innerText(), /Sin alertas del modelo/i);
  mode = 'pending';
  const refreshStarted = new Promise((resolve) => { signalBatch = resolve; });
  await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).click();
  await refreshStarted;
  await page.getByRole('status').filter({ hasText: 'Actualizando la lista' }).waitFor();
  assert.equal(await rows.count(), 3, 'Los resultados anteriores siguen visibles durante la revisión.');
  mode = 'success';
  releaseBatch();
  await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).isEnabled(), true);
  const pendingDisclosure = page.locator('.incomplete-patients');
  await pendingDisclosure.locator('summary').waitFor();
  assert.equal(await pendingDisclosure.getAttribute('open'), null);
  await pendingDisclosure.locator('summary').click();
  const pendingRow = pendingDisclosure.getByRole('listitem').filter({ hasText: 'Prueba pendiente' });
  assert.match(await pendingRow.innerText(), /Falta: albúmina en orina/);
  await pendingRow.getByRole('button', { name: 'Ver datos de Prueba pendiente', exact: true }).click();
  await page.getByRole('heading', { name: 'Faltan datos clínicos', exact: true }).waitFor();
  assert.match(await page.getByRole('region', { name: 'Datos del paciente pendientes de evaluación' }).innerText(), /No se ha calculado una puntuación/);
  assert.doesNotMatch(await page.locator('main').innerText(), /Puntuaciones experimentales del modelo/);
  await page.getByRole('complementary', { name: 'Pacientes del cupo' })
    .getByRole('button', { name: 'Abrir Prueba alta', exact: true }).click();
  await page.getByRole('heading', { name: 'Datos observados', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Por qué aparece en la lista', exact: true }).waitFor();
  const patientReview = page.getByRole('region', { name: 'Resultado del paciente', exact: true });
  assert.equal(await patientReview.locator('.source-label').count(), 0);
  assert.match(await patientReview.innerText(), /descenso rápido del filtrado del riñón/i);
  assert.match(await patientReview.innerText(), /Alerta experimental: riñón y corazón/i);
  assert.match(await patientReview.innerText(), /Filtrado del riñón/);
  assert.match(await patientReview.innerText(), /Variables destacadas por el modelo/);
  assert.match(await patientReview.innerText(), /82 mL\/min/);
  assert.doesNotMatch(await patientReview.innerText(), /Ver puntuaciones del modelo|Ver explicación y sugerencia|Ver todos los datos/);
  const navBox = await page.getByRole('complementary', { name: 'Pacientes del cupo' }).boundingBox();
  assert.ok(navBox.width >= 320, 'La lista lateral necesita espacio para pacientes y prioridad.');
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  await page.getByLabel('Prioridad', { exact: true }).selectOption('ALTA');
  assert.equal(await rows.count(), 1);
  await page.getByLabel('Buscar paciente', { exact: true }).fill('inexistente');
  await page.getByText('No hay pacientes que coincidan con estos filtros.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  assert.equal(await rows.count(), 3);
  await page.getByLabel('Buscar paciente', { exact: true }).fill('alta');
  await page.getByRole('button', { name: 'Abrir Prueba alta', exact: true }).click();
  const result = page.getByRole('region', { name: 'Resultado del paciente', exact: true });
  await result.waitFor();
  assert.match(await result.innerText(), /experimental/i);
  assert.match(await result.innerText(), /Datos observados/);
  await page.getByRole('heading', { name: 'Datos observados', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Evaluación del modelo', exact: true }).waitFor();
  const quickNav = page.getByRole('complementary', { name: 'Pacientes del cupo' });
  await quickNav.waitFor();
  await quickNav.getByRole('button', { name: 'Abrir Prueba baja', exact: true }).click();
  await page.getByRole('heading', { name: 'Prueba baja', level: 1, exact: true }).waitFor();
  assert.match(await result.innerText(), /Datos observados/);
  await page.getByRole('complementary', { name: 'Pacientes del cupo' })
    .getByRole('button', { name: 'Abrir Prueba alta', exact: true }).click();
  await page.getByRole('heading', { name: 'Prueba alta', level: 1, exact: true }).waitFor();
  assert.match(await result.innerText(), /Datos observados/);
  const historyDetails = page.locator('.patient-history-disclosure');
  assert.equal(await historyDetails.getAttribute('open'), null);
  await historyDetails.locator('summary').first().click();
  await page.getByRole('heading', { name: 'Evolución de las analíticas', exact: true }).waitFor();
  assert.match(await page.getByRole('img', { name: /^Evolución de Filtrado/ }).getAttribute('aria-label'), /91.*82/);
  assert.equal(individualCalls, 0, 'Abrir una ficha reutiliza la evaluación del lote.');
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  assert.equal(await page.getByLabel('Buscar paciente', { exact: true }).inputValue(), 'alta');
  assert.equal(await rows.count(), 1);
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Abrir Prueba baja', exact: true }).click();
  await result.waitFor();
  assert.match(await result.innerText(), /Datos observados/);
  const mobileNav = page.locator('.mobile-patient-quicknav');
  await mobileNav.locator('summary').click();
  await mobileNav.getByRole('button', { name: 'Abrir Prueba media', exact: true }).click();
  await page.getByRole('heading', { name: 'Prueba media', level: 1, exact: true }).waitFor();
  assert.match(await result.innerText(), /Datos observados/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Volver a la lista de pacientes', exact: true }).click();
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByRole('button', { name: 'Cargar archivos externos', exact: true }).click();
  await page.getByLabel('Cargar analíticas desde tu ordenador').waitFor();
  await page.getByRole('button', { name: 'Volver al cupo', exact: true }).click();
  assert.equal(await rows.count(), 3);
  mode = 'unavailable';
  await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'falta el modelo de evaluación' }).waitFor();
  assert.equal(await rows.count(), 0, 'Un análisis fallido no muestra resultados antiguos como actuales.');
  mode = 'network';
  await page.getByRole('button', { name: 'Reintentar análisis', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'conectar' }).waitFor();
  mode = 'empty';
  await page.getByRole('button', { name: 'Reintentar análisis', exact: true }).click();
  await page.getByText('No hay pacientes en el resultado', { exact: true }).waitFor();
  assert.equal(await rows.count(), 0);
  mode = 'success';
  await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir Prueba alta', exact: true }).waitFor();
  mode = 'empty-files';
  await page.reload();
  await page.getByText('No hay fuentes de analíticas disponibles en la carpeta del servidor.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Revisar de nuevo', exact: true }).isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: bandeja, lote B, orden, datos y fechas, filtros, histórico, aislamiento, navegación, móvil, carga, HTTP 501, red, vacío y recuperación (fixtures explícitas).');
} finally {
  releaseBatch?.();
  await browser.close();
}
