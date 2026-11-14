import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_FILES, DEMO_PATIENTS } from './frontendDemoData.js';

test('demo fixtures are explicitly fictional and contain selectable model-like results', () => {
  assert.equal(DEMO_FILES.length, 2);
  assert.equal(DEMO_PATIENTS.length, 2);
  for (const patient of DEMO_PATIENTS) {
    assert.match(patient.nombre, /DEMO/i);
    assert.equal(patient.isDemo, true);
    assert.ok(patient.tipos_riesgo.riesgo_cardiorrenal);
    assert.ok(patient.factores_clave.length > 0);
  }
});
