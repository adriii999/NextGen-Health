export const clinicalFields = [
  { key: 'egfr', label: 'Filtrado del riñón', unit: 'mL/min' },
  { key: 'uacr', label: 'Albúmina en orina', unit: 'mg/g' },
  { key: 'colesterol_total', label: 'Colesterol total', unit: 'mg/dL' },
  { key: 'ap_hi', label: 'Presión sistólica', unit: 'mmHg' },
  { key: 'ap_lo', label: 'Presión diastólica', unit: 'mmHg' },
  { key: 'bmi', label: 'Índice de masa corporal', unit: 'kg/m²' },
];

export function historyPoints(visits) {
  return visits.map((visit) => {
    const raw = visit.datos_resumen || {};
    const values = Object.fromEntries([...clinicalFields.map((field) => field.key), 'edad', 'sexo', 'fuma', 'diabetes']
      .map((key) => [key, raw[key] !== null && raw[key] !== undefined && raw[key] !== '' && Number.isFinite(Number(raw[key])) ? Number(raw[key]) : null]));
    return {
      ...values,
      archivo: visit.nombre_archivo,
      fecha: visit.fecha_analitica,
      timestamp: Date.parse(visit.fecha_analitica),
    };
  }).filter((visit) => Number.isFinite(visit.timestamp)).sort((a, b) => a.timestamp - b.timestamp);
}
