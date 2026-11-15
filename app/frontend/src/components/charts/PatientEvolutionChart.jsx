import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clinicalFields, historyPoints } from '../../services/patientHistory';

const dateLabel = (timestamp) => new Date(timestamp).toLocaleDateString('es-ES', { timeZone: 'UTC' });
const display = (value) => value === null || value === undefined ? 'Sin dato' : value.toLocaleString('es-ES');

export function PatientEvolutionChart({ patient, onSelectVisit = null }) {
  const [activeTab, setActiveTab] = useState('evolucion'); // 'evolucion' | 'analiticas'
  const [parameter, setParameter] = useState('egfr');

  const rawVisits = (Array.isArray(patient.analiticas) && patient.analiticas.length)
    ? patient.analiticas
    : (Array.isArray(patient.historial_visitas) && patient.historial_visitas.length)
      ? patient.historial_visitas.map((v) => ({
          nombre_archivo: v.nombre_archivo,
          fecha_analitica: v.fecha_analitica,
          datos_resumen: v,
        }))
      : [{
          nombre_archivo: patient.analitica_evaluada || patient.archivo,
          fecha_analitica: patient.datos_entrada?.fecha_analitica,
          datos_resumen: patient.datos_entrada || {},
        }];

  const points = historyPoints(rawVisits);
  const [inspectedFile, setInspectedFile] = useState(
    patient.analitica_evaluada || points.at(-1)?.archivo || rawVisits[0]?.nombre_archivo || ''
  );

  const field = clinicalFields.find((item) => item.key === parameter) || clinicalFields[0];
  const inspectedVisit = points.find((item) => item.archivo === inspectedFile)
    || rawVisits.find((item) => (item.nombre_archivo || item.archivo) === inspectedFile);

  const isModoB = patient.modo_evaluacion === 'MODO_B' || (!patient.modo_evaluacion && patient.tiene_progresion);
  const evaluatedFile = patient.analitica_evaluada || '';

  return (
    <div className="evolution-panel" aria-label="Evolución y analíticas del paciente">
      <div className="evolution-panel-header">
        <div>
          <span className="review-overline">HISTORIAL Y PROGRESIÓN</span>
          <h4>Ver evolución</h4>
        </div>
        <div className="evolution-nav-tabs" role="tablist" aria-label="Pestañas de evolución">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'evolucion'}
            className={`evolution-nav-tab ${activeTab === 'evolucion' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('evolucion')}
          >
            Evolución
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'analiticas'}
            className={`evolution-nav-tab ${activeTab === 'analiticas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('analiticas')}
          >
            Analíticas ({rawVisits.length})
          </button>
        </div>
      </div>

      {activeTab === 'evolucion' && (
        <div className="evolution-chart-content fade-in-content" key="tab-evolucion">
          <div className="evolution-parameter-row">
            <label htmlFor="chart-parameter">Parámetro del gráfico:</label>
            <select
              id="chart-parameter"
              value={parameter}
              onChange={(event) => setParameter(event.target.value)}
            >
              {clinicalFields.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} ({item.unit})
                </option>
              ))}
            </select>
          </div>

          {points.length > 1 ? (
            <>
              <p className="evolution-caption">
                {field.label} ({field.unit}). Fechas reales registradas en las visitas.
              </p>
              <div
                className="evolution-chart-container"
                role="img"
                aria-label={`Evolución de ${field.label}: ${points.map((p) => `${p.fecha}: ${display(p[parameter])} ${field.unit}`).join('; ')}`}
              >
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={points} margin={{ top: 12, right: 16, bottom: 6, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece7" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      ticks={points.map((p) => p.timestamp)}
                      tickFormatter={dateLabel}
                      minTickGap={20}
                      tick={{ fontSize: 10, fill: '#526765' }}
                    />
                    <YAxis width={38} tick={{ fontSize: 10, fill: '#526765' }} domain={['auto', 'auto']} />
                    <Tooltip
                      labelFormatter={dateLabel}
                      formatter={(value) => [`${display(value)} ${field.unit}`, field.label]}
                    />
                    <Line
                      type="linear"
                      dataKey={parameter}
                      stroke="#17695e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#17695e' }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="evolution-single-note">
              {points.length === 1
                ? `Solo hay una analítica disponible (${points[0].fecha || 'sin fecha'}). Se requieren al menos dos para graficar la evolución temporal.`
                : 'No hay suficientes analíticas con fecha para graficar la evolución.'}
            </p>
          )}
        </div>
      )}

      {activeTab === 'analiticas' && (
        <div className="evolution-labs-content fade-in-content" key="tab-analiticas">
          <p className="evolution-caption">
            Haz clic en una analítica para inspeccionar todos sus biomarcadores:
          </p>
          <div className="labs-table-container">
            <table className="labs-table">
              <thead>
                <tr>
                  <th>Fecha / Archivo</th>
                  <th>eGFR</th>
                  <th>uACR</th>
                  <th>Presión</th>
                  <th>Colesterol</th>
                  {onSelectVisit && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {rawVisits.map((item, index) => {
                  const filename = item.nombre_archivo || item.archivo || `Visita ${index + 1}`;
                  const summary = item.datos_resumen || item;
                  const date = item.fecha_analitica || summary.fecha_analitica || 'Sin fecha';
                  // En modo seguimiento (longitudinal), ninguna analítica aislada está "en pantalla".
                  // Todas deben permitir evaluarse individualmente.
                  const isCurrent = !isModoB && (filename === evaluatedFile);
                  const isInspected = filename === inspectedFile;

                  const ptIndex = points.findIndex((p) => p.archivo === filename);
                  const prevPt = ptIndex > 0 ? points[ptIndex - 1] : null;
                  const currentPt = ptIndex >= 0 ? points[ptIndex] : null;

                  let deltaEgfr = null;
                  if (currentPt && prevPt && Number.isFinite(currentPt.egfr) && Number.isFinite(prevPt.egfr)) {
                    deltaEgfr = Math.round((currentPt.egfr - prevPt.egfr) * 10) / 10;
                  }

                  let deltaUacr = null;
                  if (currentPt && prevPt && Number.isFinite(currentPt.uacr) && Number.isFinite(prevPt.uacr)) {
                    deltaUacr = Math.round((currentPt.uacr - prevPt.uacr) * 10) / 10;
                  }

                  return (
                    <tr
                      key={filename}
                      className={`${isInspected ? 'is-selected' : ''} ${isCurrent ? 'is-evaluating' : ''}`}
                      onClick={() => setInspectedFile(filename)}
                    >
                      <td>
                        <strong>{date}</strong>
                        <span className="lab-filename">{filename}</span>
                        {isCurrent && <span className="badge-current">Evaluada individualmente</span>}
                      </td>
                      <td>
                        <span>{display(summary.egfr)} mL/min</span>
                        {deltaEgfr !== null && (
                          <span
                            className={`delta-badge ${deltaEgfr < 0 ? 'delta-adverse' : deltaEgfr > 0 ? 'delta-favorable' : 'delta-neutral'}`}
                            title={`Diferencial respecto a visita previa: ${deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr} mL/min`}
                          >
                            {deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr}
                          </span>
                        )}
                      </td>
                      <td>
                        <span>{display(summary.uacr)} mg/g</span>
                        {deltaUacr !== null && (
                          <span
                            className={`delta-badge ${deltaUacr > 0 ? 'delta-adverse' : deltaUacr < 0 ? 'delta-favorable' : 'delta-neutral'}`}
                            title={`Diferencial respecto a visita previa: ${deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr} mg/g`}
                          >
                            {deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr}
                          </span>
                        )}
                      </td>
                      <td>
                        {summary.ap_hi && summary.ap_lo
                          ? `${display(summary.ap_hi)} / ${display(summary.ap_lo)}`
                          : 'Sin dato'}
                      </td>
                      <td>{display(summary.colesterol_total)} mg/dL</td>
                      {onSelectVisit && (
                        <td>
                          {!isCurrent ? (
                            <button
                              type="button"
                              className="button secondary tiny"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onSelectVisit(filename);
                              }}
                              title="Evaluar esta analítica de forma individual"
                            >
                              Evaluar
                            </button>
                          ) : (
                            <span className="text-muted tiny">En pantalla</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inspectedVisit && (
            <div className="visit-detail-card" aria-label="Detalle de analítica seleccionada">
              <h5>
                Detalle de analítica: {inspectedVisit.fecha_analitica || inspectedVisit.fecha || inspectedFile}
              </h5>
              <dl className="lab-grid">
                {[
                  ...clinicalFields,
                  { key: 'edad', label: 'Edad', unit: 'años' },
                  { key: 'sexo', label: 'Sexo (1 mujer, 2 hombre)', unit: '' },
                  { key: 'fuma', label: 'Fuma (0 no, 1 sí)', unit: '' },
                  { key: 'diabetes', label: 'Diabetes (0 no, 1 sí)', unit: '' },
                ].map((fld) => {
                  const val = inspectedVisit.datos_resumen
                    ? inspectedVisit.datos_resumen[fld.key]
                    : inspectedVisit[fld.key];
                  return (
                    <div className="lab-value" key={fld.key}>
                      <dt>{fld.label}</dt>
                      <dd>
                        {display(val)} {fld.unit}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
