// src/components/charts/InterventionProjectionChart.jsx
import React, { useState } from 'react';

export const InterventionProjectionChart = ({ egfrActual = 68, nombrePaciente = 'Manuel S. R.' }) => {
  const [showIntervention, setShowIntervention] = useState(true);

  // Datos de proyección a 3 años:
  // Trayectoria A (Inercial / Sin Intervención): Caída acelerada (-13 mL/min/año)
  // T0 (Hoy): 68 -> T+1: 53 -> T+2: 40 -> T+3: 28 mL/min (Estadio G4, prediálisis)
  // Trayectoria B (Intervención Precoz con iSGLT2 + ARA-II):
  // T0 (Hoy): 68 -> Dip hemodinámico leve T+1: 65 -> T+2: 63 -> T+3: 61 mL/min (Estadio G2 preservado)

  const pointsNoTreat = [
    { year: 'Hoy', egfr: egfrActual, x: 50, y: 35 },
    { year: '+1 año', egfr: Math.max(15, egfrActual - 15), x: 150, y: 62 },
    { year: '+2 años', egfr: Math.max(15, egfrActual - 28), x: 250, y: 88 },
    { year: '+3 años', egfr: Math.max(15, egfrActual - 39), x: 350, y: 110 },
  ];

  const pointsWithTreat = [
    { year: 'Hoy', egfr: egfrActual, x: 50, y: 35 },
    { year: '+1 año', egfr: Math.max(15, egfrActual - 3), x: 150, y: 40 },
    { year: '+2 años', egfr: Math.max(15, egfrActual - 5), x: 250, y: 44 },
    { year: '+3 años', egfr: Math.max(15, egfrActual - 7), x: 350, y: 48 },
  ];

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-3">
      {/* Cabecera y Toggle Interactivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E6EB] pb-2">
        <div>
          <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
            Proyección Clínica a 3 Años: Impacto de la Intervención Precoz en AP
          </h4>
          <p className="text-[11px] text-[#5A6573] mt-0.5">
            Diferencial entre mantener inercia terapéutica vs actuar con protección cardiorrenal (iSGLT2).
          </p>
        </div>

        <button
          onClick={() => setShowIntervention(!showIntervention)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] border transition-colors self-start sm:self-auto ${
            showIntervention
              ? 'bg-[#E6F4EC] text-[#16563C] border-[#BDDFC9]'
              : 'bg-[#F0F2F5] text-[#5A6573] border-[#E3E6EB]'
          }`}
        >
          {showIntervention ? '✓ Simulación iSGLT2 Activa' : '+ Comparar con iSGLT2'}
        </button>
      </div>

      {/* Gráfico Vectorial de Proyección */}
      <div className="relative pt-1 overflow-x-auto">
        <svg viewBox="0 0 400 135" className="w-full h-36 min-w-[360px] overflow-visible">
          {/* Banda de Seguridad (>60 mL/min) */}
          <rect x="40" y="8" width="340" height="45" fill="#E6F4EC" fillOpacity="0.4" rx="2" />
          <text x="46" y="20" fill="#1F7A55" fontSize="8.5" fontWeight="600">
            Función renal preservada (&gt;60 mL/min)
          </text>

          {/* Línea Crítica de Insuficiencia Renal (<45) */}
          <line x1="40" y1="75" x2="380" y2="75" stroke="#CBD0D8" strokeDasharray="3 3" />
          <text x="46" y="85" fill="#B3261E" fontSize="8">
            Umbral insuficiencia renal moderada-severa (G3b)
          </text>

          {/* Zona de Función Salvada si la intervención está activa */}
          {showIntervention && (
            <polygon
              points="50,35 150,40 250,44 350,48 350,110 250,88 150,62"
              fill="#E8EEF7"
              fillOpacity="0.6"
            />
          )}

          {/* Trayectoria Inercial (Sin Tratar - Roja) */}
          <polyline
            points={pointsNoTreat.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#B3261E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {pointsNoTreat.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#B3261E" />
              <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize="9" fontWeight="600" className="font-mono" fill="#B3261E">
                {p.egfr}
              </text>
            </g>
          ))}

          {/* Trayectoria con Tratamiento (Verde) */}
          {showIntervention && (
            <>
              <polyline
                points={pointsWithTreat.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#1F7A55"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {pointsWithTreat.map((p, idx) => (
                <g key={`t-${idx}`}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#1F7A55" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="9" fontWeight="700" className="font-mono" fill="#1F7A55">
                    {p.egfr}
                  </text>
                </g>
              ))}
            </>
          )}

          {/* Etiquetas Eje X (Años) */}
          {pointsNoTreat.map((p, idx) => (
            <text key={`x-${idx}`} x={p.x} y="130" textAnchor="middle" fontSize="9.5" fill="#5A6573" fontWeight="500">
              {p.year}
            </text>
          ))}
        </svg>
      </div>

      {/* Métrica de Impacto Clínico */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
        <div className="p-2 rounded-[4px] bg-[#FBEAE9] border border-[#F5C2C0] text-[#8C1D18]">
          <span className="font-semibold block text-[10px] uppercase">Sin Intervención (Inercia):</span>
          <span>Caída a <strong>29 mL/min</strong> en 36 meses (Estadio G4 prediálisis + riesgo de evento coronario).</span>
        </div>
        <div className="p-2 rounded-[4px] bg-[#E6F4EC] border border-[#BDDFC9] text-[#16563C]">
          <span className="font-semibold block text-[10px] uppercase">Con iSGLT2 en AP (Precoz):</span>
          <span>Preserva <strong>61 mL/min</strong> (+32 mL/min salvados) y reduce un 38% hospitalizaciones.</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InterventionProjectionChart);
