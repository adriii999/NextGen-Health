// src/components/charts/ShapWaterfallChart.jsx
import React from 'react';

export const ShapWaterfallChart = ({ factoresClave = [], riesgoFinal = 0.44 }) => {
  // Riesgo poblacional basal de referencia en Atención Primaria
  const riesgoBase = 0.12; // 12%

  // Mapeo a nombres médicos en español llano (según la guía SHAP / Our World in Data)
  const humanLabels = {
    delta_egfr: 'Caída acelerada de filtrado (>5 mL/año)',
    delta_uacr: 'Transición a microalbuminuria activa (>30 mg/g)',
    presion_sistolica: 'Tensión sistólica mantenida (>130 mmHg)',
    colesterol_ldl: 'Colesterol LDL elevado (>130 mg/dL)',
    filtrado_egfr: 'Nivel basal de filtrado glomerular',
    colesterol_hdl: 'Colesterol HDL protector',
  };

  // Convertir factores a valores numéricos
  const parsedFactors = factoresClave.map((f) => {
    const raw = parseFloat(String(f.impacto).replace('%', '').replace('+', ''));
    return {
      name: humanLabels[f.variable] || f.descripcion || f.variable,
      rawImpact: isNaN(raw) ? 0 : raw,
      valorActual: f.valor_actual,
    };
  });

  // Construir acumulados para el efecto cascada (Waterfall)
  let runningTotal = Math.round(riesgoBase * 100);

  const steps = [
    {
      tipo: 'base',
      label: 'Riesgo Poblacional Basal',
      start: 0,
      end: runningTotal,
      diff: runningTotal,
      color: '#5A6573',
      tag: '12%',
    },
  ];

  parsedFactors.forEach((factor) => {
    const diff = factor.rawImpact;
    const start = runningTotal;
    const end = Math.max(0, Math.min(100, runningTotal + diff));
    runningTotal = end;

    steps.push({
      tipo: diff >= 0 ? 'adverso' : 'protector',
      label: factor.name,
      start: Math.min(start, end),
      end: Math.max(start, end),
      diff,
      color: diff >= 0 ? '#C2410C' : '#1F7A55',
      valorActual: factor.valorActual,
    });
  });

  const finalPct = Math.round((riesgoFinal || runningTotal / 100) * 100);

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-3">
      {/* Título Asertivo estilo Our World in Data */}
      <div className="border-b border-[#E3E6EB] pb-2.5">
        <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
          Desglose Explicable SHAP: Contribución al Riesgo del Paciente
        </h4>
        <p className="text-[11px] text-[#5A6573] mt-0.5">
          La combinación de caída de filtrado y albuminuria explica más del 40% del incremento sobre el riesgo basal.
        </p>
      </div>

      {/* Gráfico Cascada (Waterfall) */}
      <div className="space-y-2 pt-1">
        {steps.map((st, idx) => {
          const widthPct = Math.max(2, Math.abs(st.end - st.start));
          const leftPct = st.start;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[#0E1621] truncate max-w-[340px]" title={st.label}>
                  {st.label}
                  {st.valorActual && (
                    <span className="text-[#5A6573] font-mono ml-1.5">({st.valorActual})</span>
                  )}
                </span>
                <span
                  className={`font-mono font-semibold text-[11px] ${
                    st.tipo === 'base'
                      ? 'text-[#5A6573]'
                      : st.diff >= 0
                      ? 'text-[#C2410C]'
                      : 'text-[#1F7A55]'
                  }`}
                >
                  {st.tipo === 'base' ? `${st.diff}%` : `${st.diff > 0 ? `+${st.diff}` : st.diff}%`}
                </span>
              </div>

              {/* Barra de cascada */}
              <div className="relative h-3 bg-[#F0F2F5] rounded-[3px] overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-[2px] transition-all duration-300"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: st.color,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Barra de Riesgo Final */}
        <div className="pt-2 mt-2 border-t border-[#E3E6EB]">
          <div className="flex items-center justify-between text-[12px] font-semibold">
            <span className="text-[#0E1621]">Riesgo Cardiorrenal Estimado Final f(x):</span>
            <span className="font-mono text-[#C2410C] text-[13px] font-bold">{finalPct}%</span>
          </div>
          <div className="relative h-3.5 bg-[#F0F2F5] rounded-[3px] overflow-hidden mt-1">
            <div
              className="absolute top-0 bottom-0 left-0 bg-[#C2410C] rounded-[2px]"
              style={{ width: `${Math.min(100, finalPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#8A94A3] font-mono mt-0.5">
            <span>0%</span>
            <span>Umbral Alerta: 18%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ShapWaterfallChart);
