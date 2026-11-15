const criteria = {
  DESCENSO_RAPIDO: 'descenso rápido del filtrado del riñón',
  RIESGO_RENAL_ALTO: 'clasificación renal de alto riesgo',
  PRESION_ALTA: 'presión arterial elevada',
  PUNTUACION_ALTA: 'puntuación elevada del modelo experimental',
  MULTIPLES_ALERTAS: 'afectación simultánea en tres o más ejes clínicos',
  TRES_ALERTAS: 'alertas en múltiples ejes principales',
};

const alerts = {
  ALERTA_CIRCULACION: 'coronario e isquemia',
  ALERTA_CORAZON: 'sobrecarga e insuficiencia cardíaca',
  ALERTA_RINON_CORAZON: 'función renal (filtrado)',
  ALERTA_MICROVASCULAR: 'daño microvascular y endotelial',
  ALERTA_CARDIOMETABOLICO: 'descompensación cardiometabólica',
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
