// src/components/charts/ClinicalTimelineChart.jsx
import React from 'react';

export const ClinicalTimelineChart = ({ egfrActual, egfrPrevio, uacrActual, uacrPrevio }) => {
  const hasHistory = egfrPrevio !== null && egfrPrevio !== undefined;

  if (!hasHistory) {
    return (
      <div className="bg-[#F0F2F5] rounded-[6px] p-3 text-[12px] text-[#5A6573] border border-[#E3E6EB]">
        <strong>Modo A (Foto fija):</strong> Este paciente no dispone de analítica previa digitalizada hace ~12 meses para contrastar la trayectoria. Se recomienda programar control a 6 meses para activar el Modo B.
      </div>
    );
  }

  const deltaEgfr = egfrActual - egfrPrevio;
  const pctEgfr = Math.round((deltaEgfr / egfrPrevio) * 100);

  const deltaUacr = uacrActual - uacrPrevio;
  const pctUacr = Math.round((deltaUacr / uacrPrevio) * 100);

  return (
    <div className="space-y-3">
      {/* Gráfico 1: Filtrado Glomerular (eGFR) */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
              Trayectoria de Filtrado Glomerular (eGFR)
            </span>
            <div className="text-[12px] text-[#0E1621] mt-0.5">
              Normal: <span className="font-mono text-[#5A6573]">&gt; 60 mL/min/1.73m²</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[12px] font-mono font-semibold px-2 py-0.5 rounded-[4px] border ${
              deltaEgfr < -5 ? 'bg-[#FDEFE6] text-[#C2410C] border-[#F4D0BD]' : 'bg-[#E6F4EC] text-[#1F7A55] border-[#BDDFC9]'
            }`}>
              {pctEgfr}% en 12 meses ({deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr} mL/min)
            </span>
          </div>
        </div>

        {/* Visualización SVG de Comparativa Interanual */}
        <div className="relative pt-2 pb-1">
          <svg viewBox="0 0 400 90" className="w-full h-22 overflow-visible">
            {/* Zona de Referencia Clínica Normal (>60) */}
            <rect x="30" y="8" width="340" height="40" fill="#E6F4EC" fillOpacity="0.4" rx="3" />
            <text x="35" y="20" fill="#1F7A55" fontSize="9" fontWeight="600">
              Rango de seguridad clínica (&gt;60 mL/min)
            </text>

            {/* Zona de Alerta (<60) */}
            <rect x="30" y="48" width="340" height="34" fill="#FDEFE6" fillOpacity="0.3" rx="3" />
            <line x1="30" y1="48" x2="370" y2="48" stroke="#CBD0D8" strokeDasharray="3 3" />
            <text x="35" y="75" fill="#5A6573" fontSize="9">
              Umbral insuficiencia renal (KDIGO G3)
            </text>

            {/* Trazo de Trayectoria */}
            {(() => {
              // Mapeo: 120 mL/min -> y=12, 40 mL/min -> y=78
              const getY = (val) => 12 + ((120 - Math.min(120, Math.max(40, val))) / 80) * 66;
              const yPrev = getY(egfrPrevio);
              const yAct = getY(egfrActual);

              return (
                <g>
                  <line
                    x1="100"
                    y1={yPrev}
                    x2="300"
                    y2={yAct}
                    stroke={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Punto T-1 */}
                  <circle cx="100" cy={yPrev} r="4.5" fill="#5A6573" />
                  <text x="100" y={yPrev - 8} textAnchor="middle" fontSize="11" fontWeight="600" className="font-mono" fill="#0E1621">
                    {egfrPrevio}
                  </text>
                  <text x="100" y="86" textAnchor="middle" fontSize="10" fill="#5A6573">
                    Hace 12 meses
                  </text>

                  {/* Punto T Actual */}
                  <circle cx="300" cy={yAct} r="5" fill={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'} />
                  <text x="300" y={yAct - 8} textAnchor="middle" fontSize="11" fontWeight="700" className="font-mono" fill={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'}>
                    {egfrActual} mL/min
                  </text>
                  <text x="300" y="86" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0E1621">
                    Analítica actual
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Gráfico 2: Albuminuria (UACR) */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
              Cociente Albúmina / Creatinina en Orina (UACR)
            </span>
            <div className="text-[12px] text-[#0E1621] mt-0.5">
              Normoalbuminuria: <span className="font-mono text-[#5A6573]">&lt; 30 mg/g</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[12px] font-mono font-semibold px-2 py-0.5 rounded-[4px] border ${
              uacrActual > 30 ? 'bg-[#FDEFE6] text-[#C2410C] border-[#F4D0BD]' : 'bg-[#E6F4EC] text-[#1F7A55] border-[#BDDFC9]'
            }`}>
              {pctUacr > 0 ? `+${pctUacr}%` : `${pctUacr}%`} ({deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr} mg/g)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px] mt-2 pt-2 border-t border-[#E3E6EB]">
          <div className="p-2 rounded-[4px] bg-[#F0F2F5]">
            <span className="text-[10px] text-[#5A6573] uppercase tracking-wider block">Nivel basal previo:</span>
            <span className="font-mono font-semibold text-[#0E1621]">{uacrPrevio} mg/g</span>
            <span className="text-[10px] text-[#1F7A55] ml-1.5">(Normoalbuminuria A1)</span>
          </div>
          <div className="p-2 rounded-[4px] bg-[#FDEFE6] border border-[#F4D0BD]">
            <span className="text-[10px] text-[#C2410C] uppercase tracking-wider block font-semibold">Nivel actual detectado:</span>
            <span className="font-mono font-bold text-[#C2410C]">{uacrActual} mg/g</span>
            <span className="text-[10px] text-[#C2410C] ml-1.5 font-semibold">(Microalbuminuria A2 activa)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ClinicalTimelineChart);
