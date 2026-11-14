// src/components/folderView/PatientTable.jsx
import React, { useState } from 'react';
import { Search, Eye, ChevronDown, ChevronRight, ArrowRight, Printer, AlertOctagon, Heart, Pill, Calendar, AlertTriangle } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';
import { PatientCarePlanModal } from '../patientCare/PatientCarePlanModal';

export const PatientTable = ({ patients = [], onSelectPatient }) => {
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
          dotColor: 'bg-[#C2410C] animate-pulse',
          badgeClass: 'bg-[#FDEFE6] text-[#C2410C] border-[#F4D0BD]',
          priority: 1,
          isSilent: true,
        };
      case 'ALTO':
        return {
          id: 'MIRAR_HOY',
          label: 'Mirar hoy',
          dotColor: 'bg-[#B3261E] animate-pulse',
          badgeClass: 'bg-[#FBEAE9] text-[#B3261E] border-[#F5C2C0]',
          priority: 2,
          isSilent: false,
        };
      case 'MEDIO':
        return {
          id: 'VIGILAR',
          label: 'Vigilar',
          dotColor: 'bg-[#A16207]',
          badgeClass: 'bg-[#FBF3DD] text-[#714405] border-[#F2DFAC]',
          priority: 3,
          isSilent: false,
        };
      case 'CONTROLADO':
      default:
        return {
          id: 'ESTABLE',
          label: 'Estable',
          dotColor: 'bg-[#1F7A55]',
          badgeClass: 'bg-[#E6F4EC] text-[#16563C] border-[#BDDFC9]',
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
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] overflow-hidden">
        {/* Barra de Filtros Clínicos y Buscador Único Sencillo */}
        <div className="px-4 py-3 border-b border-[#E3E6EB] bg-[#F6F7F9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Pestañas de Decisión Clínica */}
          <div className="flex items-center gap-1.5 overflow-x-auto" role="tablist">
            {[
              { id: 'TODOS', label: 'Todos', count: counts.total },
              { id: 'MIRAR_HOY', label: '🔴 Mirar hoy', count: counts.mirarHoy, isAlert: true },
              { id: 'VIGILAR', label: '🟡 Vigilar', count: counts.vigilar },
              { id: 'ESTABLE', label: '🟢 Estable', count: counts.estable },
            ].map((tab) => {
              const isSelected = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-[4px] text-[12px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? tab.isAlert
                        ? 'bg-[#C2410C] text-white shadow-xs'
                        : 'bg-[#1D3B6B] text-white shadow-xs'
                      : 'bg-white text-[#5A6573] border border-[#E3E6EB] hover:text-[#0E1621] hover:bg-[#F0F2F5]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#F0F2F5] text-[#5A6573]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Único Buscador Clínico Sencillo (Sin atajos de teclado complejos) */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8A94A3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente por nombre o ID..."
              className="w-full text-[12px] pl-8 pr-3 py-1.5 rounded-[4px] border border-[#CBD0D8] bg-white text-[#0E1621] placeholder-[#8A94A3] focus:border-[#1D3B6B] focus:outline-none"
            />
          </div>
        </div>

        {/* Tabla de Decisiones Simplificada: SIN SCROLL HORIZONTAL */}
        <div className="w-full">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3E6EB] bg-[#F6F7F9] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
                <th className="py-2.5 px-4 w-[24%]">Paciente</th>
                <th className="py-2.5 px-3 w-[16%]">Decisión</th>
                <th className="py-2.5 px-3 w-[26%]">Tendencia eGFR (12m)</th>
                <th className="py-2.5 px-3 w-[22%]">Motivo de Decisión</th>
                <th className="py-2.5 px-4 w-[12%] text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6EB] text-[13px]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-[12px] text-[#5A6573]">
                    No hay pacientes con el criterio de decisión seleccionado.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const status = getDecisionStatus(p.categoria);
                  const isExpanded = expandedPatientId === p.id;
                  const isSilent = p.categoria === 'OCULTO';

                  const egfrAct = p.valores_clave?.egfr?.actual;
                  const egfrPrev = p.valores_clave?.egfr?.previo;
                  const deltaEgfr = p.valores_clave?.egfr?.delta;

                  // Puntos reales de la analítica del paciente para el sparkline
                  const sparkPoints = egfrPrev !== null && egfrPrev !== undefined
                    ? [egfrPrev, egfrAct]
                    : [egfrAct, egfrAct];

                  const pctDrop = egfrPrev ? Math.round((Math.abs(deltaEgfr) / egfrPrev) * 100) : 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => {
                          setExpandedPatientId(prev => (prev === p.id ? null : p.id));
                        }}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-[#F0F4FA]'
                            : isSilent
                            ? 'bg-[#FDEFE6]/25 hover:bg-[#FDEFE6]/40'
                            : 'hover:bg-[#F6F7F9]'
                        }`}
                      >
                        {/* 1. Paciente */}
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#0E1621] leading-tight">
                            {p.nombre}
                          </div>
                          <div className="text-[11px] font-mono text-[#5A6573] mt-0.5">
                            {p.id} • {p.edad}a • {p.sexo}
                          </div>
                        </td>

                        {/* 2. Estado / Decisión */}
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold ${status.badgeClass}`}>
                            <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                            <span>{status.label}</span>
                          </span>
                        </td>

                        {/* 3. Tendencia eGFR con Puntos Reales e Inicial -> Actual */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 shrink-0">
                              <Sparkline
                                points={sparkPoints}
                                isSilent={isSilent}
                                isCritical={p.categoria === 'ALTO'}
                                isFavorable={deltaEgfr !== null && deltaEgfr >= 0}
                                ariaLabel={`Evolución eGFR: ${sparkPoints.join(' a ')}`}
                              />
                            </div>
                            <div className="font-mono text-[11px] tabular-nums">
                              {egfrPrev !== null && egfrPrev !== undefined ? (
                                <span className="text-[#0E1621]">
                                  <strong>{egfrPrev}</strong> → <strong className={deltaEgfr < -5 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}>{egfrAct}</strong>
                                  <span className={`ml-1 font-semibold ${deltaEgfr < -5 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}`}>
                                    ({deltaEgfr > 0 ? `+${deltaEgfr}` : `${deltaEgfr}`} mL)
                                  </span>
                                </span>
                              ) : (
                                <span className="font-semibold text-[#0E1621]">{egfrAct} mL/min</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Motivo Corto en Español Llano */}
                        <td className="py-2.5 px-3 text-[12px] text-[#5A6573] leading-snug">
                          {getShortReason(p)}
                        </td>

                        {/* 5. Acción Directa */}
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(p);
                            }}
                            className={`px-3 py-1 rounded-[4px] text-[11px] font-semibold border transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs ${
                              isSilent
                                ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white border-transparent'
                                : 'bg-white hover:bg-[#F0F2F5] text-[#1D3B6B] border-[#CBD0D8]'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver decisión</span>
                          </button>
                        </td>
                      </tr>

                      {/* Despliegue Rápido Inline: Pauta Inmediata para el Médico */}
                      {isExpanded && (
                        <tr className="bg-[#FAFBFD] border-b border-[#E3E6EB]">
                          <td colSpan="5" className="p-0">
                            <div className={`p-4 border-l-[4px] ${isSilent ? 'border-l-[#C2410C]' : 'border-l-[#1D3B6B]'} space-y-3`}>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E3E6EB]">
                                <div className="text-[12px] font-bold text-[#0E1621]">
                                  {p.conclusion_diagnostica}
                                </div>
                                <span className="text-[11px] font-mono text-[#5A6573]">
                                  Creatinina: {p.valores_clave?.creatinina?.actual} mg/dL • UACR: {p.valores_clave?.uacr?.actual} mg/g
                                </span>
                              </div>

                              {/* 3 Cuidados Clínicos para Decidir en Consulta */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                                <div className="p-2.5 rounded-[4px] bg-white border border-[#E3E6EB] space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-[#1D3B6B]">
                                    <Pill className="w-3.5 h-3.5" />
                                    <span>Pauta Farmacológica</span>
                                  </div>
                                  <p className="text-[#0E1621] font-medium">
                                    Iniciar iSGLT2 (Dapagliflozina / Empagliflozina 10mg/d)
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-[4px] bg-[#FDEFE6]/70 border border-[#F4D0BD] space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-[#842A06]">
                                    <AlertTriangle className="w-3.5 h-3.5 text-[#C2410C]" />
                                    <span>Precaución (Nefrotóxicos)</span>
                                  </div>
                                  <p className="text-[#842A06] font-medium">
                                    Prohibir o evitar AINEs (Ibuprofeno/Naproxeno)
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-[4px] bg-[#E6F4EC]/60 border border-[#BDDFC9] space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-[#16563C]">
                                    <Calendar className="w-3.5 h-3.5 text-[#1F7A55]" />
                                    <span>Seguimiento en AP</span>
                                  </div>
                                  <p className="text-[#16563C] font-medium">
                                    Control de UACR y tensión en 60 días con enfermería
                                  </p>
                                </div>
                              </div>

                              {/* Botones de Acción */}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setCarePlanPatient(p)}
                                  className="px-3 py-1.5 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[#0E1621] text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-[#5A6573]" />
                                  <span>Hoja para el paciente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onSelectPatient(p)}
                                  className="px-3.5 py-1.5 rounded-[4px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <span>Ver Segunda Opinión Completa</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
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
