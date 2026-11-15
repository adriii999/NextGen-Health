import { priorityExplanation } from '../../services/priorityExplanation';
import { modelAlertScores } from '../../services/modelAlertScore';

const format = (value) => value === null || value === undefined
  ? 'No disponible'
  : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });

const valueLabel = (field) =>
  Number.isFinite(field.actual) ? `${format(field.actual)} ${field.unidad}` : 'Sin dato';

const factorLabels = {
  edad: 'Edad', sexo: 'Sexo', bmi: 'Índice de masa corporal',
  ap_hi: 'Presión sistólica', ap_lo: 'Presión diastólica',
  colesterol_total: 'Colesterol total', fuma: 'Tabaquismo', diabetes: 'Diabetes',
  egfr: 'Filtrado del riñón', uacr: 'Albúmina en orina',
  delta_egfr: 'Cambio del filtrado', delta_uacr: 'Cambio de albúmina',
  delta_ap_hi: 'Cambio de presión', delta_colesterol: 'Cambio de colesterol',
  delta_bmi: 'Cambio de masa corporal',
};

function ModeOptions({ patient, visits, busy, onEvaluateMode, isModoB }) {
  return <details className="mode-options">
    <summary>Cambiar evaluación</summary>
    <div className="mode-buttons">
      {visits.length >= 2 && <button type="button" className="button secondary small" disabled={!!busy}
        onClick={() => onEvaluateMode({ paciente_id: patient.paciente_id || patient.archivo, modo: 'B' })}>
        Seguimiento completo ({visits.length})
      </button>}
      {visits.length > 0 ? visits.map((visit) => <button type="button" key={visit.nombre_archivo}
        className="button secondary small" disabled={!!busy}
        onClick={() => onEvaluateMode({
          paciente_id: patient.paciente_id || patient.archivo,
          modo: 'A',
          analitica_archivo: visit.nombre_archivo,
        })}>
        {visit.fecha_analitica || visit.nombre_archivo}
      </button>) : <button type="button" className="button secondary small" disabled={!!busy}
        onClick={() => onEvaluateMode({ paciente_id: patient.paciente_id || patient.archivo, modo: 'A' })}>
        Analítica aislada
      </button>}
      <span className="inbox-meta">Vista actual: {isModoB ? 'seguimiento' : 'analítica aislada'}</span>
    </div>
  </details>;
}

