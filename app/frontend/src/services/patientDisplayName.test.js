import test from 'node:test';
import assert from 'node:assert/strict';
import { patientDisplayName } from './patientDisplayName.js';

test('shortens the numbered demo labels without altering real names or identifiers', () => {
  assert.equal(patientDisplayName({ nombre: 'Seguimiento 02 · Deterioro Silente', paciente_id: 'paciente_02_trampa' }), 'Paciente 02');
  assert.equal(patientDisplayName({ nombre: 'María García', paciente_id: 'paciente_02_trampa' }), 'María García');
  assert.equal(patientDisplayName({ nombre: 'Seguimiento 02 · María García', paciente_id: 'historia-224' }), 'Seguimiento 02 · María García');
  assert.equal(patientDisplayName({ nombre: 'paciente_externo.json', paciente_id: 'paciente_externo.json' }), 'paciente_externo.json');
});
