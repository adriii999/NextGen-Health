import test from 'node:test';
import assert from 'node:assert/strict';
import { modelAlertScores } from './modelAlertScore.js';

test('exposes each valid model score and its alert threshold on a 0–100 scale', () => {
  const patient = { tipos_riesgo: {
    riesgo_aterosclerotico: { valor: 0.237, umbral: 0.1, alerta: true },
    riesgo_insuficiencia_cardiaca: { valor: 0.08, umbral: 0.08, alerta: true },
    riesgo_cardiorrenal: { valor: null, alerta: null },
  } };
  assert.deepEqual(modelAlertScores(patient), [
    { key: 'riesgo_aterosclerotico', label: 'Circulación', score: 24, threshold: 10, alert: true, aboveThreshold: true },
    { key: 'riesgo_insuficiencia_cardiaca', label: 'Insuficiencia cardíaca', score: 8, threshold: 8, alert: true, aboveThreshold: true },
    { key: 'riesgo_cardiorrenal', label: 'Riñón y corazón', score: null, threshold: null, alert: null, aboveThreshold: false },
  ]);
});

test('does not flag a score below the threshold', () => {
  assert.equal(modelAlertScores({ tipos_riesgo: {
    riesgo_aterosclerotico: { valor: 0.09, umbral: 0.1 },
  } })[0].aboveThreshold, false);
});

test('does not make a score from invalid model values', () => {
  assert.equal(modelAlertScores({ tipos_riesgo: {
    riesgo_aterosclerotico: { valor: 1.1 },
    riesgo_insuficiencia_cardiaca: { valor: '0.4' },
  } }).every((item) => item.score === null), true);
});
