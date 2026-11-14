const labels = {
  edad: ['Edad', 'años'], sexo: ['Sexo biológico', ''],
  bmi: ['Índice de masa corporal', 'kg/m²'],
  ap_hi: ['Presión arterial sistólica', 'mmHg'],
  ap_lo: ['Presión arterial diastólica', 'mmHg'],
  colesterol_total: ['Colesterol total', 'mg/dL'],
  fuma: ['Tabaquismo activo', ''], diabetes: ['Diabetes', ''],
  egfr: ['Filtrado del riñón', 'mL/min/1,73 m²'],
  uacr: ['Albúmina en orina', 'mg/g'],
};

const display = (value) => value === null || value === undefined || value === ''
  ? 'Sin dato'
  : Number.isFinite(Number(value)) ? Number(value).toLocaleString('es-ES') : 'Dato no válido';

export function IncompletePatientDetail({ patient }) {
  const missing = patient.campos_pendientes.map((key) => labels[key]?.[0] || key);
  const available = Object.entries(labels).filter(([key]) => {
    const value = patient.datos_entrada[key];
    return value !== null && value !== undefined && value !== '';
  });

  return <section className="surface incomplete-detail" aria-label="Datos del paciente pendientes de evaluación">
    <p className="eyebrow">Evaluación no realizada</p>
    <h2>{patient.estado === 'DATOS_INSUFICIENTES' ? 'Faltan datos clínicos' : 'Hay datos que revisar'}</h2>
    <p className="incomplete-warning" role="note">
      No se ha calculado una puntuación ni una prioridad para este paciente.
      La falta o invalidez de datos no significa riesgo bajo ni ausencia de enfermedad.
    </p>
    {missing.length > 0 && <section className="result-section">
      <h3>Información necesaria para evaluar</h3>
      <ul className="missing-fields">{missing.map((field) => <li key={field}>{field}</li>)}</ul>
    </section>}
    {patient.errores_datos.length > 0 && <section className="result-section" role="alert">
      <h3>Revisar los datos de entrada</h3>
      <ul className="missing-fields">{patient.errores_datos.map((error) => <li key={error}>{labels[error]?.[0] || error}</li>)}</ul>
    </section>}
    <section className="result-section">
      <h3>Datos recibidos</h3>
      {available.length ? <dl className="lab-grid">
        {available.map(([key, [label, unit]]) => (
          <div className="lab-value" key={key}>
            <dt>{label}</dt><dd>{display(patient.datos_entrada[key])} {unit}</dd>
          </div>
        ))}
      </dl> : <p>No hay datos clínicos que se puedan mostrar.</p>}
    </section>
    <p className="incomplete-meta">Fuente: {patient.archivo}. Corrige o completa la fuente original y vuelve a analizar el cupo.</p>
  </section>;
}
