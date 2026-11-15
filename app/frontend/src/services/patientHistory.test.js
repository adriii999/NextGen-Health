import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyPoints } from './patientHistory.js';

test('uses clinical dates, preserves missing values and zero, and excludes undated points', () => {
  const points = historyPoints([
    { nombre_archivo: 'a.json', fecha_analitica: '2026-03-01', datos_resumen: { egfr: 82, fuma: 0 } },
    { nombre_archivo: 'z.json', fecha_analitica: '2025-03-01', datos_resumen: { egfr: 90 } },
    { nombre_archivo: 'bad.json', fecha_analitica: 'sin fecha', datos_resumen: { egfr: 99 } },
  ]);
  assert.deepEqual(points.map((point) => point.archivo), ['z.json', 'a.json']);
  assert.deepEqual(points.map((point) => point.egfr), [90, 82]);
  assert.equal(points[1].fuma, 0);
  assert.equal(points[0].uacr, null);
  assert.equal(points[1].timestamp - points[0].timestamp, 365 * 86400000);
});