export function PatientResults({
  patient, onEvaluateMode, busy, showHistory = true, showPatientHeading = true,
}) {
  const visits = Array.isArray(patient.historial_visitas) ? patient.historial_visitas : [];
  const isModoB = patient.modo_evaluacion === 'MODO_B';
  const kdigo = patient.perfil_renal;
  const egfr = patient.valores_clave.egfr;
  const uacr = patient.valores_clave.uacr;
  const pressure = patient.valores_clave.pas;
  const diastolic = patient.valores_clave.pad;
  const explanation = priorityExplanation(patient);
  const modelAreas = modelAlertScores(patient);

  return <article className="patient-result">
    <header className="result-heading">
      <div className="result-badges">
        <span className={`priority priority-${patient.nivel_prioridad}`}>
          Prioridad {patient.nivel_prioridad?.toLowerCase() || 'no disponible'}
        </span>
        <span className="mode-label">{isModoB ? 'Seguimiento' : 'Analítica aislada'}</span>
      </div>
      {showPatientHeading && <h2>{patient.nombre}</h2>}
      {onEvaluateMode && <ModeOptions
        patient={patient} visits={visits} busy={busy} onEvaluateMode={onEvaluateMode} isModoB={isModoB}
      />}
    </header>

    <section className="review-reason" aria-labelledby="review-reason-heading">
      <span className="review-overline">REVISIÓN ORIENTATIVA</span>
      <h3 id="review-reason-heading">Por qué aparece en la lista</h3>
      <p>{explanation.reason || explanation.alerts || 'El motivo de prioridad no está disponible.'}</p>
      {explanation.reason && explanation.alerts && <p>{explanation.alerts}</p>}
    </section>

    <div className="patient-context" aria-label="Contexto del paciente">
      <span><strong>Edad</strong> {Number.isFinite(patient.edad) ? `${format(patient.edad)} años` : 'Sin dato'}</span>
      <span><strong>Diabetes</strong> {patient.diabetes === 1 ? 'Sí' : patient.diabetes === 0 ? 'No' : 'Sin dato'}</span>
      <span><strong>Tabaco</strong> {patient.fuma === 1 ? 'Sí' : patient.fuma === 0 ? 'No' : 'Sin dato'}</span>
    </div>

    <div className="clinical-context">
      <section className="observed-clinical-data" aria-labelledby="observed-data-heading">
        <div className="clinical-section-heading">
          <div><span className="review-overline">ANALÍTICA</span><h3 id="observed-data-heading">Datos observados</h3></div>
          <span>Última evaluación</span>
        </div>
        <dl className="clinical-measures">
          <div><dt>Filtrado del riñón</dt><dd>{valueLabel(egfr)}</dd>
            <small>{Number.isFinite(egfr.delta)
              ? `Cambio anual: ${egfr.delta < 0 ? '−' : egfr.delta > 0 ? '+' : ''}${format(Math.abs(egfr.delta))} mL/min/año`
              : 'Sin cambio anterior disponible'}</small></div>
          <div><dt>Albúmina en orina</dt><dd>{valueLabel(uacr)}</dd></div>
          <div><dt>Presión arterial</dt><dd>{Number.isFinite(pressure.actual) && Number.isFinite(diastolic.actual)
            ? `${format(pressure.actual)} / ${format(diastolic.actual)} mmHg` : 'Sin dato completo'}</dd></div>
          <div><dt>Colesterol total</dt><dd>{valueLabel(patient.valores_clave.colesterol)}</dd></div>
        </dl>
        {kdigo?.progresor_rapido && <p className="observed-flag">Descenso rápido del filtrado del riñón.</p>}
      </section>

      <section className="model-context" aria-labelledby="model-context-heading">
        <div className="clinical-section-heading">
          <div><span className="review-overline">RESULTADO EXPERIMENTAL</span><h3 id="model-context-heading">Evaluación del modelo</h3></div>
        </div>
        <p>Las alertas se calculan a partir de los datos disponibles. No son un diagnóstico ni una probabilidad validada.</p>
        <ul className="model-area-list">{modelAreas.map(({ key, label, score, threshold, alert, aboveThreshold }) => (
          <li key={key} className="model-area-score">
            <div className="model-score-heading">
              <span>{label}</span>
              <strong>{score === null ? 'Sin puntuación' : `${score}/100 · ${alert === true
                ? 'Alerta' : alert === false ? 'Sin alerta' : 'Estado no disponible'}`}</strong>
            </div>
            <div className={`model-score-track${aboveThreshold ? ' is-over-threshold' : ''}`} role="img" aria-label={score === null
              ? `${label}: puntuación no disponible`
              : `${label}: puntuación experimental ${score} de 100${threshold === null ? '' : `, umbral de alerta ${threshold} de 100`}`}>
              {score !== null && <span style={{ width: `${score}%` }} />}
              {score !== null && threshold !== null && <i style={{ left: `${threshold}%` }} />}
            </div>
            <small>{score === null
              ? 'No hay datos suficientes para mostrar una puntuación.'
              : `Puntuación experimental${threshold === null ? '' : ` · marca: umbral de alerta (${threshold}/100)`}`}</small>
          </li>
        ))}</ul>
        {Array.isArray(patient.factores_clave) && patient.factores_clave.length > 0 && <div className="model-factors">
          <h4>Variables destacadas por el modelo</h4>
          <ul>{patient.factores_clave.map((factor, index) => <li key={`${factor.variable}-${index}`}>
            <span>{factorLabels[factor.variable] || factor.variable}</span>
            <strong>{factor.valor_actual || 'Sin dato'}</strong>
          </li>)}</ul>
          <p>El modelo las destaca en su explicación; no indican por sí solas una causa clínica.</p>
        </div>}
        <p className="model-context-note">Contrasta estas señales con la historia clínica. El modelo no demuestra una causa.</p>
      </section>
    </div>
    {showHistory && visits.length > 1 && <p className="history-hint">La revisión incluye {visits.length} analíticas disponibles.</p>}
  </article>;
}
