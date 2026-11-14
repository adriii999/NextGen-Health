import { test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from './apiClient.js';
import { analiticasService } from './analiticasService.js';

test('maps real clinical fields, preserves zero and does not invent missing values', async () => {
  apiClient.defaults.adapter = async () => ({
    data: [{
      archivo: 'lote.csv (fila 2)',
      datos_entrada: { edad: '62', sexo: '1', egfr: '68', uacr: '0', ap_hi: '132', delta_egfr: '0' },
      evaluacion: { nivel_prioridad: 'ALTA', tipos_riesgo: {}, factores_clave: [] },
    }],
    status: 200, headers: {}, config: {},
  });
  const result = await analiticasService.analizarCarpeta();
  const patient = result.pacientes[0];
  assert.equal(patient.valores_clave.egfr.actual, 68);
  assert.equal(patient.valores_clave.egfr.delta, 0);
  assert.equal(patient.valores_clave.uacr.actual, 0);
  assert.equal(patient.valores_clave.ldl, undefined);
  assert.equal(patient.nombre, 'lote.csv (fila 2)');
  assert.equal(patient.categoria, 'ALTO');
});

test('list and inference failures are rejected, never replaced with mock success', async () => {
  apiClient.defaults.adapter = async () => { throw Object.assign(new Error('unavailable'), { response: { status: 501 } }); };
  await assert.rejects(() => analiticasService.getArchivosAnaliticas());
  await assert.rejects(() => analiticasService.analizarCarpeta());
  await assert.rejects(() => analiticasService.predecirIndividual({}));
});

test('empty successful analysis clears results and malformed responses fail', async () => {
  apiClient.defaults.adapter = async () => ({ data: [], status: 200, headers: {}, config: {} });
  assert.deepEqual((await analiticasService.analizarCarpeta()).pacientes, []);
  apiClient.defaults.adapter = async () => ({ data: {}, status: 200, headers: {}, config: {} });
  await assert.rejects(() => analiticasService.analizarCarpeta());
});
