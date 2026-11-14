// src/components/folderView/PatientTable.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { Sparkline } from '../charts/Sparkline';

export const PatientTable = ({ patients = [], onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('TODOS');
  const [focusedIndex, setFocusedIndex] = useState(0);
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

  // Ordenación clínica estricta por defecto:
  // 1. Riesgo oculto silencioso (protagonista)
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

  // Manejo de navegación por teclado: flechas arriba/abajo y Enter
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
      if (current) onSelectPatient(current);
    }
  };

  return (
    <div
      ref={tableRef}
      onKeyDown={handleTableKeyDown}
      tabIndex={0}
      className="bg-white rounded-[6px] border border-[#E3E6EB] overflow-hidden focus:outline-none"
    >
      {/* Barra de Filtros y Buscador */}
      <div className="px-4 py-3 border-b border-[#E3E6EB] bg-[#F6F7F9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de Filtro Clínico */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {[
            { id: 'TODOS', label: 'Todos', count: patients.length },
            { id: 'OCULTO', label: 'Riesgo oculto silencioso', count: patients.filter((p) => p.categoria === 'OCULTO').length, isSilent: true },
            { id: 'ALTO', label: 'Alto riesgo', count: patients.filter((p) => p.categoria === 'ALTO').length },
            { id: 'MEDIO', label: 'Moderado', count: patients.filter((p) => p.categoria === 'MEDIO').length },
            { id: 'CONTROLADO', label: 'Control óptimo', count: patients.filter((p) => p.categoria === 'CONTROLADO').length },
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
                className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? tab.isSilent
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-[#1D3B6B] text-white'
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

        {/* Buscador con atajo "/" */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8A94A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setFocusedIndex(0);
            }}
            placeholder="Buscar por paciente o archivo... (Pulsa /)"
            className="w-full text-[12px] pl-9 pr-8 py-1.5 rounded-[4px] border border-[#CBD0D8] bg-white text-[#0E1621] placeholder-[#8A94A3] focus:border-[#1D3B6B] focus:outline-none"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8A94A3] bg-[#F0F2F5] px-1.5 py-0.5 rounded border border-[#E3E6EB]">
            /
          </kbd>
        </div>
      </div>

      {/* Tabla Clínica de Pacientes */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E3E6EB] bg-[#F6F7F9] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
              <th className="py-2.5 px-4">Paciente / ID</th>
              <th className="py-2.5 px-3">Modo</th>
              <th className="py-2.5 px-3 text-right">eGFR (mL/min)</th>
              <th className="py-2.5 px-3 text-right">UACR (mg/g)</th>
              <th className="py-2.5 px-3 text-right">LDL (mg/dL)</th>
              <th className="py-2.5 px-3 text-center">Tendencia (12m)</th>
              <th className="py-2.5 px-4">Estratificación</th>
              <th className="py-2.5 px-4 min-w-[260px]">Disparador Principal</th>
              <th className="py-2.5 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E6EB] text-[13px]">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-[13px] text-[#5A6573]">
                  No se encontraron pacientes con los criterios indicados.
                </td>
              </tr>
            ) : (
              filteredPatients.map((p, idx) => {
                const isSelectedRow = focusedIndex === idx;
                const isSilent = p.categoria === 'OCULTO';
                const isCrit = p.categoria === 'ALTO';

                // Datos de laboratorio
                const egfrActual = p.valores_clave?.egfr?.actual;
                const egfrPrevio = p.valores_clave?.egfr?.previo;
                const deltaEgfr = p.valores_clave?.egfr?.delta;

                const uacrActual = p.valores_clave?.uacr?.actual;
                const deltaUacr = p.valores_clave?.uacr?.delta;

                const ldlActual = p.valores_clave?.ldl?.actual;

                // Array de puntos para el sparkline (T-1 vs T)
                const sparkPoints = egfrPrevio !== null && egfrPrevio !== undefined
                  ? [egfrPrevio, egfrActual]
                  : [egfrActual, egfrActual];

                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setFocusedIndex(idx);
                      onSelectPatient(p);
                    }}
                    className={`h-[52px] cursor-pointer transition-colors ${
                      isSelectedRow ? 'bg-[#F0F2F5]' : 'hover:bg-[#F6F7F9]'
                    } ${isSilent ? 'bg-[#FDEFE6]/30' : ''}`}
                  >
                    {/* Paciente / ID */}
                    <td className="py-2 px-4">
                      <div className="font-semibold text-[#0E1621] leading-tight">
                        {p.nombre}
                      </div>
                      <div className="text-[11px] font-mono text-[#5A6573] mt-0.5">
                        {p.id} • {p.edad}a • {p.sexo}
                      </div>
                    </td>

                    {/* Modo */}
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] border ${
                        p.tiene_progresion
                          ? 'bg-[#E8EEF7] text-[#1D3B6B] border-[#CBD0D8] font-semibold'
                          : 'bg-[#F0F2F5] text-[#5A6573] border-[#E3E6EB]'
                      }`}>
                        {p.tiene_progresion ? 'Modo B (Δ 12m)' : 'Modo A'}
                      </span>
                    </td>

                    {/* eGFR (valor + delta) */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className="font-semibold text-[#0E1621]">
                        {egfrActual}
                      </span>
                      {deltaEgfr !== null && deltaEgfr !== undefined && (
                        <span
                          className={`ml-1 text-[11px] font-medium ${
                            deltaEgfr < -5 ? 'text-[#C2410C]' : 'text-[#1F7A55]'
                          }`}
                          title={`Delta: ${deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr} mL/min`}
                        >
                          ({deltaEgfr > 0 ? `+${deltaEgfr}` : deltaEgfr})
                        </span>
                      )}
                    </td>

                    {/* UACR (valor + delta) */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className="font-semibold text-[#0E1621]">
                        {uacrActual}
                      </span>
                      {deltaUacr !== null && deltaUacr !== undefined && (
                        <span
                          className={`ml-1 text-[11px] font-medium ${
                            deltaUacr > 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'
                          }`}
                          title={`Delta: ${deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr} mg/g`}
                        >
                          ({deltaUacr > 0 ? `+${deltaUacr}` : deltaUacr})
                        </span>
                      )}
                    </td>

                    {/* LDL */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#0E1621]">
                      {ldlActual}
                    </td>

                    {/* Tendencia (Sparkline eGFR) */}
                    <td className="py-2 px-3 text-center">
                      <Sparkline
                        points={sparkPoints}
                        isSilent={isSilent}
                        isCritical={isCrit}
                        isFavorable={deltaEgfr !== null && deltaEgfr >= 0}
                        ariaLabel={`Trayectoria eGFR: ${sparkPoints.join(' a ')} mL/min`}
                      />
                    </td>

                    {/* Estratificación (Badge de punto) */}
                    <td className="py-2 px-4">
                      <RiskBadge variant={p.categoria} />
                    </td>

                    {/* Disparador Principal (frase completa sin truncar con ...) */}
                    <td className="py-2 px-4 text-[12px] text-[#5A6573] leading-snug">
                      {p.disparador_principal}
                    </td>

                    {/* Acción */}
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPatient(p);
                        }}
                        className={`px-3 py-1 rounded-[4px] text-[12px] font-medium border transition-colors inline-flex items-center gap-1 ${
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(PatientTable);
