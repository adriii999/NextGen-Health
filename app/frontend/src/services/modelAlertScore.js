const modelAreas = [
  ['riesgo_aterosclerotico', 'Circulación'],
  ['riesgo_insuficiencia_cardiaca', 'Insuficiencia cardíaca'],
  ['riesgo_cardiorrenal', 'Riñón y corazón'],
];

export function modelAlertScores(patient) {
  return modelAreas.map(([key, label]) => {
    const item = patient.tipos_riesgo?.[key];
    const valid = Number.isFinite(item?.valor) && item.valor >= 0 && item.valor <= 1;
    const validThreshold = Number.isFinite(item?.umbral) && item.umbral >= 0 && item.umbral <= 1;
    return {
      key,
      label,
      score: valid ? Math.round(item.valor * 100) : null,
      threshold: validThreshold ? Math.round(item.umbral * 100) : null,
      alert: item?.alerta ?? null,
      aboveThreshold: valid && validThreshold && item.valor >= item.umbral,
    };
  });
}
