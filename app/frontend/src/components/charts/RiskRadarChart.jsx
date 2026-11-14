// src/components/charts/RiskRadarChart.jsx
import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

export const RiskRadarChart = ({ tiposRiesgo }) => {
  if (!tiposRiesgo) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        Sin datos de estratificación fenotípica
      </div>
    );
  }

  const data = [
    {
      subject: 'Aterosclerótico (ASCVD)',
      Riesgo: Math.round((tiposRiesgo.riesgo_aterosclerotico?.valor || 0) * 100),
      Umbral: Math.round((tiposRiesgo.riesgo_aterosclerotico?.umbral || 0.20) * 100),
      alerta: tiposRiesgo.riesgo_aterosclerotico?.alerta,
    },
    {
      subject: 'Insuf. Cardíaca (IC)',
      Riesgo: Math.round((tiposRiesgo.riesgo_insuficiencia_cardiaca?.valor || 0) * 100),
      Umbral: Math.round((tiposRiesgo.riesgo_insuficiencia_cardiaca?.umbral || 0.15) * 100),
      alerta: tiposRiesgo.riesgo_insuficiencia_cardiaca?.alerta,
    },
    {
      subject: 'Cardiorrenal (KDIGO)',
      Riesgo: Math.round((tiposRiesgo.riesgo_cardiorrenal?.valor || 0) * 100),
      Umbral: Math.round((tiposRiesgo.riesgo_cardiorrenal?.umbral || 0.18) * 100),
      alerta: tiposRiesgo.riesgo_cardiorrenal?.alerta,
    },
  ];

  const anyAlert = data.some((d) => d.alerta);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Estratificación Multidimensional (3 Fenotipos)
        </h4>
        {anyAlert && (
          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            Umbral Superado
          </span>
        )}
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#cbd5e1"
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <Radar
              name="Umbral de Alerta Clínica"
              dataKey="Umbral"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.12}
              strokeDasharray="4 4"
            />
            <Radar
              name="Riesgo Estimado Paciente"
              dataKey="Riesgo"
              stroke={anyAlert ? '#e11d48' : '#10b981'}
              fill={anyAlert ? '#e11d48' : '#10b981'}
              fillOpacity={0.35}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskRadarChart;
