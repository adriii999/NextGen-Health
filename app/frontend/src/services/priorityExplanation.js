const criteria = {
  DESCENSO_RAPIDO: 'descenso rápido del filtrado del riñón',
  RIESGO_RENAL_ALTO: 'clasificación renal alta',
  PRESION_ALTA: 'presión arterial elevada',
  PUNTUACION_ALTA: 'puntuación elevada del modelo experimental',
  TRES_ALERTAS: 'alertas en las tres evaluaciones del modelo',
};

const alerts = {
  ALERTA_CIRCULACION: 'circulación',
  ALERTA_CORAZON: 'insuficiencia cardíaca',
  ALERTA_RINON_CORAZON: 'riñón y corazón',
};

export function priorityExplanation(patient) {
  const reasons = Array.isArray(patient.motivos_prioridad) ? patient.motivos_prioridad : [];
  const observed = Object.entries(criteria)
    .filter(([key]) => reasons.includes(key)).map(([, label]) => label);
  const model = Object.entries(alerts)
    .filter(([key]) => reasons.includes(key)).map(([, label]) => label);
  return {
    reason: observed.length ? `Motivo de prioridad: ${observed.join('; ')}` : '',
    alerts: model.length ? `Alerta experimental: ${model.join(', ')}`
      : reasons.includes('SIN_ALERTAS') ? 'Sin alertas del modelo' : '',
  };
}
