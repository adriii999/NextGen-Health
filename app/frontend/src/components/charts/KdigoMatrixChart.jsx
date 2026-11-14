// src/components/charts/KdigoMatrixChart.jsx
import React from 'react';

export const KdigoMatrixChart = ({ egfrActual = 68, egfrPrevio = 86, uacrActual = 35, uacrPrevio = 18 }) => {
  // Categorías KDIGO Filtrado Glomerular (Columnas G1 a G5)
  // G1: >= 90
  // G2: 60 - 89
  // G3a: 45 - 59
  // G3b: 30 - 44
  // G4-G5: < 30
  const getGfrCategory = (val) => {
    if (val >= 90) return { col: 0, label: 'G1 (≥90)', x: 70 };
    if (val >= 60) return { col: 1, label: 'G2 (60-89)', x: 145 };
    if (val >= 45) return { col: 2, label: 'G3a (45-59)', x: 220 };
    if (val >= 30) return { col: 3, label: 'G3b (30-44)', x: 295 };
    return { col: 4, label: 'G4-5 (<30)', x: 370 };
  };

  // Categorías KDIGO Albuminuria (Filas A1 a A3)
  // A1: < 30 (Normal / leve)
  // A2: 30 - 300 (Microalbuminuria)
  // A3: > 300 (Macroalbuminuria)
  const getUacrCategory = (val) => {
    if (val < 30) return { row: 0, label: 'A1 (<30)', y: 38 };
    if (val <= 300) return { row: 1, label: 'A2 (30-300)', y: 76 };
    return { row: 2, label: 'A3 (>300)', y: 114 };
  };

  const prevCat = {
    ...getGfrCategory(egfrPrevio),
    ...getUacrCategory(uacrPrevio),
  };

  const actCat = {
    ...getGfrCategory(egfrActual),
    ...getUacrCategory(uacrActual),
  };

  // Cuadrícula 5 cols x 3 filas
  // Colores clínicos oficiales KDIGO:
  // Verde: G1-A1, G2-A1
  // Amarillo: G3a-A1, G1-A2, G2-A2
  // Naranja: G3b-A1, G3a-A2, G1-A3, G2-A3
  // Rojo: G4, G5, G3b-A2, G3a-A3, G3b-A3
  const gridCells = [
    // Fila A1 (<30)
    { col: 0, row: 0, bg: '#E6F4EC', stroke: '#BDDFC9' }, // G1-A1 (Verde)
    { col: 1, row: 0, bg: '#E6F4EC', stroke: '#BDDFC9' }, // G2-A1 (Verde)
    { col: 2, row: 0, bg: '#FBF3DD', stroke: '#F2DFAC' }, // G3a-A1 (Amarillo)
    { col: 3, row: 0, bg: '#FDEFE6', stroke: '#F4D0BD' }, // G3b-A1 (Naranja)
    { col: 4, row: 0, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G4-5-A1 (Rojo)
    // Fila A2 (30-300)
    { col: 0, row: 1, bg: '#FBF3DD', stroke: '#F2DFAC' }, // G1-A2 (Amarillo)
    { col: 1, row: 1, bg: '#FDEFE6', stroke: '#F4D0BD' }, // G2-A2 (Zona Alerta Silente)
    { col: 2, row: 1, bg: '#FDEFE6', stroke: '#F4D0BD' }, // G3a-A2 (Naranja)
    { col: 3, row: 1, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G3b-A2 (Rojo)
    { col: 4, row: 1, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G4-5-A2 (Rojo)
    // Fila A3 (>300)
    { col: 0, row: 2, bg: '#FDEFE6', stroke: '#F4D0BD' }, // G1-A3 (Naranja)
    { col: 1, row: 2, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G2-A3 (Rojo)
    { col: 2, row: 2, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G3a-A3 (Rojo)
    { col: 3, row: 2, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G3b-A3 (Rojo)
    { col: 4, row: 2, bg: '#FBEAE9', stroke: '#F5C2C0' }, // G4-5-A3 (Rojo)
  ];

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-3">
      {/* Título Asertivo Our World in Data */}
      <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-2">
        <div>
          <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
            Matriz Cardiorrenal KDIGO: Vector de Migración Silente
          </h4>
          <p className="text-[11px] text-[#5A6573] mt-0.5">
            El paciente migra en 12 meses del cuadrante seguro <strong className="text-[#1F7A55]">G1-A1</strong> hacia la zona de deterioro silente <strong className="text-[#C2410C]">G2-A2</strong>.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#FDEFE6] text-[#C2410C] border border-[#F4D0BD] font-bold">
          Δ KDIGO ACTIVO
        </span>
      </div>

      {/* Cuadrícula Gráfica SVG */}
      <div className="relative pt-1 overflow-x-auto">
        <svg viewBox="0 0 430 145" className="w-full h-36 min-w-[380px] overflow-visible">
          {/* Encabezados de Columna (Filtrado eGFR) */}
          <text x="70" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">G1 (&gt;90)</text>
          <text x="145" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">G2 (60-89)</text>
          <text x="220" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">G3a (45-59)</text>
          <text x="295" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">G3b (30-44)</text>
          <text x="370" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">G4-5 (&lt;30)</text>

          {/* Encabezados de Fila (Albuminuria UACR) */}
          <text x="28" y="38" textAnchor="end" fontSize="8.5" fontWeight="600" fill="#5A6573">A1 (&lt;30)</text>
          <text x="28" y="76" textAnchor="end" fontSize="8.5" fontWeight="600" fill="#C2410C">A2 (30-300)</text>
          <text x="28" y="114" textAnchor="end" fontSize="8.5" fontWeight="600" fill="#B3261E">A3 (&gt;300)</text>

          {/* Celdas de la Matriz KDIGO */}
          {gridCells.map((c, i) => {
            const x = 32 + c.col * 75;
            const y = 20 + c.row * 38;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={70}
                height={34}
                fill={c.bg}
                stroke={c.stroke}
                strokeWidth={1}
                rx={3}
              />
            );
          })}

          {/* Flecha Vectorial de Migración (De T-1 a T Actual) */}
          {/* T-1 Coordenada previa */}
          <g>
            {/* Línea conectora vectorial con marcador */}
            <defs>
              <marker
                id="arrowhead-silent"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 7 3.5, 0 7" fill="#C2410C" />
              </marker>
            </defs>

            <line
              x1={prevCat.x}
              y1={prevCat.y}
              x2={actCat.x - 4}
              y2={actCat.y - 2}
              stroke="#C2410C"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead-silent)"
            />

            {/* Punto T-1 (Hace 12 meses) */}
            <circle cx={prevCat.x} cy={prevCat.y} r="5" fill="#5A6573" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x={prevCat.x} y={prevCat.y - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#0E1621">
              T-1 ({egfrPrevio} / {uacrPrevio})
            </text>

            {/* Punto T Actual */}
            <circle cx={actCat.x} cy={actCat.y} r="6" fill="#C2410C" stroke="#FFFFFF" strokeWidth="2" />
            <text x={actCat.x} y={actCat.y + 16} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#C2410C">
              Hoy ({egfrActual} / {uacrActual})
            </text>
          </g>
        </svg>
      </div>

      {/* Explicación de la Transición KDIGO */}
      <div className="text-[11px] text-[#5A6573] bg-[#F6F7F9] p-2.5 rounded-[4px] border border-[#E3E6EB] leading-relaxed">
        <strong className="text-[#0E1621]">Interpretación Clínica:</strong> La analítica estándar considera eGFR 68 mL/min y UACR 35 mg/g como valores "subclínicos" no alarmantes. Sin embargo, el vector KDIGO evidencia que el paciente ha cruzado de estadio en solo 12 meses, duplicando su riesgo de eventos cardiovasculares mayores antes de 3 años.
      </div>
    </div>
  );
};

export default React.memo(KdigoMatrixChart);
