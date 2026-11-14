import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.BROWSER_TEST_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const fixture = (name) => fileURLToPath(new URL(`../../../data/analiticas/paciente_01_seguimiento_control_sano/${name}`, import.meta.url));
const previous = fixture('2025-02_analitica_basal.json');
const current = fixture('2026-02_analitica_anual.json');
try {
  await page.goto(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:5173');
  await page.getByRole('heading', { name: 'Revisar un paciente', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cargar archivos externos', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Analizar lote', exact: true }).count(), 0);
  await page.getByText('¿Qué debe contener cada JSON?', { exact: true }).click();
  await page.getByText('¿Qué debe contener cada JSON?', { exact: true }).click();
  await page.getByLabel('Cargar analíticas desde tu ordenador').setInputFiles([current, previous]);
  await page.getByRole('status').filter({ hasText: '2 analíticas validadas' }).waitFor();
  await page.getByRole('button', { name: 'Evaluar paciente', exact: true }).click();
  const result = page.getByRole('region', { name: 'Resultado del paciente', exact: true });
  await result.waitFor();
  assert.match(await result.innerText(), /Modo B/);
  assert.match(await result.innerText(), /Estratificación cardiorrenal/);
  await result.getByRole('button', { name: /Analítica sola.*2025/ }).click();
  await result.waitFor();
  assert.match(await result.innerText(), /Modo A/);
  await result.getByRole('button', { name: /Todo el seguimiento/ }).click();
  await result.waitFor();
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Revisar otro paciente' }).click();
  assert.equal(await result.count(), 0);
  await page.getByLabel('Cargar analíticas desde tu ordenador').setInputFiles({
    name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{"edad":50}'),
  });
  await page.getByRole('alert').filter({ hasText: 'egfr' }).waitFor();
  await page.getByLabel('Cargar analíticas desde tu ordenador').setInputFiles({
    name: 'roto.json', mimeType: 'application/json', buffer: Buffer.from('{'),
  });
  await page.getByRole('alert').filter({ hasText: 'JSON válido' }).waitFor();
  await page.getByLabel('Cargar analíticas desde tu ordenador').setInputFiles(current);
  await page.getByRole('status').filter({ hasText: '1 analíticas validadas' }).waitFor();
  await page.getByRole('button', { name: 'Evaluar paciente', exact: true }).click();
  await result.waitFor();
  assert.match(await result.innerText(), /Modo A/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: real JSON upload, chronological preview, real model A/B, individual visit selection, reset, invalid JSON, missing fields, mobile 375px, no page errors.');
} finally {
  await browser.close();
}
