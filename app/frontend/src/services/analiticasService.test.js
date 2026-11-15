import { test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from './apiClient.js';
import { analiticasService } from './analiticasService.js';

test('maps real clinical fields, preserves zero, and includes folder progression metadata', async () => {
  apiClient.defaults.adapter = async () => ({
    data: [{
      archivo: 'paciente_02_trampa',
      datos_entrada: {
        paciente_id: 'paciente_02_trampa',
        nombre: 'Seguimiento 02',
        analitica_evaluada: '2026-03_anual.json',
        modo_evaluacion: 'MODO_B',
        num_analiticas: 2,
        edad: '56',
        sexo: '1',
        egfr: '82',
        uacr: '0',
        ap_hi: '128',
        ap_lo: '82',
        colesterol_total: '195',
        bmi: '26.5',
        progresion: { delta_egfr: -9, delta_uacr: 0 },
        historial_visitas: [
          { nombre_archivo: '2025-03_basal.json', fecha_analitica: '2025-03-10', egfr: 91, uacr: 0 },
          { nombre_archivo: '2026-03_anual.json', fecha_analitica: '2026-03-10', egfr: 82, uacr: 0 },
        ],
      },
      evaluacion: {
        nivel_prioridad: 'ALTA',
        tipos_riesgo: {},
        factores_clave: [],
        perfil_renal: { cuadrante_kdigo: 'ALTO', progresor_rapido: true },
      },
    }],
    status: 200, headers: {}, config: {},
  });
  const result = await analiticasService.analizarCarpeta('B');
  const patient = result.pacientes[0];
  assert.equal(patient.valores_clave.egfr.actual, 82);
  assert.equal(patient.valores_clave.egfr.delta, -9);
  assert.equal(patient.valores_clave.uacr.actual, 0);
  assert.equal(patient.valores_clave.uacr.delta, 0);
  assert.equal(patient.nombre, 'Seguimiento 02');
  assert.equal(patient.paciente_id, 'paciente_02_trampa');
  assert.equal(patient.modo_evaluacion, 'MODO_B');
  assert.equal(patient.analitica_evaluada, '2026-03_anual.json');
  assert.equal(patient.historial_visitas.length, 2);
  assert.equal(patient.categoria, 'ALTO');
});

test('evaluarSeguimientoOAnalitica sends modo A or B to /analiticas/evaluar and maps response', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: {
        archivo: 'paciente_02_trampa',
        datos_entrada: {
          paciente_id: 'paciente_02_trampa',
          nombre: 'Seguimiento 02',
          analitica_evaluada: '2026-03_anual.json',
          modo_evaluacion: 'MODO_A',
          num_analiticas: 2,
          edad: 56,
          egfr: 82,
          uacr: 28,
          progresion: null,
        },
        evaluacion: { nivel_prioridad: 'BAJA', tipos_riesgo: {}, factores_clave: [] },
      },
      status: 200, headers: {}, config: {},
    };
  };
  const res = await analiticasService.evaluarSeguimientoOAnalitica({
    paciente_id: 'paciente_02_trampa',
    modo: 'A',
    analitica_archivo: '2026-03_anual.json',
  });
  assert.equal(res.paciente.modo_evaluacion, 'MODO_A');
  assert.equal(res.paciente.tiene_progresion, false);
  assert.match(capturedConfig.url, /\/analiticas\/evaluar$/);
});

test('list and inference failures are rejected, never replaced with mock success', async () => {
  apiClient.defaults.adapter = async () => { throw Object.assign(new Error('unavailable'), { response: { status: 501 } }); };
  await assert.rejects(() => analiticasService.getArchivosAnaliticas());
  await assert.rejects(() => analiticasService.analizarCarpeta());
  await assert.rejects(() => analiticasService.evaluarSeguimientoOAnalitica({ paciente_id: 'x', modo: 'B' }));
  await assert.rejects(() => analiticasService.predecirIndividual({}));
});

test('empty successful analysis clears results and malformed responses fail', async () => {
  apiClient.defaults.adapter = async () => ({ data: [], status: 200, headers: {}, config: {} });
  assert.deepEqual((await analiticasService.analizarCarpeta()).pacientes, []);
  apiClient.defaults.adapter = async () => ({ data: {}, status: 200, headers: {}, config: {} });
  await assert.rejects(() => analiticasService.analizarCarpeta());
});

test('batch analysis preserves incomplete patients without fabricating risk values', async () => {
  apiClient.defaults.adapter = async () => ({
    data: [{
      archivo: 'paciente_pendiente',
      estado: 'DATOS_INSUFICIENTES',
      campos_pendientes: ['uacr'],
      errores_datos: [],
      evaluacion: null,
      datos_entrada: {
        paciente_id: 'paciente_pendiente', nombre: 'Paciente pendiente',
        edad: 64, egfr: 58, uacr: null, fecha_analitica: '2026-04-10',
      },
    }],
    status: 200, headers: {}, config: {},
  });

  const [patient] = (await analiticasService.analizarCarpeta()).pacientes;

  assert.equal(patient.estado, 'DATOS_INSUFICIENTES');
  assert.deepEqual(patient.campos_pendientes, ['uacr']);
  assert.equal(patient.valores_clave.egfr.actual, 58);
  assert.equal(patient.valores_clave.uacr.actual, null);
  assert.equal('hay_riesgo' in patient, false);
  assert.equal(patient.nivel_prioridad, undefined);
});
