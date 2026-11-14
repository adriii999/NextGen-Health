// src/components/folderView/PatientTable.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye, AlignJustify, List, ChevronDown, ChevronRight, ExternalLink, FileText, CheckCircle2, AlertOctagon, TrendingDown, Heart, Pill, Calendar, AlertTriangle, Printer } from 'lucide-react';
import { TrafficLightBadge } from '../common/TrafficLightBadge';
import { Sparkline } from '../charts/Sparkline';
import { PatientCarePlanModal } from '../patientCare/PatientCarePlanModal';

export const PatientTable = ({ patients = [], onSelectPatient, onOpenCommandMenu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('TODOS');
  const [density, setDensity] = useState('normal'); // 'normal' (52px) o 'compact' (40px) - Carbon Design
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedPatientId, setExpandedPatientId] = useState(null); // Fila expandible inline (Carbon Design)
  const [carePlanPatient, setCarePlanPatient] = useState(null); // Modal de hoja para el paciente
  const searchInputRef = useRef(null);
  const tableRef = useRef(null);

  // Atajo de teclado: pulsar "/" enfoca el buscador
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ordenación clínica estricta:
  // 1. Riesgo oculto silencioso (protagonista del reto)
  // 2. Alto riesgo evidente
  // 3. Moderado
  // 4. Control óptimo
  const priorityMap = {
    OCULTO: 1,
    ALTO: 2,
    MEDIO: 3,
    CONTROLADO: 4,
  };

  const sortedPatients = [...patients].sort((a, b) => {
    const pA = priorityMap[a.categoria] || 5;
    const pB = priorityMap[b.categoria] || 5;
    return pA - pB;
  });

  const filteredPatients = sortedPatients.filter((p) => {
    const matchesSearch =
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.archivo?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'TODOS') return true;
    if (selectedFilter === 'OCULTO') return p.categoria === 'OCULTO';
    if (selectedFilter === 'ALTO') return p.categoria === 'ALTO';
    if (selectedFilter === 'MEDIO') return p.categoria === 'MEDIO';
    if (selectedFilter === 'CONTROLADO') return p.categoria === 'CONTROLADO';

    return true;
  });

  // Conteo para la barra de semáforo rápido
  const counts = {
    ocultos: patients.filter((p) => p.categoria === 'OCULTO').length,
    altos: patients.filter((p) => p.categoria === 'ALTO').length,
    moderados: patients.filter((p) => p.categoria === 'MEDIO').length,
    controlados: patients.filter((p) => p.categoria === 'CONTROLADO').length,
  };

  // Navegación por teclado (Linear + Carbon pattern: flechas arriba/abajo + Enter + ArrowRight/Left para expandir)
  const handleTableKeyDown = (e) => {
    if (filteredPatients.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredPatients.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredPatients[focusedIndex];
      if (current) {
        setExpandedPatientId(prev => prev === current.id ? null : current.id);
        onSelectPatient(current);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = filteredPatients[focusedIndex];
      if (current) setExpandedPatientId(current.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setExpandedPatientId(null);
    }
  };

  const handleRowClick = (patient, idx) => {
    setFocusedIndex(idx);
    setExpandedPatientId(prev => (prev === patient.id ? null : patient.id));
    onSelectPatient(patient);
  };

  const handleActionClick = (e, patient, idx) => {
    e.stopPropagation();
    setFocusedIndex(idx);
    setExpandedPatientId(patient.id);
    onSelectPatient(patient);
  };

  const toggleExpandOnly = (e, patientId) => {
    e.stopPropagation();
    setExpandedPatientId(prev => (prev === patientId ? null : patientId));
  };

  const isCompact = density === 'compact';

  return (
    <>
      <div
        ref={tableRef}
        onKeyDown={handleTableKeyDown}
        tabIndex={0}
        className="bg-white rounded-[6px] border border-[#E3E6EB] overflow-hidden focus:outline-none"
      >
        {/* Barra de Filtros, Densidad y Buscador */}
        <div className="px-4 py-3 border-b border-[#E3E6EB] bg-[#F6F7F9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Pestañas de Filtro con Semáforo Visual */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" role="tablist">
            {[
              { id: 'TODOS', label: 'Todos', count: patients.length },
              { id: 'OCULTO', label: '🟠 Riesgo oculto silente', count: counts.ocultos, isSilent: true },
              { id: 'ALTO', label: '🔴 Alto riesgo', count: counts.altos },
              { id: 'MEDIO', label: '🟡 Moderado', count: counts.moderados },
              { id: 'CONTROLADO', label: '🟢 Control óptimo', count: counts.controlados },
            ].map((tab) => {
              const isSelected = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedFilter(tab.id);
                    setFocusedIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? tab.isSilent
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

          {/* Selector de Densidad (Carbon) y Buscador */}
          <div className="flex items-center gap-2">
            {/* Toggle de Densidad */}
            <div className="flex items-center bg-white border border-[#E3E6EB] rounded-[4px] p-0.5">
              <button
                onClick={() => setDensity('normal')}
                title="Densidad normal (52px)"
                className={`p-1 rounded-[3px] text-[#5A6573] transition-colors cursor-pointer ${
                  density === 'normal' ? 'bg-[#F0F2F5] text-[#1D3B6B]' : 'hover:text-[#0E1621]'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDensity('compact')}
                title="Densidad compacta (40px)"
                className={`p-1 rounded-[3px] text-[#5A6573] transition-colors cursor-pointer ${
                  density === 'compact' ? 'bg-[#F0F2F5] text-[#1D3B6B]' : 'hover:text-[#0E1621]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Campo de Búsqueda y Botón Ctrl+K */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#8A94A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder="Buscar... (Pulsa / o Ctrl+K)"
                className="w-full text-[12px] pl-9 pr-14 py-1.5 rounded-[4px] border border-[#CBD0D8] bg-white text-[#0E1621] placeholder-[#8A94A3] focus:border-[#1D3B6B] focus:outline-none"
              />
              <button
                onClick={onOpenCommandMenu}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#5A6573] bg-[#F0F2F5] hover:bg-[#E3E6EB] px-1.5 py-0.5 rounded border border-[#E3E6EB] cursor-pointer"
                title="Abrir menú de comandos"
              >
                Ctrl+K
              </button>
            </div>
          </div>
        </div>

        {/* Tabla Clínica Perfectamente Cuadrada y con Anchos Rígidos Antidesbordamiento */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3E6EB] bg-[#F6F7F9] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] whitespace-nowrap">
                <th className="py-2.5 pl-3 pr-1 w-9 min-w-[36px] text-center" title="Expandir fila inline"></th>
                <th className="py-2.5 px-3 w-[180px] min-w-[180px]">Paciente / ID</th>
                <th className="py-2.5 px-2 w-[86px] min-w-[86px] text-center">Modo</th>
                <th className="py-2.5 px-3 w-[130px] min-w-[130px] text-right">eGFR (mL/min)</th>
                <th className="py-2.5 px-3 w-[120px] min-w-[120px] text-right">UACR (mg/g)</th>
                <th className="py-2.5 px-3 w-[95px] min-w-[95px] text-right">LDL (mg/dL)</th>
                <th className="py-2.5 px-3 w-[110px] min-w-[110px] text-center">Tendencia (12m)</th>
                <th className="py-2.5 px-3 w-[190px] min-w-[190px]">Semáforo Clínico</th>
                <th className="py-2.5 px-4 min-w-[260px]">Disparador Principal</th>
                <th className="py-2.5 px-4 w-[125px] min-w-[125px] text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E6EB] text-[13px]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-[13px] text-[#5A6573]">
                    No se encontraron pacientes con los criterios indicados.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p, idx) => {
                  const isSelectedRow = focusedIndex === idx;
                  const isExpanded = expandedPatientId === p.id;
                  const isSilent = p.categoria === 'OCULTO';
                  const isCrit = p.categoria === 'ALTO';

                  // Datos analíticos
                  const egfrActual = p.valores_clave?.egfr?.actual;
                  const egfrPrevio = p.valores_clave?.egfr?.previo;
                  const deltaEgfr = p.valores_clave?.egfr?.delta;

                  const uacrActual = p.valores_clave?.uacr?.actual;
                  const uacrPrevio = p.valores_clave?.uacr?.previo;
                  const deltaUacr = p.valores_clave?.uacr?.delta;

                  const ldlActual = p.valores_clave?.ldl?.actual;

                  // Sparkline T-1 vs T
                  const sparkPoints = egfrPrevio !== null && egfrPrevio !== undefined
                    ? [egfrPrevio, egfrActual]
                    : [egfrActual, egfrActual];

                  // Borde lateral fino del color de estado (Linear Design)
                  const leftBorderStyle = isSelectedRow || isExpanded
                    ? isSilent
                      ? 'border-l-[3px] border-l-[#C2410C]'
                      : isCrit
                      ? 'border-l-[3px] border-l-[#B3261E]'
                      : 'border-l-[3px] border-l-[#1D3B6B]'
                    : 'border-l-[3px] border-l-transparent';

                  const rowHeightClass = isCompact ? 'h-[40px]' : 'h-[52px]';

                  return (
                    <React.Fragment key={p.id}>
                      {/* Fila Principal del Paciente */}
                      <tr
                        onClick={() => handleRowClick(p, idx)}
                        className={`${rowHeightClass} ${leftBorderStyle} cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-[#F0F4FA]'
                            : isSelectedRow
                            ? 'bg-[#F0F2F5]'
                            : 'hover:bg-[#F6F7F9]'
                        } ${isSilent && !isExpanded ? 'bg-[#FDEFE6]/20' : ''}`}
                      >
                        {/* Chevron de Expansión Inline */}
                        <td className="py-1.5 pl-3 pr-1 w-9 min-w-[36px] text-center shrink-0">
                          <button
                            type="button"
                            onClick={(e) => toggleExpandOnly(e, p.id)}
                            aria-label={isExpanded ? 'Contraer detalle inline' : 'Expandir detalle inline'}
                            className="p-1 rounded hover:bg-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#1D3B6B]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[#8A94A3]" />
                            )}
                          </button>
                        </td>

                        {/* Paciente / ID (Rígido, sin saltos de línea extraños) */}
                        <td className="py-1.5 px-3 w-[180px] min-w-[180px] whitespace-nowrap">
                          <div className="font-semibold text-[#0E1621] leading-tight whitespace-nowrap">
                            {p.nombre}
                          </div>
                          <div className="text-[11px] font-mono text-[#5A6573] whitespace-nowrap">
                            {p.id} • {p.edad}a • {p.sexo}
                          </div>
                        </td>

                        {/* Modo (Píldora fija que no se parte nunca) */}
                        <td className="py-1.5 px-2 w-[86px] min-w-[86px] text-center whitespace-nowrap">
                          <span className={`inline-block whitespace-nowrap text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                            p.tiene_progresion
                              ? 'bg-[#E8EEF7] text-[#1D3B6B] border-[#CBD0D8] font-semibold'
                              : 'bg-[#F0F2F5] text-[#5A6573] border-[#E3E6EB]'
                          }`}>
                            {p.tiene_progresion ? 'Modo B' : 'Modo A'}
                          </span>
                        </td>

                        {/* eGFR con delta perfectamente blindado contra wrap de paréntesis */}
                        <td className="py-1.5 px-3 w-[130px] min-w-[130px] text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="inline-flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-[#0E1621]">
                              {egfrActual}
                            </span>
                            {deltaEgfr !== null && deltaEgfr !== undefined && (
                              <span
                                className={`text-[11px] font-medium whitespace-nowrap ${
                                  deltaEgfr < -5 ? 'text-[#C2410C]' : 'text-[#1F7A55]'
                                }`}
                                title={`Delta interanual: ${deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr} mL/min`}
                              >
                                ({deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* UACR con delta perfectamente blindado */}
                        <td className="py-1.5 px-3 w-[120px] min-w-[120px] text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="inline-flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-[#0E1621]">
                              {uacrActual}
                            </span>
                            {deltaUacr !== null && deltaUacr !== undefined && (
                              <span
                                className={`text-[11px] font-medium whitespace-nowrap ${
                                  deltaUacr > 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'
                                }`}
                                title={`Delta interanual: ${deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr} mg/g`}
                              >
                                ({deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* LDL */}
                        <td className="py-1.5 px-3 w-[95px] min-w-[95px] text-right font-mono tabular-nums font-semibold text-[#0E1621] whitespace-nowrap">
                          {ldlActual}
                        </td>

                        {/* Tendencia Sparkline */}
                        <td className="py-1.5 px-3 w-[110px] min-w-[110px] text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <Sparkline
                              points={sparkPoints}
                              isSilent={isSilent}
                              isCritical={isCrit}
                              isFavorable={deltaEgfr !== null && deltaEgfr >= 0}
                              ariaLabel={`Trayectoria eGFR: ${sparkPoints.join(' a ')} mL/min`}
                            />
                          </div>
                        </td>

                        {/* Semáforo Clínico (Cápsula de luz inmediata para el médico en 3 segundos) */}
                        <td className="py-1.5 px-3 w-[190px] min-w-[190px] whitespace-nowrap">
                          <TrafficLightBadge variant={p.categoria} size="sm" />
                        </td>

                        {/* Disparador Principal (Frase médica completa) */}
                        <td className="py-1.5 px-4 min-w-[260px] text-[12px] text-[#5A6573] leading-snug">
                          {p.disparador_principal}
                        </td>

                        {/* Acción: Botón "Ver detalle" */}
                        <td className="py-1.5 px-4 w-[125px] min-w-[125px] text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleActionClick(e, p, idx)}
                            className={`px-3 py-1 rounded-[4px] text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
                              isSilent
                                ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white border-transparent'
                                : 'bg-white hover:bg-[#F0F2F5] text-[#1D3B6B] border-[#CBD0D8]'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver detalle</span>
                          </button>
                        </td>
                      </tr>

                      {/* Fila Expandible Inline con Semáforo y Cuidados del Paciente */}
                      {isExpanded && (
                        <tr className="bg-[#FAFBFD] border-b border-[#E3E6EB]">
                          <td colSpan="10" className="p-0">
                            <div className={`p-4 border-l-[4px] ${isSilent ? 'border-l-[#C2410C]' : isCrit ? 'border-l-[#B3261E]' : 'border-l-[#1D3B6B]'} space-y-3.5`}>
                              
                              {/* Alerta del Semáforo y Dictamen Diagnóstico Inmediato */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E3E6EB]">
                                <div className="flex items-center gap-3">
                                  <TrafficLightBadge variant={p.categoria} size="md" />
                                  <span className="text-[13px] font-bold text-[#0E1621]">
                                    {p.conclusion_diagnostica}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-[#5A6573]">
                                  Archivo analítico: {p.archivo}
                                </span>
                              </div>

                              {/* Panel de 3 Columnas: Trayectoria | Algoritmo y KDIGO | Cuidados y Acciones */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[12px]">
                                
                                {/* 1. Trayectoria Analítica (Modo B Interanual) */}
                                <div className="bg-white p-3 rounded-[5px] border border-[#E3E6EB] space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] block">
                                    Trayectoria Interanual (12 Meses)
                                  </span>
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-baseline font-mono whitespace-nowrap">
                                      <span className="text-[#5A6573]">eGFR:</span>
                                      <span className="font-semibold text-[#0E1621] tabular-nums whitespace-nowrap">
                                        {egfrPrevio !== null ? `${egfrPrevio} → ${egfrActual}` : egfrActual} mL/min
                                        {deltaEgfr !== null && (
                                          <span className={`ml-1 text-[11px] whitespace-nowrap ${deltaEgfr < 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}`}>
                                            ({deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono whitespace-nowrap">
                                      <span className="text-[#5A6573]">UACR:</span>
                                      <span className="font-semibold text-[#0E1621] tabular-nums whitespace-nowrap">
                                        {uacrPrevio !== null ? `${uacrPrevio} → ${uacrActual}` : uacrActual} mg/g
                                        {deltaUacr !== null && (
                                          <span className={`ml-1 text-[11px] whitespace-nowrap ${deltaUacr > 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}`}>
                                            (+{deltaUacr})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-baseline font-mono whitespace-nowrap">
                                      <span className="text-[#5A6573]">Creatinina:</span>
                                      <span className="font-semibold text-[#0E1621] tabular-nums whitespace-nowrap">
                                        {p.valores_clave?.creatinina?.actual} mg/dL
                                        <span className="text-[10px] text-[#A16207] ml-1 font-semibold">(Rango normal - ¡Engañoso!)</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. Criterio Algorítmico y Vector KDIGO */}
                                <div className="bg-white p-3 rounded-[5px] border border-[#E3E6EB] space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] block">
                                    Disparador y Vector de Riesgo
                                  </span>
                                  <p className="text-[11px] text-[#0E1621] leading-relaxed">
                                    <strong>Causa de Alerta:</strong> {p.disparador_principal}
                                  </p>
                                  <div className="pt-1 flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDEFE6] text-[#C2410C] border border-[#F4D0BD] font-bold whitespace-nowrap">
                                      Migración G1-A1 → G2-A2
                                    </span>
                                    <span className="text-[11px] text-[#5A6573] whitespace-nowrap">
                                      PAS: {p.valores_clave?.pas?.actual} mmHg
                                    </span>
                                  </div>
                                </div>

                                {/* 3. Cuidar al Paciente: Recomendaciones y Hoja de Impresión en 1 Clic */}
                                <div className="bg-white p-3 rounded-[5px] border border-[#CBD0D8] flex flex-col justify-between gap-2.5 shadow-xs">
                                  <div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#1D3B6B] mb-1">
                                      <Heart className="w-3.5 h-3.5 text-[#C2410C]" />
                                      <span>Cuidar al Paciente (Pauta AP)</span>
                                    </div>
                                    <ul className="text-[11px] text-[#0E1621] space-y-1">
                                      <li className="flex items-center gap-1.5">
                                        <Pill className="w-3 h-3 text-[#1D3B6B] shrink-0" />
                                        <span><strong>Iniciar iSGLT2:</strong> 10 mg/día para proteger filtrado</span>
                                      </li>
                                      <li className="flex items-center gap-1.5 text-[#842A06]">
                                        <AlertTriangle className="w-3 h-3 text-[#C2410C] shrink-0" />
                                        <span><strong>Prohibir AINEs:</strong> Riesgo de daño renal agudo</span>
                                      </li>
                                      <li className="flex items-center gap-1.5 text-[#5A6573]">
                                        <Calendar className="w-3 h-3 text-[#1F7A55] shrink-0" />
                                        <span><strong>Control 60d:</strong> Repetir UACR con enfermería</span>
                                      </li>
                                    </ul>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setCarePlanPatient(p)}
                                      className="flex-1 px-2.5 py-1.5 rounded-[4px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[11px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                                      title="Generar hoja de cuidados para entregar al paciente en mano"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      <span>Hoja para el Paciente</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onSelectPatient(p)}
                                      className="px-2.5 py-1.5 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[#1D3B6B] text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                      title="Abrir panel lateral completo con 4 gráficos de 2ª opinión"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>2ª Opinión</span>
                                    </button>
                                  </div>
                                </div>

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
