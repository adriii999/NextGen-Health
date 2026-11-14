// src/components/folderView/PriorityPatientsSection.jsx
import React from 'react';
import { AlertOctagon, ArrowRight, Pill, Calendar, Heart, Printer, ShieldAlert, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const PriorityPatientsSection = ({ patients = [], onSelectPatient, onOpenCarePlan }) => {
  // Filtrar exclusivamente los pacientes con riesgo oculto silencioso
  const priorityPatients = patients.filter((p) => p.categoria === 'OCULTO');

  if (priorityPatients.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Cabecera de la Sección: Responder en 5 segundos a "¿a quién miro primero y por qué?" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                A quién mirar hoy en el cupo
              </h3>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {priorityPatients.length} casos prioritarios
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pacientes con <strong>creatinina falsamente normal</strong> pero con <strong>pérdida silente acelerada</strong> de función cardiorrenal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          <span>Prioridad 1 en Atención Primaria</span>
        </div>
      </div>

      {/* Cuadrícula de Tarjetas Hero de Alta Gama */}
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

          // Titulares clínicos de impacto
          const isManuel = patient.id === 'PAC-02-SILENTE';
          const headline = isManuel
            ? `Creatinina en rango normal (${creatAct} mg/dL), pero pérdida del ${pctEgfr}% de filtrado en 12 meses`
            : `Creatinina en rango normal (${creatAct} mg/dL), pero microalbuminuria disparada (+${deltaUacr} mg/g)`;

          return (
            <div
              key={patient.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                
                {/* 1. Cabecera de la Tarjeta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-base">
                      {patient.nombre}
                    </span>
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {patient.id}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <span>Mirar hoy</span>
                  </span>
                </div>

                <div className="text-xs text-slate-500 -mt-2">
                  {patient.edad} años • {patient.sexo} • Trayectoria interanual (Modo B)
                </div>

                {/* 2. Bloque de Alerta Clínica Integrado (Callout de trampa analítica) */}
                <div className="bg-amber-50/60 border-l-4 border-amber-500 rounded-r-lg p-3.5 space-y-1">
                  <h4 className="text-xs font-bold text-amber-950 leading-snug">
                    {headline}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                    La analítica rutinaria clasifica la creatinina (<span className="font-mono font-semibold text-slate-900 bg-amber-100/70 px-1 py-0.2 rounded">{creatAct} mg/dL</span>) como "normal", pero el filtrado glomerular real cae aceleradamente a <span className="font-mono font-semibold text-rose-700 bg-rose-100/70 px-1 py-0.2 rounded">{egfrAct} mL/min</span> con microalbuminuria de <span className="font-mono font-semibold text-rose-700 bg-rose-100/70 px-1 py-0.2 rounded">{uacrAct} mg/g</span>.
                  </p>
                </div>

                {/* 3. Gráfico de Trayectoria Rediseñado (Sin colisiones, 2 planos visuales) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Contraste de Trayectoria a 12 Meses
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Banda verde = Rango seguro (&gt;60 mL/min)
                    </span>
                  </div>

                  <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3 overflow-hidden">
                    <svg viewBox="0 0 480 160" className="w-full h-38 overflow-visible">
                      <defs>
                        <linearGradient id={`safeZone-${patient.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.04" />
                        </linearGradient>
                      </defs>

                      {/* --- PLANO SUPERIOR: FILTRADO GLOMERULAR (eGFR) --- */}

                      {/* 1. Área Sombreada de Normalidad (>60 mL/min) de Y=8 a Y=58 */}
                      <rect
                        x="30"
                        y="8"
                        width="430"
                        height="50"
                        fill={`url(#safeZone-${patient.id})`}
                        rx="4"
                      />
                      {/* Línea discontinua de umbral muy fina en 60 mL/min */}
                      <line
                        x1="30"
                        y1="58"
                        x2="460"
                        y2="58"
                        stroke="#10B981"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        strokeOpacity="0.5"
                      />
                      {/* Watermark discreto en esquina superior derecha (nunca colisiona con datos) */}
                      <text
                        x="450"
                        y="22"
                        textAnchor="end"
                        fontSize="9"
                        fontWeight="600"
                        fill="#059669"
                        opacity="0.85"
                      >
                        Zona de normalidad (&gt;60 mL/min)
                      </text>

                      {/* Línea continua de alerta clínica de eGFR (de Y=26 a Y=78) */}
                      <line
                        x1="80"
                        y1="26"
                        x2="360"
                        y2="78"
                        stroke="#C2410C"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                      />

                      {/* Punto T-1 (Hace 12 meses): eGFR Inicial */}
                      <circle cx="80" cy="26" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                      {/* Badge flotante T-1 */}
                      <g transform="translate(48, 8)">
                        <rect width="64" height="15" rx="3" fill="#FFFFFF" stroke="#CBD0D8" strokeWidth="0.75" />
                        <text x="32" y="11" textAnchor="middle" fontSize="9" fontWeight="700" className="font-mono" fill="#10B981">
                          {egfrPrev} mL/min
                        </text>
                      </g>

                      {/* Punto T (Hoy): eGFR Actual con caída */}
                      <circle cx="360" cy="78" r="5.5" fill="#C2410C" stroke="#FFFFFF" strokeWidth="2" />
                      {/* Badge flotante tipo "pill" en el punto final (evita cualquier colisión) */}
                      <g transform="translate(320, 92)">
                        <rect width="135" height="18" rx="4" fill="#FFFFFF" stroke="#F4D0BD" strokeWidth="1" />
                        <text x="67" y="13" textAnchor="middle" fontSize="9" fontWeight="800" className="font-mono" fill="#C2410C">
                          Hoy: {egfrAct} mL/min (-{pctEgfr}%)
                        </text>
                      </g>


                      {/* --- PLANO INFERIOR: CREATININA SÉRICA (Plana, en rango normal) --- */}
                      
                      {/* Línea horizontal discontinua de Creatinina (de Y=126 a Y=124) */}
                      <line
                        x1="80"
                        y1="126"
                        x2="360"
                        y2="124"
                        stroke="#64748B"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Punto T-1 Creatinina */}
                      <circle cx="80" cy="126" r="3.5" fill="#64748B" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text x="80" y="140" textAnchor="middle" fontSize="8.5" fontWeight="600" className="font-mono" fill="#64748B">
                        Cr {creatPrev}
                      </text>

                      {/* Punto T Creatinina */}
                      <circle cx="360" cy="124" r="3.5" fill="#64748B" stroke="#FFFFFF" strokeWidth="1.5" />
                      <g transform="translate(315, 134)">
                        <rect width="90" height="15" rx="3" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.75" />
                        <text x="45" y="11" textAnchor="middle" fontSize="8" fontWeight="700" className="font-mono" fill="#475569">
                          Cr {creatAct} ("Normal")
                        </text>
                      </g>


                      {/* --- EJE TEMPORAL INFERIOR --- */}
                      <line x1="30" y1="152" x2="460" y2="152" stroke="#E2E8F0" strokeWidth="1" />
                      <text x="80" y="160" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#64748B">
                        Hace 12 meses
                      </text>
                      <text x="360" y="160" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0F172A">
                        Hoy (Consulta)
                      </text>
                    </svg>

                    {/* Leyenda limpia inferior */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-slate-500 inline-block" />
                        <span>Creatinina: <strong>Plana</strong> en rango estándar</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <span className="w-2.5 h-1 bg-rose-600 rounded-full inline-block" />
                        <span>Filtrado: <strong>Caída acelerada de {Math.abs(deltaEgfr)} mL/min</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Fila de Acciones Clínicas: Chips Clínicos Interactivos */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Pauta Inmediata para el Médico:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/90 text-blue-900 border border-blue-200 text-[11px] font-medium">
                      <Pill className="w-3 h-3 text-blue-700" />
                      <span>Iniciar iSGLT2 (Dapagliflozina / Empagliflozina 10mg)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50/90 text-rose-900 border border-rose-200 text-[11px] font-medium">
                      <AlertTriangle className="w-3 h-3 text-rose-700" />
                      <span>Prohibir AINEs (Ibuprofeno/Naproxeno)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/90 text-emerald-900 border border-emerald-200 text-[11px] font-medium">
                      <Calendar className="w-3 h-3 text-emerald-700" />
                      <span>Control 60d (UACR enfermería)</span>
                    </span>
                  </div>
                </div>

              </div>

              {/* 5. Botones de Acción de Alta Gama */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenCarePlan?.(patient)}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Generar e imprimir hoja de cuidados para entregar al paciente"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hoja para el paciente</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectPatient?.(patient)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
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
