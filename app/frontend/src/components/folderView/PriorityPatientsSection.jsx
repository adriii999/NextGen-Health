// src/components/folderView/PriorityPatientsSection.jsx
import React from 'react';
import { AlertOctagon, ArrowRight, Pill, Calendar, Heart, Printer, ExternalLink, Activity } from 'lucide-react';

export const PriorityPatientsSection = ({ patients = [], onSelectPatient, onOpenCarePlan }) => {
  // Filtrar exclusivamente los pacientes con riesgo oculto silencioso
  const priorityPatients = patients.filter((p) => p.categoria === 'OCULTO');

  if (priorityPatients.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Cabecera de la Sección: Responder en 5 segundos a "¿a quién miro primero y por qué?" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FDEFE6] p-3.5 rounded-[6px] border border-[#F4D0BD]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[4px] bg-[#C2410C] text-white flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#842A06] uppercase tracking-[0.03em] flex items-center gap-2">
              <span>A quién mirar hoy en el cupo</span>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-white text-[#C2410C] border border-[#F4D0BD]">
                {priorityPatients.length} casos prioritarios
              </span>
            </h3>
            <p className="text-[12px] text-[#842A06]/90 mt-0.5">
              Pacientes con <strong>analítica aparentemente normal en el laboratorio rutinario</strong>, pero con <strong>deterioro silente acelerado</strong> en su trayectoria de 12 meses.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-medium text-[#842A06] self-start sm:self-auto bg-white/70 px-2.5 py-1 rounded border border-[#F4D0BD]">
          Prioridad 1 en AP
        </span>
      </div>

      {/* Cuadrícula de Tarjetas de Decisión Prioritaria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {priorityPatients.map((patient) => {
          const egfrAct = patient.valores_clave?.egfr?.actual || 68;
          const egfrPrev = patient.valores_clave?.egfr?.previo || 86;
          const deltaEgfr = patient.valores_clave?.egfr?.delta || -18;
          const pctEgfr = Math.round((Math.abs(deltaEgfr) / egfrPrev) * 100);

          const creatAct = patient.valores_clave?.creatinina?.actual || 1.10;
          const creatPrev = patient.valores_clave?.creatinina?.previo || 0.92;

          const uacrAct = patient.valores_clave?.uacr?.actual || 35;
          const uacrPrev = patient.valores_clave?.uacr?.previo || 18;
          const deltaUacr = patient.valores_clave?.uacr?.delta || 17;

          // Titular asertivo en lenguaje llano según el paciente
          const plainTitle = patient.id === 'PAC-02-SILENTE'
            ? `Creatinina normal (${creatAct} mg/dL), pero ha perdido 1/5 del filtrado en 1 año (-${pctEgfr}%)`
            : `Creatinina en rango (${creatAct} mg/dL), pero la microalbuminuria se ha disparado (+${deltaUacr} mg/g)`;

          return (
            <div
              key={patient.id}
              className="bg-white rounded-[6px] border-2 border-[#F4D0BD] shadow-xs flex flex-col justify-between overflow-hidden"
            >
              {/* Parte Superior: Datos del Paciente y Etiqueta Mirar Hoy */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[#0E1621]">
                        {patient.nombre}
                      </span>
                      <span className="text-[11px] font-mono text-[#5A6573] bg-[#F0F2F5] px-1.5 py-0.5 rounded border border-[#E3E6EB]">
                        {patient.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A6573] mt-0.5">
                      {patient.edad} años • {patient.sexo} • Modo B (Historial 12 meses)
                    </p>
                  </div>

                  {/* Etiqueta Directa: Mirar Hoy */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDEFE6] text-[#C2410C] border border-[#F4D0BD] text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
                    <span>Mirar hoy</span>
                  </span>
                </div>

                {/* Titular en Lenguaje Llano */}
                <div className="bg-[#FAFBFD] p-2.5 rounded-[5px] border border-[#E3E6EB]">
                  <h4 className="text-[12px] font-bold text-[#0E1621] leading-snug">
                    {plainTitle}
                  </h4>
                  <p className="text-[11px] text-[#5A6573] mt-1 leading-relaxed">
                    <strong>La trampa analítica:</strong> La creatinina ({creatAct} mg/dL) no supera el corte estándar de laboratorio, pero el filtrado glomerular cae aceleradamente a <strong>{egfrAct} mL/min</strong> y la microalbuminuria alcanza <strong>{uacrAct} mg/g</strong>.
                  </p>
                </div>

                {/* Gráfico Visual de 12 Meses: Creatinina Plana vs Filtrado en Descenso */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#0E1621]">
                      Contraste de Trayectoria (12 Meses)
                    </span>
                    <span className="text-[10px] text-[#5A6573]">
                      Banda verde = Rango seguro (&gt;60 mL/min)
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] p-2.5 rounded-[5px] border border-[#E3E6EB]">
                    <svg viewBox="0 0 380 95" className="w-full h-24 overflow-visible">
                      {/* Banda sombreada de normalidad clínica (>60 mL/min) */}
                      <rect x="35" y="8" width="335" height="42" fill="#E6F4EC" fillOpacity="0.5" rx="3" />
                      <text x="42" y="19" fill="#1F7A55" fontSize="8" fontWeight="700">
                        ZONA DE NORMALIDAD (&gt;60 mL/min)
                      </text>

                      {/* Eje de tiempo */}
                      <line x1="35" y1="78" x2="370" y2="78" stroke="#E3E6EB" strokeWidth="1" />
                      <text x="75" y="90" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#5A6573">Hace 12 meses</text>
                      <text x="310" y="90" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0E1621">Hoy (Consulta)</text>

                      {/* 1. LÍNEA DE CREATININA (Plana, engañosa en azul/gris) */}
                      {/* Y escala normalizada: 0.8 -> y=38, 1.1 -> y=34 (casi horizontal en rango seguro) */}
                      <line
                        x1="75"
                        y1="38"
                        x2="310"
                        y2="34"
                        stroke="#5A6573"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      />
                      <circle cx="75" cy="38" r="3" fill="#5A6573" />
                      <circle cx="310" cy="34" r="3" fill="#5A6573" />
                      <text x="75" y="48" textAnchor="middle" fontSize="8" className="font-mono" fill="#5A6573">
                        Cr {creatPrev}
                      </text>
                      <text x="310" y="46" textAnchor="middle" fontSize="8" fontWeight="700" className="font-mono" fill="#5A6573">
                        Cr {creatAct} ("Normal")
                      </text>

                      {/* 2. LÍNEA DE FILTRADO GLOMERULAR (En picado hacia abajo, naranja/roja) */}
                      {/* Y escala: 86 -> y=22 (arriba), 68 -> y=62 (cayendo hacia abajo) */}
                      <line
                        x1="75"
                        y1="22"
                        x2="310"
                        y2="62"
                        stroke="#C2410C"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <circle cx="75" cy="22" r="4" fill="#1F7A55" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="310" cy="62" r="4.5" fill="#C2410C" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text x="75" y="16" textAnchor="middle" fontSize="9" fontWeight="700" className="font-mono" fill="#1F7A55">
                        eGFR {egfrPrev}
                      </text>
                      <text x="310" y="74" textAnchor="middle" fontSize="9.5" fontWeight="800" className="font-mono" fill="#C2410C">
                        eGFR {egfrAct} (-{pctEgfr}%)
                      </text>
                    </svg>

                    {/* Leyenda Simple */}
                    <div className="flex items-center justify-between text-[10px] text-[#5A6573] pt-1 border-t border-[#E3E6EB] mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-[#5A6573] inline-block" />
                        <span>Creatinina: <strong>Plana</strong> en rango normal</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#C2410C]">
                        <span className="w-2.5 h-1 bg-[#C2410C] rounded-full inline-block" />
                        <span>Filtrado: <strong>Caída de {Math.abs(deltaEgfr)} mL/min</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recomendación Clínica Resumida */}
                <div className="text-[11px] text-[#0E1621] bg-[#F6F7F9] p-2 rounded-[4px] border border-[#E3E6EB] flex items-center justify-between">
                  <div>
                    <span className="text-[#1D3B6B] font-bold">Pauta inmediata: </span>
                    <span>Iniciar iSGLT2 (Dapagliflozina 10mg) • Prohibir AINEs • Control 60d</span>
                  </div>
                </div>
              </div>

              {/* Botones de Decisión Rápida */}
              <div className="px-4 py-2.5 bg-[#FAFBFD] border-t border-[#E3E6EB] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenCarePlan?.(patient)}
                  className="px-3 py-1.5 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[#0E1621] text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="Generar hoja de cuidados para entregar al paciente en mano"
                >
                  <Printer className="w-3.5 h-3.5 text-[#5A6573]" />
                  <span>Hoja para el paciente</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectPatient?.(patient)}
                  className="px-3.5 py-1.5 rounded-[4px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Priorizar en consulta / Ver decisión</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityPatientsSection;
