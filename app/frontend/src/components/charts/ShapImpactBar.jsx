// src/components/charts/ShapImpactBar.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

export const ShapImpactBar = ({ factoresClave = [] }) => {
  if (!factoresClave || factoresClave.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
        Sin factores SHAP disponibles
      </div>
    );
  }

  const data = factoresClave.map((f) => {
    const rawVal = parseFloat(String(f.impacto).replace('%', '').replace('+', ''));
    return {
      variable: f.variable,
      impactoNumerico: isNaN(rawVal) ? 0 : rawVal,
      descripcion: f.descripcion,
      valorActual: f.valor_actual,
      fuente: f.fuente || 'Laboratorio',
    };
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Factores Explicativos de Riesgo (SHAP Attributions)
        </h4>
        <span className="text-[11px] text-slate-500 font-medium">
          Rojo: Agrava riesgo / Verde: Factor protector
        </span>
      </div>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
          >
            <XAxis
              type="number"
              unit="%"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              domain={[-35, 35]}
            />
            <YAxis
              type="category"
              dataKey="variable"
              stroke="#475569"
              tick={{ fontSize: 11, fontWeight: 500 }}
              width={110}
            />
            <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1.5} />
            <Tooltip
              formatter={(val, name, item) => [
                `${item.payload.impactoNumerico > 0 ? '+' : ''}${item.payload.impactoNumerico}% (${item.payload.valorActual})`,
                item.payload.descripcion,
              ]}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="impactoNumerico" radius={[0, 4, 4, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={entry.impactoNumerico > 0 ? '#e11d48' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ShapImpactBar;
