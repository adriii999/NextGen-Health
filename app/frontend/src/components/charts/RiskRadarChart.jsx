const risks = [
  ['riesgo_aterosclerotico', 'Riesgo aterosclerótico'],
  ['riesgo_insuficiencia_cardiaca', 'Insuficiencia cardíaca'],
  ['riesgo_cardiorrenal', 'Riñón y corazón'],
];
const percent = (value) => `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;

export function RiskRadarChart({ tiposRiesgo }) {
  return (
    <div className="risk-chart">
      <h3>Puntuaciones experimentales del modelo</h3><p className="chart-caption">La marca indica el umbral usado por el modelo. Estas puntuaciones no están validadas como riesgo clínico futuro.</p>
      {risks.map(([key, label]) => {
        const risk = tiposRiesgo?.[key];
        const valid = Number.isFinite(risk?.valor) && risk.valor >= 0 && risk.valor <= 1;
        const threshold = Number.isFinite(risk?.umbral) && risk.umbral >= 0 && risk.umbral <= 1;
        return <div className="risk-row" key={key}><div className="risk-label"><strong>{label}</strong><span>{valid ? percent(risk.valor) : 'No disponible'}</span></div>
          {valid && <div className="risk-track" role="img" aria-label={`${label}: ${percent(risk.valor)}${threshold ? `, umbral ${percent(risk.umbral)}` : ', umbral no disponible'}`}><span className={risk.alerta ? 'risk-fill elevated' : 'risk-fill'} style={{ width: percent(risk.valor).replace(',', '.') }} />{threshold && <span className="risk-threshold" style={{ left: `${risk.umbral * 100}%` }} />}</div>}
          <div className="risk-note"><span>{threshold ? `Umbral: ${percent(risk.umbral)}` : 'Umbral no disponible'}</span>{valid && <span>{risk.alerta === true ? 'Alerta del modelo' : risk.alerta === false ? 'Sin alerta del modelo' : 'Estado no disponible'}</span>}</div>
          {risk?.interpretacion && <p>{risk.interpretacion}</p>}
        </div>;
      })}
    </div>
  );
}
