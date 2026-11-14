// src/components/folderView/PatientTable.jsx
import React, { useState } from 'react';
import { Search, Eye, ArrowRight, Printer, Pill, Calendar, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';
import { PatientCarePlanModal } from '../patientCare/PatientCarePlanModal';

export const PatientTable = ({ patients = [], onSelectPatient, onIntervenePatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('TODOS');
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [carePlanPatient, setCarePlanPatient] = useState(null);

  // Mapeo clínico de estados sencillos: "Mirar hoy / Vigilar / Estable"
  const getDecisionStatus = (categoria) => {
    switch (categoria) {
      case 'OCULTO':
        return {
          id: 'MIRAR_HOY',
          label: 'Mirar hoy',
          dotColor: 'bg-rose-600',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          priority: 1,
          isSilent: true,
        };
      case 'ALTO':
        return {
          id: 'MIRAR_HOY',
          label: 'Mirar hoy',
          dotColor: 'bg-rose-600',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          priority: 2,
          isSilent: false,
        };
      case 'MEDIO':
        return {
          id: 'VIGILAR',
          label: 'Vigilar',
          dotColor: 'bg-amber-600',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          priority: 3,
          isSilent: false,
        };
      case 'CONTROLADO':
      default:
        return {
          id: 'ESTABLE',
          label: 'Estable',
          dotColor: 'bg-emerald-600',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          priority: 4,
          isSilent: false,
        };
    }
  };

  // Motivos clínicos cortos en español llano sin jerga innecesaria
  const getShortReason = (patient) => {
    switch (patient.id) {
      case 'PAC-02-SILENTE':
        return 'Caída de filtrado (-18 mL/min) con creatinina falsamente normal';
      case 'PAC-05-LOTE-01':
        return 'Microalbuminuria acelerada (+22 mg/g) con HbA1c estable';
      case 'PAC-03-EVIDENTE':
        return 'LDL 175 mg/dL y PAS 152 mmHg descompensadas';
      case 'PAC-04-MODO-A':
        return 'Filtrado en límite (64 mL/min) sin historial interanual';
      case 'PAC-01-SANO':
        return 'Filtrado y tensión en objetivos de control óptimo';
      default:
        return patient.disparador_principal?.slice(0, 75) || 'Revisión clínica rutinaria';
    }
  };

  // Ordenación por prioridad de decisión
  const sortedPatients = [...patients].sort((a, b) => {
    // Si ya está intervenido, baja su prioridad relativa
    if (a.intervenido && !b.intervenido) return 1;
    if (!a.intervenido && b.intervenido) return -1;
    const pA = getDecisionStatus(a.categoria).priority;
    const pB = getDecisionStatus(b.categoria).priority;
    return pA - pB;
  });

  const filteredPatients = sortedPatients.filter((p) => {
    const matchesSearch =
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'TODOS') return true;
    const st = getDecisionStatus(p.categoria);
    if (selectedFilter === 'MIRAR_HOY') return st.id === 'MIRAR_HOY';
    if (selectedFilter === 'VIGILAR') return st.id === 'VIGILAR';
    if (selectedFilter === 'ESTABLE') return st.id === 'ESTABLE';

    return true;
  });

  const counts = {
    total: patients.length,
    mirarHoy: patients.filter((p) => getDecisionStatus(p.categoria).id === 'MIRAR_HOY').length,
    vigilar: patients.filter((p) => getDecisionStatus(p.categoria).id === 'VIGILAR').length,
    estable: patients.filter((p) => getDecisionStatus(p.categoria).id === 'ESTABLE').length,
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Barra de Filtros Clínicos y Buscador Único */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Pestañas de Decisión Clínica */}
          <div className="flex items-center gap-1.5 overflow-x-auto" role="tablist">
            {[
              { id: 'TODOS', label: 'Todos', count: counts.total },
              { id: 'MIRAR_HOY', label: 'Mirar hoy', count: counts.mirarHoy, isAlert: true },
              { id: 'VIGILAR', label: 'Vigilar', count: counts.vigilar },
              { id: 'ESTABLE', label: 'Estable', count: counts.estable },
            ].map((tab) => {
              const isSelected = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? tab.isAlert
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.isAlert && <span className="w-1.5 h-1.5 rounded-full bg-rose-300" />}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Único Buscador Clínico Sencillo */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente por nombre o ID..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabla de Decisiones Simplificada: SIN SCROLL HORIZONTAL */}
        <div className="w-full">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/75 border-b border-slate-200">
                <th className="py-3 px-4 w-[24%]">Paciente</th>
                <th className="py-3 px-3 w-[16%]">Decisión</th>
                <th className="py-3 px-3 w-[26%]">Tendencia eGFR (12m)</th>
                <th className="py-3 px-3 w-[20%]">Motivo de Decisión</th>
                <th className="py-3 px-4 w-[14%] text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-xs text-slate-500">
                    No hay pacientes con el criterio de decisión seleccionado.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p, idx) => {
                  const status = getDecisionStatus(p.categoria);
                  const isExpanded = expandedPatientId === p.id;
                  const isSilent = p.categoria === 'OCULTO';
                  const isIntervenido = !!p.intervenido;

                  const egfrAct = p.valores_clave?.egfr?.actual;
                  const egfrPrev = p.valores_clave?.egfr?.previo;
                  const deltaEgfr = p.valores_clave?.egfr?.delta;

                  // Puntos reales de la analítica del paciente
                  const sparkPoints = egfrPrev !== null && egfrPrev !== undefined
                    ? [egfrPrev, egfrAct]
                    : [egfrAct, egfrAct];

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => {
                          setExpandedPatientId(prev => (prev === p.id ? null : p.id));
                        }}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        className={`cursor-pointer transition-colors animate-stagger-fade ${
                          isExpanded
                            ? 'bg-slate-100/70'
                            : isIntervenido
                            ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                            : isSilent
                            ? 'bg-rose-50/20 hover:bg-rose-50/40'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* 1. Paciente */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {p.nombre}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {p.id} • {p.edad}a • {p.sexo}
                          </div>
                        </td>

                        {/* 2. Estado / Decisión */}
                        <td className="py-3 px-3">
                          {isIntervenido ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Cita Reasignada</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${status.badgeClass}`}>
                              {status.id === 'MIRAR_HOY' ? (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-20" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                                </span>
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                              )}
                              <span>{status.label}</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Tendencia eGFR con Puntos Reales e Inicial -> Actual Monospaciado */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-18 shrink-0">
                              <Sparkline
                                points={sparkPoints}
                                isSilent={isSilent}
                                isCritical={p.categoria === 'ALTO'}
                                isFavorable={deltaEgfr !== null && deltaEgfr >= 0}
                                ariaLabel={`Evolución eGFR: ${sparkPoints.join(' a ')}`}
                              />
                            </div>
                            <div className="font-mono text-xs tabular-nums text-slate-700">
                              {egfrPrev !== null && egfrPrev !== undefined ? (
                                <span>
                                  <span className="font-medium">{egfrPrev}</span> → <span className="font-semibold text-slate-900">{egfrAct}</span>
                                  <span className={`ml-1.5 font-medium ${deltaEgfr < -5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    ({deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr} mL)
                                  </span>
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-900">{egfrAct} mL/min</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Motivo de Decisión con buen interlineado */}
                        <td className="py-3 px-3 text-xs leading-relaxed text-slate-600 line-clamp-2">
                          {getShortReason(p)}
                        </td>

                        {/* 5. Acción Directa */}
                        <td className="py-3 px-4 text-right">
                          {isSilent || p.categoria === 'ALTO' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onIntervenePatient?.(p);
                                }}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs ${
                                  isIntervenido
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                                title="Reprogramar cita y conciliar pauta preventiva"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{isIntervenido ? 'Plan' : 'Intervenir'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPatient(p);
                                }}
                                className="bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 p-1.5 rounded-md text-xs transition-all inline-flex items-center cursor-pointer shadow-2xs"
                                title="Ver segunda opinión completa"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPatient(p);
                              }}
                              className="bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs hover:text-slate-900"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver decisión</span>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Despliegue Rápido Inline: Pauta Inmediata para el Médico */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan="5" className="p-0">
                            <div className={`p-4 border-l-4 ${isSilent ? 'border-l-rose-600' : 'border-l-slate-800'} space-y-3`}>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                <div className="text-xs font-bold text-slate-900">
                                  {p.conclusion_diagnostica}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">
                                  Creatinina: {p.valores_clave?.creatinina?.actual} mg/dL • UACR: {p.valores_clave?.uacr?.actual} mg/g
                                </span>
                              </div>

                              {/* 3 Cuidados Clínicos para Decidir en Consulta */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <Pill className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Pauta Farmacológica</span>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    Iniciar iSGLT2 (Dapagliflozina / Empagliflozina 10mg/d)
                                  </p>
                                </div>

                                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Precaución (Nefrotóxicos)</span>
                                  </div>
                                  <p className="text-amber-900 text-[11px]">
                                    Prohibir o evitar AINEs (Ibuprofeno/Naproxeno)
                                  </p>
                                </div>

                                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Seguimiento en AP</span>
                                  </div>
                                  <p className="text-emerald-900 text-[11px]">
                                    Control de UACR y tensión en 60 días con enfermería
                                  </p>
                                </div>
                              </div>

                              {/* Botones de Acción Inline */}
                              <div className="flex items-center justify-end gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCarePlanPatient(p);
                                  }}
                                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Hoja para el paciente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onIntervenePatient?.(p);
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Priorizar e Intervenir</span>
                                </button>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Hoja de Cuidados para el Paciente */}
      <PatientCarePlanModal
        isOpen={!!carePlanPatient}
        onClose={() => setCarePlanPatient(null)}
        patient={carePlanPatient}
      />
    </>
  );
};

export default React.memo(PatientTable);
