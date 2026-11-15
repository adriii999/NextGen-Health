import { useEffect, useState } from 'react';
import { priorityExplanation } from '../../services/priorityExplanation';
import { modelAlertScores } from '../../services/modelAlertScore';
import { PatientEvolutionChart } from '../charts/PatientEvolutionChart';

function AnimatedRiskBar({ score, aboveThreshold, animKey }) {
  return (
    <span
      key={animKey}
      className={`risk-bar-fill ${aboveThreshold ? 'is-over-threshold' : ''}`}
      style={{
        width: `${score ?? 0}%`,
        transformOrigin: 'left center',
        animation: 'scoreBarGrowLeftToRight 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    />
  );
}

const format = (value) => value === null || value === undefined
  ? 'No disponible'
  : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });

const valueLabel = (field) =>
  Number.isFinite(field?.actual) ? `${format(field.actual)} ${field.unidad}` : 'Sin dato';

const factorLabels = {
  edad: 'Edad', sexo: 'Sexo', bmi: 'Índice de masa corporal',
  ap_hi: 'Presión sistólica', ap_lo: 'Presión diastólica',
  colesterol_total: 'Colesterol total', fuma: 'Tabaquismo', diabetes: 'Diabetes',
  egfr: 'Filtrado del riñón', uacr: 'Albúmina en orina',
  delta_egfr: 'Cambio del filtrado', delta_uacr: 'Cambio de albúmina',
  delta_ap_hi: 'Cambio de presión', delta_colesterol: 'Cambio de colesterol',
  delta_bmi: 'Cambio de masa corporal',
};

