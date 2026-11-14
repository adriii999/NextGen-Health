import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clinicalFields, historyPoints } from '../../services/patientHistory';

const dateLabel = (timestamp) => new Date(timestamp).toLocaleDateString('es-ES', { timeZone: 'UTC' });
const display = (value) => value === null || value === undefined ? 'Sin dato' : value.toLocaleString('es-ES');

export function PatientEvolutionChart({ patient }) {
  const [parameter, setParameter] = useState('egfr');
  const points = historyPoints(patient.analiticas || []);
  const [selected, setSelected] = useState(points.at(-1)?.archivo || '');
  const field = clinicalFields.find((item) => item.key === parameter);
  const visit = points.find((item) => item.archivo === selected);

  return (
    <section className="surface upload-panel" aria-labelledby="evolution-title">
      <div className="section-heading"><div>
        <h2 id="evolution-title">Evolución de las analíticas</h2>
        <p>{patient.nombre}</p>
      </div></div>
      <div className="evolution-selector">
        <label htmlFor="chart-parameter">Parámetro del gráfico</label>
        <select id="chart-parameter" value={parameter} onChange={(event) => setParameter(event.target.value)}>
          {clinicalFields.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.unit})</option>)}
        </select>
      </div>
      {points.length > 1 ? <>
        <p className="chart-caption">{field.label} ({field.unit}). Fechas reales de las visitas; los puntos representan valores medidos.</p>
        <div className="evolution-chart" role="img" aria-label={`Evolución de ${field.label}: ${points.map((p) => `${p.fecha}: ${display(p[parameter])} ${field.unit}`).join('; ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 18, right: 24, bottom: 12, left: 0 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']}
                ticks={points.map((p) => p.timestamp)} tickFormatter={dateLabel} minTickGap={30} tick={{ fontSize: 11 }} />
              <YAxis width={48} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={dateLabel} formatter={(value) => [`${display(value)} ${field.unit}`, field.label]} />
              <Line type="linear" dataKey={parameter} stroke="#17695e" strokeWidth={2.5}
                dot={{ r: 5 }} activeDot={{ r: 7 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </> : <p className="upload-status">{points.length === 1
        ? 'Solo hay una analítica disponible; todavía no se puede mostrar una evolución.'
        : 'No hay analíticas con fecha válida para mostrar una evolución.'}</p>}
      {points.length === 1 && <p>{field.label}: <strong>{display(points[0][parameter])} {field.unit}</strong> ({points[0].fecha})</p>}
      {points.length > 0 && <details className="lab-detail">
        <summary>Ver una analítica concreta</summary>
        <label htmlFor="history-date">Fecha de la analítica</label>
        <select id="history-date" value={selected} onChange={(event) => setSelected(event.target.value)}>
          {points.map((point) => <option key={point.archivo} value={point.archivo}>{point.fecha} · {point.archivo}</option>)}
        </select>
        {visit && <section aria-label="Detalle de la analítica">
          <h3>Analítica del {visit.fecha}</h3>
          <dl className="lab-grid">
            {[...clinicalFields, { key: 'edad', label: 'Edad', unit: 'años' },
              { key: 'sexo', label: 'Sexo (1 mujer, 2 hombre)', unit: '' },
              { key: 'fuma', label: 'Fuma (0 no, 1 sí)', unit: '' },
              { key: 'diabetes', label: 'Diabetes (0 no, 1 sí)', unit: '' }].map((item) => (
              <div className="lab-value" key={item.key}><dt>{item.label}</dt><dd>{display(visit[item.key])} {item.unit}</dd></div>
            ))}
          </dl>
        </section>}
      </details>}
    </section>
  );
}
