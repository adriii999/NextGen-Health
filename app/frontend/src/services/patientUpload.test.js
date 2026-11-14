import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPatientFiles } from './patientUpload.js';

const file = (name, text, size = 10) => ({ name, size, text: async () => text });

test('reads each JSON with its original filename', async () => {
  assert.deepEqual(await readPatientFiles([file('visita.json', '{"edad":60}')]),
    [{ archivo: 'visita.json', datos: { edad: 60 } }]);
});

test('rejects malformed, non-object, unsupported, duplicate and oversized inputs', async () => {
  for (const files of [
    [], [file('a.pdf', '{}')], [file('a.json', 'roto')],
    [file('a.json', '[]')], [file('a.json', 'null')],
    [file('a.json', '{}', 1024 * 1024 + 1)],
    [file('a.json', '{}'), file('a.json', '{}')],
  ]) await assert.rejects(() => readPatientFiles(files));
});
