import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const labels = {
  edad: 'Edad', sexo: 'Sexo', bmi: 'Índice de masa corporal',
  ap_hi: 'Presión sistólica', ap_lo: 'Presión diastólica',
  colesterol_total: 'Colesterol total', fuma: 'Tabaquismo', diabetes: 'Diabetes',
  egfr: 'Filtrado del riñón', uacr: 'Albúmina en orina',
  delta_egfr: 'Cambio del filtrado', delta_uacr: 'Cambio de albúmina',
  delta_ap_hi: 'Cambio de presión', delta_colesterol: 'Cambio de colesterol',
  delta_bmi: 'Cambio de masa corporal',
};

export function ShapImpactBar({ factoresClave = [] }) {
  const factors = Array.isArray(factoresClave) ? factoresClave : [];
  const data = factors.map((factor) => {
    const match = String(factor.impacto ?? '').trim().match(/^([+-]?\d+(?:[.,]\d+)?)%$/);
    return { ...factor, label: labels[factor.variable] || factor.variable, value: match ? Number(match[1].replace(',', '.')) : null };
  }).filter((factor) => factor.value !== null);
  return (
    <div className="shap-chart">
      <h3>Qué influye en el resultado</h3><p className="chart-caption">Estimación orientativa del peso de cada dato. No es un porcentaje exacto ni demuestra una relación de causa y efecto.</p>
      {data.length > 0 ? <div className="shap-canvas" style={{ height: Math.max(220, data.length * 48) }}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data} margin={{ top: 12, right: 30, left: 0, bottom: 8 }} accessibilityLayer><XAxis type="number" unit="%" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="label" width={115} tick={{ fontSize: 11 }} /><ReferenceLine x={0} stroke="#64748b" /><Tooltip formatter={(value) => [`${value}%`, 'Contribución devuelta']} /><Bar dataKey="value" isAnimationActive={false}>{data.map((factor, index) => <Cell key={index} fill={factor.value > 0 ? '#be4b50' : '#16786b'} />)}</Bar></BarChart></ResponsiveContainer></div>
        : <p className="chart-empty">No hay contribuciones numéricas disponibles para la gráfica.</p>}
      <ul className="factor-list">{factors.map((factor, index) => <li key={index}><div><strong>{labels[factor.variable] || factor.variable}</strong><span>{factor.valor_actual || 'Valor no disponible'} · Contribución aproximada: {factor.impacto || 'No disponible'}</span></div></li>)}</ul>
    </div>
  );
}
