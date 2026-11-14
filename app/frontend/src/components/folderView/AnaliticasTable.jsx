// src/components/folderView/AnaliticasTable.jsx
import React, { useState } from 'react';
import { Search, Filter, Eye, ChevronRight, ArrowUpDown, Clock } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const AnaliticasTable = ({ patients = [], onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('TODOS');

  // Filtrado de pacientes
  const filteredPatients = patients.filter((p) => {
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Pestañas de Filtro Rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'TODOS', label: 'Todos los Pacientes', count: patients.length },
            { id: 'OCULTO', label: 'Riesgo Oculto Silente', count: patients.filter((p) => p.categoria === 'OCULTO').length, highlight: true },
            { id: 'ALTO', label: 'Alto Riesgo', count: patients.filter((p) => p.categoria === 'ALTO').length },
            { id: 'MEDIO', label: 'Moderado', count: patients.filter((p) => p.categoria === 'MEDIO').length },
            { id: 'CONTROLADO', label: 'Bajo Control', count: patients.filter((p) => p.categoria === 'CONTROLADO').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedFilter === tab.id
                  ? tab.highlight
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Campo de Búsqueda */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, ID o archivo..."
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

      </div>

      {/* Tabla Clínica */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Paciente / ID</th>
              <th className="py-3 px-3">Modo / Archivo</th>
              <th className="py-3 px-3 text-right">eGFR (mL/min)</th>
              <th className="py-3 px-3 text-right">UACR (mg/g)</th>
              <th className="py-3 px-3 text-right">LDL (mg/dL)</th>
              <th className="py-3 px-4">Estratificación</th>
              <th className="py-3 px-4 min-w-[240px]">Disparador Principal de Riesgo</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-10 text-center text-slate-400">
                  No se encontraron pacientes con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredPatients.map((p) => {
                const isSilent = p.categoria === 'OCULTO';
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSilent ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Paciente */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-semibold text-slate-900">{p.nombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.id} • {p.edad}a • {p.sexo}
                      </div>
                    </td>

                    {/* Modo / Archivo */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                          p.tiene_progresion
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {p.tiene_progresion ? 'Modo B (Δ 12m)' : 'Modo A'}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={p.archivo}>
                        {p.archivo}
                      </div>
                    </td>

                    {/* eGFR */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className="font-bold text-slate-800">
                        {p.valores_clave?.egfr?.actual || '—'}
                      </span>
                      {p.valores_clave?.egfr?.delta !== null && p.valores_clave?.egfr?.delta !== undefined && (
                        <span
                          className={`ml-1 text-[11px] font-semibold ${
                            p.valores_clave.egfr.delta < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ({p.valores_clave.egfr.delta > 0 ? `+${p.valores_clave.egfr.delta}` : p.valores_clave.egfr.delta})
                        </span>
                      )}
                    </td>

                    {/* UACR */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className="font-bold text-slate-800">
                        {p.valores_clave?.uacr?.actual || '—'}
                      </span>
                      {p.valores_clave?.uacr?.delta !== null && p.valores_clave?.uacr?.delta !== undefined && (
                        <span
                          className={`ml-1 text-[11px] font-semibold ${
                            p.valores_clave.uacr.delta > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ({p.valores_clave.uacr.delta > 0 ? `+${p.valores_clave.uacr.delta}` : p.valores_clave.uacr.delta})
                        </span>
                      )}
                    </td>

                    {/* LDL */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className="font-bold text-slate-800">
                        {p.valores_clave?.ldl?.actual || '—'}
                      </span>
                    </td>

                    {/* Estratificación */}
                    <td className="py-3.5 px-4">
                      <Badge variant={p.categoria} size="sm" />
                    </td>

                    {/* Disparador */}
                    <td className="py-3.5 px-4 text-slate-600 leading-snug">
                      <span className="line-clamp-2" title={p.disparador_principal}>
                        {p.disparador_principal}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant={isSilent ? 'danger' : 'secondary'}
                        size="sm"
                        icon={Eye}
                        onClick={() => onSelectPatient(p)}
                      >
                        Ver Detalle
                      </Button>
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

export default AnaliticasTable;
