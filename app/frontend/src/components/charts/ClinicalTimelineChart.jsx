// src/components/charts/ClinicalTimelineChart.jsx
import React, { useState } from 'react';

export const ClinicalTimelineChart = ({
  egfrActual,
  egfrPrevio,
  uacrActual,
  uacrPrevio,
  archivoOrigen = '02_paciente_invisible_deterioro_silente.json',
}) => {
  const [timeWindow, setTimeWindow] = useState('12m');
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
      {/* Gráfico 1: Filtrado Glomerular con Título Asertivo (Our World in Data + Apple Health) */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E6EB] pb-2">
          <div>
            {/* Título Asertivo */}
            <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
              {deltaEgfr < -5
                ? `El filtrado glomerular cae un ${Math.abs(pctEgfr)}% en 12 meses (de ${egfrPrevio} a ${egfrActual} mL/min)`
                : `Filtrado glomerular estable (${egfrActual} mL/min)`}
            </h4>
            <p className="text-[11px] text-[#5A6573] mt-0.5">
              Normalidad poblacional: &gt; 60 mL/min • Criterio de progresión rápida: caída &gt; 5 mL/min/año
            </p>
          </div>

          {/* Selector de ventana temporal (Apple Health) */}
          <div className="flex items-center gap-1 bg-[#F0F2F5] p-0.5 rounded-[4px] border border-[#E3E6EB] self-start sm:self-auto">
            {['6m', '12m', 'Histórico'].map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-colors ${
                  timeWindow === w
                    ? 'bg-white text-[#1D3B6B] font-semibold shadow-xs'
                    : 'text-[#5A6573] hover:text-[#0E1621]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Visualización SVG con Línea Base Individual y Zona de Seguridad */}
        <div className="relative pt-2 pb-1">
          <svg viewBox="0 0 420 100" className="w-full h-24 overflow-visible">
            {/* 1. Zona de Referencia Clínica Normal (>60) */}
            <rect x="30" y="8" width="360" height="42" fill="#E6F4EC" fillOpacity="0.4" rx="3" />
            <text x="36" y="20" fill="#1F7A55" fontSize="9" fontWeight="600">
              Rango de normalidad clínica (&gt;60 mL/min/1.73m²)
            </text>

            {/* 2. Línea Base del Propio Paciente (Sombreado Apple Health) */}
            <rect
              x="30"
              y="16"
              width="360"
              height="20"
              fill="#E8EEF7"
              fillOpacity="0.5"
              stroke="#CBD0D8"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              rx="2"
            />
            <text x="260" y="30" fill="#1D3B6B" fontSize="8.5" fontWeight="500">
              Línea base previa del paciente ({egfrPrevio} mL/min)
            </text>

            {/* Zona de Alerta (<60) */}
            <line x1="30" y1="52" x2="390" y2="52" stroke="#CBD0D8" strokeDasharray="3 3" />
            <text x="36" y="82" fill="#8A94A3" fontSize="8.5">
              Umbral estadio renal G3 (&lt;60 mL/min)
            </text>

            {/* Trazo de Trayectoria */}
            {(() => {
              const getY = (val) => 14 + ((120 - Math.min(120, Math.max(40, val))) / 80) * 72;
              const yPrev = getY(egfrPrevio);
              const yAct = getY(egfrActual);

              return (
                <g>
                  {/* Línea conectora de trayectoria */}
                  <line
                    x1="110"
                    y1={yPrev}
                    x2="310"
                    y2={yAct}
                    stroke={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Punto T-1 */}
                  <circle cx="110" cy={yPrev} r="4.5" fill="#5A6573" />
                  <text x="110" y={yPrev - 8} textAnchor="middle" fontSize="11" fontWeight="600" className="font-mono" fill="#0E1621">
                    {egfrPrevio}
                  </text>
                  <text x="110" y="94" textAnchor="middle" fontSize="10" fill="#5A6573">
                    Hace 12 meses
                  </text>

                  {/* Punto T Actual */}
                  <circle cx="310" cy={yAct} r="5.5" fill={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'} />
                  <text x="310" y={yAct - 8} textAnchor="middle" fontSize="11" fontWeight="700" className="font-mono" fill={deltaEgfr < -5 ? '#C2410C' : '#1F7A55'}>
                    {egfrActual} mL/min
                  </text>
                  <text x="310" y="94" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0E1621">
                    Analítica actual
                  </text>

                  {/* Anotación Observable/Tufte del cambio puntual */}
                  <rect x="180" y="44" width="76" height="18" fill="#FDEFE6" stroke="#F4D0BD" rx="3" />
                  <text x="218" y="56" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#C2410C" className="font-mono">
                    {pctEgfr}% ({deltaEgfr})
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Nota al pie con fuente y metodología (Our World in Data) */}
        <div className="pt-2 border-t border-[#E3E6EB] text-[10px] text-[#8A94A3] flex items-center justify-between">
          <span>Fuente: Archivo de laboratorio <span className="font-mono text-[#5A6573]">{archivoOrigen}</span></span>
          <span>Metodología: Estimación CKD-EPI 2021 + KDIGO</span>
        </div>
      </div>

      {/* Gráfico 2: Albuminuria (UACR) */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
              Cociente Albúmina / Creatinina en Orina (UACR)
            </span>
            <div className="text-[12px] text-[#0E1621] mt-0.5">
              Normoalbuminuria: <span className="font-mono text-[#5A6573]">&lt; 30 mg/g</span> • Microalbuminuria: <span className="font-mono text-[#C2410C]">30 - 300 mg/g</span>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] border ${
            uacrActual > 30 ? 'bg-[#FDEFE6] text-[#C2410C] border-[#F4D0BD]' : 'bg-[#E6F4EC] text-[#1F7A55] border-[#BDDFC9]'
          }`}>
            {deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr} mg/g ({pctUacr > 0 ? `+${pctUacr}%` : `${pctUacr}%`})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
          <div className="p-2 rounded-[4px] bg-[#F0F2F5]">
            <span className="text-[10px] text-[#5A6573] uppercase tracking-wider block">Nivel basal previo:</span>
            <span className="font-mono font-semibold text-[#0E1621]">{uacrPrevio} mg/g</span>
            <span className="text-[10px] text-[#1F7A55] ml-1.5">(Estadio A1)</span>
          </div>
          <div className="p-2 rounded-[4px] bg-[#FDEFE6] border border-[#F4D0BD]">
            <span className="text-[10px] text-[#C2410C] uppercase tracking-wider block font-semibold">Nivel actual detectado:</span>
            <span className="font-mono font-bold text-[#C2410C]">{uacrActual} mg/g</span>
            <span className="text-[10px] text-[#C2410C] ml-1.5 font-semibold">(Estadio A2 activo)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ClinicalTimelineChart);
