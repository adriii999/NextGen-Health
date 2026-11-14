import { RiskRadarChart } from '../charts/RiskRadarChart';
import { ShapImpactBar } from '../charts/ShapImpactBar';

const format = (value) =>
  value === null || value === undefined
    ? 'No disponible'
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export function PatientResults({ patient, onEvaluateMode, busy, showHistory = true }) {
  const visitas = Array.isArray(patient.historial_visitas) ? patient.historial_visitas : [];
  const isModoB = patient.modo_evaluacion === 'MODO_B';
  const kdigo = patient.perfil_renal;

  return (
    <article>
      <header className="result-heading">
        <div className="result-badges">
          <p className="eyebrow">
            Resultado individual ·{' '}
            <strong>
              {isModoB
                ? 'Modo B (Seguimiento longitudinal con progresión)'
                : 'Modo A (Analítica aislada sin historial)'}
            </strong>
          </p>
          <span className={`priority priority-${patient.nivel_prioridad}`}>
            Prioridad {patient.nivel_prioridad?.toLowerCase() || 'no disponible'}
          </span>
        </div>
        <h2>{patient.nombre}</h2>
        <p className="source-label">
          Paciente: <strong>{patient.paciente_id || patient.archivo}</strong>
          {patient.analitica_evaluada && patient.analitica_evaluada !== patient.archivo
            ? ` · Analítica activa: ${patient.analitica_evaluada}`
            : ''}
        </p>

        {onEvaluateMode && (
          <div className="mode-switcher" aria-label="Cambiar modo de evaluación del paciente">
            <span className="mode-switcher-label">Ejecutar evaluación en este paciente:</span>
            <div className="mode-buttons">
              {visitas.length >= 2 && (
                <button
                  type="button"
                  className={`button small ${isModoB ? 'primary' : 'secondary'}`}
                  disabled={!!busy}
                  onClick={() =>
                    onEvaluateMode({
                      paciente_id: patient.paciente_id || patient.archivo,
                      modo: 'B',
                    })
                  }
                >
                  Todo el seguimiento (Modo B · {visitas.length} analíticas)
                </button>
              )}
              {visitas.length > 0 ? (
                visitas.map((v) => {
                  const activeIsolated =
                    !isModoB && patient.analitica_evaluada === v.nombre_archivo;
                  return (
                    <button
                      type="button"
                      key={v.nombre_archivo}
                      className={`button small ${activeIsolated ? 'primary' : 'secondary'}`}
                      disabled={!!busy}
                      onClick={() =>
                        onEvaluateMode({
                          paciente_id: patient.paciente_id || patient.archivo,
                          modo: 'A',
                          analitica_archivo: v.nombre_archivo,
                        })
                      }
                    >
                      Analítica sola (Modo A): {v.fecha_analitica || v.nombre_archivo}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  className={`button small ${!isModoB ? 'primary' : 'secondary'}`}
                  disabled={!!busy}
                  onClick={() =>
                    onEvaluateMode({
                      paciente_id: patient.paciente_id || patient.archivo,
                      modo: 'A',
                    })
                  }
                >
                  Analítica sola (Modo A)
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="result-section">
        <RiskRadarChart tiposRiesgo={patient.tipos_riesgo} />
      </section>

      {kdigo && (
        <section className="kdigo-box" aria-label="Perfil renal KDIGO">
          <div className="kdigo-header">
            <h3>Estratificación cardiorrenal KDIGO 2024</h3>
            <div className="kdigo-tags">
              <span className="kdigo-tag">
                Estadio: {kdigo.estadio_gfr}-{kdigo.estadio_uacr}
              </span>
              <span className={`kdigo-tag kdigo-${kdigo.cuadrante_kdigo}`}>
                Riesgo KDIGO: {kdigo.cuadrante_kdigo}
              </span>
              {kdigo.progresor_rapido && (
                <span className="kdigo-tag kdigo-alert">
                  Progresor rápido (caída ≥ 5 mL/min/año)
                </span>
              )}
            </div>
          </div>
          <p>{kdigo.descripcion_clinica}</p>
        </section>
      )}

      <section className="clinical-summary">
        <h3>Valoración del modelo</h3>
        <p>{patient.conclusion_diagnostica || 'No hay una conclusión disponible.'}</p>
      </section>

      <section className="result-section">
        <ShapImpactBar factoresClave={patient.factores_clave} />
      </section>

      <section className="recommendation">
        <h3>Recomendación de apoyo</h3>
        <p>{patient.recomendacion_preventiva || 'No se ha recibido una recomendación.'}</p>
        <small>Revisa el contexto del paciente antes de decidir la actuación clínica.</small>
      </section>

      {showHistory && visitas.length > 1 && (
        <section className="result-section">
          <div className="section-heading">
            <div>
              <h3>Historial cronológico del paciente</h3>
              <p>
                Secuencia de analíticas registradas para este paciente ({visitas.length} visitas).
              </p>
            </div>
          </div>
          <div className="visits-table-wrap">
            <table className="visits-table">
              <thead>
                <tr>
                  <th>Fecha / Archivo</th>
                  <th>Edad</th>
                  <th>eGFR (mL/min)</th>
                  <th>uACR (mg/g)</th>
                  <th>TA (mmHg)</th>
                  <th>Colesterol (mg/dL)</th>
                  <th>IMC (kg/m²)</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v) => (
                  <tr key={v.nombre_archivo}>
                    <td>
                      <strong>{v.fecha_analitica}</strong>
                      <small className="visit-filename">{v.nombre_archivo}</small>
                    </td>
                    <td>{format(v.edad)}</td>
                    <td>{format(v.egfr)}</td>
                    <td>{format(v.uacr)}</td>
                    <td>
                      {format(v.ap_hi)}/{format(v.ap_lo)}
                    </td>
                    <td>{format(v.colesterol_total)}</td>
                    <td>{format(v.bmi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="result-section">
        <div className="section-heading">
          <div>
            <h3>Parámetros de la analítica</h3>
            <p>
              {isModoB
                ? 'Valores de la última visita y cambio interanual (delta) calculado respecto a la analítica previa.'
                : 'Valores evaluados en corte transversal aislado (Modo A, sin aplicar deltas históricos).'}
            </p>
          </div>
        </div>
        <div className="lab-grid">
          {Object.entries(patient.valores_clave).map(([key, value]) => (
            <div className="lab-value" key={key}>
              <span>{value.label}</span>
              <strong>
                {format(value.actual)} {value.actual !== null && <small>{value.unidad}</small>}
              </strong>
              <span className="lab-delta">
                {value.delta !== null
                  ? `Cambio interanual: ${value.delta > 0 ? '+' : ''}${format(value.delta)} ${value.unidad}`
                  : 'Evaluado sin cambio histórico (Modo A)'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
