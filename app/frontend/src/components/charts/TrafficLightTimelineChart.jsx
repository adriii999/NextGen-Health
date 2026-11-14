// src/components/charts/TrafficLightTimelineChart.jsx
import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, Activity, Sparkles } from 'lucide-react';

export const TrafficLightTimelineChart = ({
  egfrActual = 68,
  egfrPrevio = 86,
  uacrActual = 35,
  uacrPrevio = 18,
  nombrePaciente = 'Manuel S. R.',
}) => {
  const [showISGLT2, setShowISGLT2] = useState(true);

  const delta = egfrActual - egfrPrevio;
  const pctDrop = Math.round((Math.abs(delta) / egfrPrevio) * 100);

  // Escala SVG (Altura 160px, Ancho 500px)
  // Eje Y: 20 mL/min (abajo, y=140) a 110 mL/min (arriba, y=25)
  // Eje X:
  // x=60: Hace 12m
  // x=170: Hoy (Analítica actual)
  // x=280: +1 Año
  // x=390: +2 Años
  // x=470: +3 Años

  const getY = (val) => {
    const minVal = 20;
    const maxVal = 110;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return 140 - ((clamped - minVal) / (maxVal - minVal)) * 115;
  };

  const yPrev = getY(egfrPrevio);
  const yAct = getY(egfrActual);

  // Proyecciones
  // Sin tratamiento: caída anual acelerada de ~12-14 mL/min
  const noTreatY1 = Math.max(25, egfrActual - 13);
  const noTreatY2 = Math.max(25, noTreatY1 - 12);
  const noTreatY3 = Math.max(20, noTreatY2 - 11);

  // Con iSGLT2: caída inicial hemodinámica leve (~2-3 mL/min) y luego estabilización
  const treatY1 = egfrActual - 3;
  const treatY2 = treatY1 - 1.5;
  const treatY3 = treatY2 - 1;

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-3">
      
      {/* Cabecera Explicativa con Enfoque de Semáforo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E6EB] pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C] animate-pulse" />
            <h4 className="text-[13px] font-semibold text-[#0E1621] uppercase tracking-[0.03em]">
              Gráfica de Semáforo: Trayectoria y Salvamento Renal
            </h4>
          </div>
          <p className="text-[11px] text-[#5A6573] mt-0.5">
            El paciente estaba en <strong className="text-[#1F7A55]">Zona Verde ({egfrPrevio} mL/min)</strong> y ha caído un <strong className="text-[#C2410C]">{pctDrop}% en 12 meses</strong> hacia la zona de peligro.
          </p>
        </div>

        {/* Toggle para el médico: ver el impacto del tratamiento */}
        <button
          type="button"
          onClick={() => setShowISGLT2(!showISGLT2)}
          className={`px-3 py-1 rounded-[4px] text-[11px] font-medium border transition-colors self-start sm:self-auto cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
            showISGLT2
              ? 'bg-[#E6F4EC] text-[#16563C] border-[#BDDFC9] font-semibold'
              : 'bg-[#F0F2F5] text-[#5A6573] border-[#CBD0D8]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1F7A55]" />
          <span>{showISGLT2 ? '✓ Simulación iSGLT2 Activa' : '+ Simular Inicio iSGLT2'}</span>
        </button>
      </div>

      {/* Canvas SVG del Semáforo */}
      <div className="overflow-x-auto">
        <svg viewBox="0 0 500 170" className="w-full h-44 min-w-[460px] overflow-visible">
          <defs>
            <linearGradient id="greenZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F7A55" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1F7A55" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="amberZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C2410C" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#C2410C" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="redZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B3261E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#B3261E" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* 1. FRANJA VERDE: > 60 mL/min (Función Segura) */}
          <rect x="50" y={getY(110)} width="440" height={getY(60) - getY(110)} fill="url(#greenZone)" rx="2" />
          <text x="56" y={getY(110) + 12} fill="#1F7A55" fontSize="8.5" fontWeight="700">
            🟢 ZONA VERDE: Función renal protegida (&gt;60 mL/min)
          </text>

          {/* 2. FRANJA ÁMBAR: 45 - 60 mL/min (Deterioro Silente / Alerta) */}
          <rect x="50" y={getY(60)} width="440" height={getY(45) - getY(60)} fill="url(#amberZone)" rx="2" />
          <text x="56" y={getY(60) + 11} fill="#C2410C" fontSize="8.5" fontWeight="700">
            🟠 ZONA ÁMBAR: Caída silente / Pérdida acelerada (45 - 60 mL/min)
          </text>

          {/* 3. FRANJA ROJA: < 45 mL/min (Insuficiencia Severa / Peligro CV) */}
          <rect x="50" y={getY(45)} width="440" height={getY(20) - getY(45)} fill="url(#redZone)" rx="2" />
          <text x="56" y={getY(45) + 11} fill="#B3261E" fontSize="8.5" fontWeight="700">
            🔴 ZONA ROJA: Insuficiencia renal avanzada (&lt;45 mL/min • G3b)
          </text>

          {/* Eje de Tiempo (Etiquetas X) */}
          <line x1="50" y1="145" x2="490" y2="145" stroke="#E3E6EB" strokeWidth="1" />
          
          <text x="70" y="157" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5A6573">Hace 12m</text>
          <text x="170" y="157" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0E1621">HOY (Consulta)</text>
          <text x="280" y="157" textAnchor="middle" fontSize="8.5" fill="#8A94A3">+1 Año</text>
          <text x="380" y="157" textAnchor="middle" fontSize="8.5" fill="#8A94A3">+2 Años</text>
          <text x="470" y="157" textAnchor="middle" fontSize="8.5" fill="#8A94A3">+3 Años</text>

          {/* Línea vertical en HOY */}
          <line x1="170" y1="25" x2="170" y2="145" stroke="#CBD0D8" strokeDasharray="3 3" />

          {/* Trayectoria Histórica Real (Hace 12m a Hoy) */}
          <line
            x1="70"
            y1={yPrev}
            x2="170"
            y2={yAct}
            stroke="#C2410C"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Punto Hace 12m */}
          <circle cx="70" cy={yPrev} r="4" fill="#1F7A55" stroke="#FFFFFF" strokeWidth="1.5" />
          <text x="70" y={yPrev - 8} textAnchor="middle" fontSize="10" fontWeight="700" className="font-mono" fill="#1F7A55">
            {egfrPrevio}
          </text>

          {/* Punto HOY */}
          <circle cx="170" cy={yAct} r="5" fill="#C2410C" stroke="#FFFFFF" strokeWidth="2" />
          <text x="170" y={yAct - 8} textAnchor="middle" fontSize="11" fontWeight="800" className="font-mono" fill="#C2410C">
            {egfrActual}
          </text>
          <text x="170" y={yAct + 14} textAnchor="middle" fontSize="8" fontWeight="600" fill="#842A06">
            (-{pctDrop}%)
          </text>

          {/* Proyección SIN Tratamiento (Inercia Médica - Línea Discontinua Roja a la Zona Roja) */}
          <polyline
            points={`170,${yAct} 280,${getY(noTreatY1)} 380,${getY(noTreatY2)} 470,${getY(noTreatY3)}`}
            fill="none"
            stroke="#B3261E"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="470" cy={getY(noTreatY3)} r="3.5" fill="#B3261E" />
          <text x="470" y={getY(noTreatY3) - 6} textAnchor="middle" fontSize="9" fontWeight="700" className="font-mono" fill="#B3261E">
            {Math.round(noTreatY3)}
          </text>
          <text x="470" y={getY(noTreatY3) + 12} textAnchor="end" fontSize="7.5" fontWeight="600" fill="#B3261E">
            Sin actuar: Zona Roja
          </text>

          {/* Proyección CON iSGLT2 (Línea Verde Continua Protegida) */}
          {showISGLT2 && (
            <>
              {/* Área sombreada de riñón salvado */}
              <polygon
                points={`170,${yAct} 280,${getY(treatY1)} 380,${getY(treatY2)} 470,${getY(treatY3)} 470,${getY(noTreatY3)} 380,${getY(noTreatY2)} 280,${getY(noTreatY1)}`}
                fill="#1F7A55"
                fillOpacity="0.15"
              />

              <polyline
                points={`170,${yAct} 280,${getY(treatY1)} 380,${getY(treatY2)} 470,${getY(treatY3)}`}
                fill="none"
                stroke="#1F7A55"
                strokeWidth="2.5"
              />
              <circle cx="470" cy={getY(treatY3)} r="4" fill="#1F7A55" stroke="#FFFFFF" strokeWidth="1.5" />
              <text x="470" y={getY(treatY3) - 6} textAnchor="middle" fontSize="9.5" fontWeight="800" className="font-mono" fill="#1F7A55">
                {Math.round(treatY3)}
              </text>
              <text x="470" y={getY(treatY3) + 12} textAnchor="end" fontSize="8" fontWeight="700" fill="#1F7A55">
                Con iSGLT2: Salvado en Verde
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Mensaje Asertivo en Español Llano para el Médico */}
      <div className="bg-[#FAFBFD] p-3 rounded-[5px] border border-[#E3E6EB] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#1F7A55] shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#0E1621] leading-relaxed">
          <strong>Conclusión Visual para la Consulta:</strong> El paciente ya ha perdido <strong>{Math.abs(delta)} mL/min</strong> de filtrado. Si no se inicia protección cardiorrenal hoy, en 24-36 meses entrará en la <strong>Zona Roja (prediálisis / evento coronario)</strong>. El inicio precoz de un <strong>iSGLT2 (10 mg/día)</strong> frena la pendiente de caída y preserva su función en <strong>Zona Verde</strong>.
        </div>
      </div>

    </div>
  );
};

export default TrafficLightTimelineChart;