export function PatientResults({
  patient, onEvaluateMode, busy, showHistory = true, showPatientHeading = true,
}) {
  const rawVisits = (Array.isArray(patient.historial_visitas) && patient.historial_visitas.length)
    ? patient.historial_visitas
    : (Array.isArray(patient.analiticas) && patient.analiticas.length)
      ? patient.analiticas
      : (patient.datos_entrada?.historial_visitas && patient.datos_entrada.historial_visitas.length)
        ? patient.datos_entrada.historial_visitas
        : [{
            nombre_archivo: patient.analitica_evaluada || patient.archivo,
            fecha_analitica: patient.datos_entrada?.fecha_analitica,
            ...patient.datos_entrada,
          }];

  const visits = rawVisits.map((v) => ({
    nombre_archivo: v.nombre_archivo || v.archivo || patient.analitica_evaluada,
    fecha_analitica: v.fecha_analitica || v.datos_resumen?.fecha_analitica,
    datos_resumen: v.datos_resumen || v,
    ...v,
  }));

  const isModoB = patient.modo_evaluacion === 'MODO_B';
  const kdigo = patient.perfil_renal;
  const egfr = patient.valores_clave.egfr;
  const uacr = patient.valores_clave.uacr;
  const pressure = patient.valores_clave.pas;
  const diastolic = patient.valores_clave.pad;
  const explanation = priorityExplanation(patient);
  const modelAreas = modelAlertScores(patient);

  const currentFile = patient.analitica_evaluada || visits[0]?.nombre_archivo;

  return (
    <article
      className="patient-result fade-in-content"
      key={`${patient.id || patient.paciente_id}-${patient.modo_evaluacion}-${patient.analitica_evaluada}`}
    >
      <header className="result-heading">
        <div className="result-badges">
          <span className={`priority priority-${patient.nivel_prioridad}`}>
            Prioridad {patient.nivel_prioridad?.toLowerCase() || 'no disponible'}
          </span>

          {/* Pestañas de evaluación: Seguimiento y Analíticas individuales */}
          <div className="evaluation-mode-tabs" role="tablist" aria-label="Modo de evaluación">
            <button
              type="button"
              role="tab"
              aria-selected={isModoB}
              className={`evaluation-mode-tab ${isModoB ? 'is-active' : ''}`}
              disabled={!!busy}
              onClick={() => {
                if (!isModoB && onEvaluateMode) {
                  onEvaluateMode({
                    paciente_id: patient.paciente_id || patient.archivo,
                    modo: 'B',
                  });
                }
              }}
            >
              Seguimiento
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isModoB}
              className={`evaluation-mode-tab ${!isModoB ? 'is-active' : ''}`}
              disabled={!!busy}
              onClick={() => {
                if (isModoB && onEvaluateMode) {
                  onEvaluateMode({
                    paciente_id: patient.paciente_id || patient.archivo,
                    modo: 'A',
                    analitica_archivo: currentFile,
                  });
                }
              }}
            >
              Analíticas individuales
            </button>
          </div>

          {/* Menú desplegable [Nombre.json ⌄] en Analíticas individuales */}
          {!isModoB && visits.length > 0 && (
            <div className="individual-select-wrapper">
              <label htmlFor="individual-lab-select" className="sr-only">Seleccionar analítica</label>
              <select
                id="individual-lab-select"
                className="individual-select"
                value={currentFile}
                disabled={!!busy}
                onChange={(e) => {
                  const targetFile = e.target.value;
                  if (targetFile && onEvaluateMode) {
                    onEvaluateMode({
                      paciente_id: patient.paciente_id || patient.archivo,
                      modo: 'A',
                      analitica_archivo: targetFile,
                    });
                  }
                }}
              >
                {visits.map((visit) => (
                  <option key={visit.nombre_archivo} value={visit.nombre_archivo}>
                    {visit.nombre_archivo} {visit.fecha_analitica ? `(${visit.fecha_analitica})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {showPatientHeading && <h2>{patient.nombre}</h2>}
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
            <div>
              <span className="review-overline">ANALÍTICA</span>
              <h3 id="observed-data-heading">Datos observados</h3>
            </div>
            <span>{isModoB ? 'Seguimiento completo' : `Analítica: ${currentFile}`}</span>
          </div>

          <dl className="clinical-measures">
            <div>
              <dt>Filtrado del riñón</dt>
              <dd>{valueLabel(egfr)}</dd>
              {Number.isFinite(egfr?.delta) ? (
                <small className={`delta-tag ${egfr.delta < 0 ? 'delta-adverse' : egfr.delta > 0 ? 'delta-favorable' : 'delta-neutral'}`}>
                  Cambio: {egfr.delta > 0 ? '+' : egfr.delta < 0 ? '−' : ''}{format(Math.abs(egfr.delta))} mL/min
                </small>
              ) : (
                <small className="delta-tag delta-neutral">Sin cambio anterior disponible</small>
              )}
            </div>
            <div>
              <dt>Albúmina en orina</dt>
              <dd>{valueLabel(uacr)}</dd>
              {Number.isFinite(uacr?.delta) && (
                <small className={`delta-tag ${uacr.delta > 0 ? 'delta-adverse' : uacr.delta < 0 ? 'delta-favorable' : 'delta-neutral'}`}>
                  Cambio: {uacr.delta > 0 ? '+' : uacr.delta < 0 ? '−' : ''}{format(Math.abs(uacr.delta))} mg/g
                </small>
              )}
            </div>
            <div>
              <dt>Presión arterial</dt>
              <dd>
                {Number.isFinite(pressure?.actual) && Number.isFinite(diastolic?.actual)
                  ? `${format(pressure.actual)} / ${format(diastolic.actual)} mmHg`
                  : 'Sin dato completo'}
              </dd>
              {Number.isFinite(pressure?.delta) && (
                <small className={`delta-tag ${pressure.delta > 0 ? 'delta-adverse' : pressure.delta < 0 ? 'delta-favorable' : 'delta-neutral'}`}>
                  Cambio: {pressure.delta > 0 ? '+' : pressure.delta < 0 ? '−' : ''}{format(Math.abs(pressure.delta))} mmHg
                </small>
              )}
            </div>
            <div>
              <dt>Colesterol total</dt>
              <dd>{valueLabel(patient.valores_clave.colesterol)}</dd>
              {Number.isFinite(patient.valores_clave.colesterol?.delta) && (
                <small className={`delta-tag ${patient.valores_clave.colesterol.delta > 0 ? 'delta-adverse' : patient.valores_clave.colesterol.delta < 0 ? 'delta-favorable' : 'delta-neutral'}`}>
                  Cambio: {patient.valores_clave.colesterol.delta > 0 ? '+' : patient.valores_clave.colesterol.delta < 0 ? '−' : ''}{format(Math.abs(patient.valores_clave.colesterol.delta))} mg/dL
                </small>
              )}
            </div>
          </dl>

          {kdigo?.progresor_rapido && (
            <p className="observed-flag">Descenso rápido del filtrado del riñón.</p>
          )}

          {/* Apartado "Ver evolución" (Rectángulo verde) con pestañas "Evolución" y "Analíticas" */}
          <div className="observed-evolution-wrapper">
            <PatientEvolutionChart
              patient={patient}
              onSelectVisit={onEvaluateMode ? (archivo) => onEvaluateMode({
                paciente_id: patient.paciente_id || patient.archivo,
                modo: 'A',
                analitica_archivo: archivo,
              }) : null}
            />
          </div>
        </section>

        <section className="model-context" aria-labelledby="model-context-heading">
          <div className="clinical-section-heading">
            <div>
              <span className="review-overline">RESULTADO EXPERIMENTAL</span>
              <h3 id="model-context-heading">Evaluación del modelo</h3>
            </div>
          </div>
          <p>
            Las alertas se calculan a partir de los datos disponibles. No son un diagnóstico ni una probabilidad validada.
          </p>
          <ul className="model-area-list" key={`${patient.id}-${patient.modo_evaluacion}-${patient.analitica_evaluada}`}>
            {modelAreas.map(({ key, label, score, threshold, alert, aboveThreshold }) => (
              <li key={key} className="model-area-score">
                <div className="model-score-heading">
                  <span>{label}</span>
                  <strong>
                    {score === null
                      ? 'Sin puntuación'
                      : `${score}/100 · ${alert === true ? 'Alerta' : alert === false ? 'Sin alerta' : 'Estado no disponible'}`}
                  </strong>
                </div>
                <div
                  className={`model-score-track${aboveThreshold ? ' is-over-threshold' : ''}`}
                  role="img"
                  aria-label={
                    score === null
                      ? `${label}: puntuación no disponible`
                      : `${label}: puntuación experimental ${score} de 100${threshold === null ? '' : `, umbral de alerta ${threshold} de 100`}`
                  }
                >
                  {score !== null && (
                    <AnimatedRiskBar
                      score={score}
                      aboveThreshold={aboveThreshold}
                      animKey={`risk-bar-${key}-${score}-${patient.paciente_id || patient.archivo}-${patient.modo_evaluacion}-${patient.analitica_evaluada}`}
                    />
                  )}
                  {score !== null && threshold !== null && <i style={{ left: `${threshold}%` }} />}
                </div>
                <small>
                  {score === null
                    ? 'No hay datos suficientes para mostrar una puntuación.'
                    : `Puntuación experimental${threshold === null ? '' : ` · marca: umbral de alerta (${threshold}/100)`}`}
                </small>
              </li>
            ))}
          </ul>

          {Array.isArray(patient.factores_clave) && patient.factores_clave.length > 0 && (
            <div className="model-factors">
              <h4>Variables destacadas por el modelo</h4>
              <ul>
                {patient.factores_clave.map((factor, index) => {
                  const isDelta = factor.variable.startsWith('delta_');
                  let deltaClass = '';
                  let formattedVal = factor.valor_actual;
                  if (isDelta && formattedVal) {
                    const cleanNum = parseFloat(String(formattedVal).replace('+', '').replace('−', '-'));
                    if (Number.isFinite(cleanNum)) {
                      if (factor.variable === 'delta_egfr') {
                        deltaClass = cleanNum < 0 ? 'delta-adverse' : cleanNum > 0 ? 'delta-favorable' : '';
                      } else {
                        deltaClass = cleanNum > 0 ? 'delta-adverse' : cleanNum < 0 ? 'delta-favorable' : '';
                      }
                      if (cleanNum > 0 && !String(formattedVal).startsWith('+')) {
                        formattedVal = `+${formattedVal}`;
                      }
                    }
                  }
                  return (
                    <li key={`${factor.variable}-${index}`}>
                      <span>{factorLabels[factor.variable] || factor.variable}</span>
                      <strong className={deltaClass}>{formattedVal || 'Sin dato'}</strong>
                    </li>
                  );
                })}
              </ul>
              <p>El modelo las destaca en su explicación; no indican por sí solas una causa clínica.</p>
            </div>
          )}
          <p className="model-context-note">
            Contrasta estas señales con la historia clínica. El modelo no demuestra una causa.
          </p>
        </section>
      </div>

      {showHistory && visits.length > 1 && (
        <p className="history-hint">La revisión incluye {visits.length} analíticas disponibles.</p>
      )}
    </article>
  );
}
