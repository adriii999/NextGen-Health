// src/components/common/CommandMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, EyeOff, AlertTriangle, Users, X } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

export const CommandMenu = ({
  isOpen,
  onClose,
  patients = [],
  onSelectPatient,
  onAnalyzeFolder,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true); // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtrado de pacientes según la consulta
  const filtered = patients.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.archivo?.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const patient = filtered[selectedIndex];
      if (patient) {
        onSelectPatient(patient);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0E1621]/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div
        className="w-full max-w-xl bg-white rounded-[6px] border border-[#CBD0D8] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Input de Búsqueda */}
        <div className="flex items-center px-4 border-b border-[#E3E6EB] bg-[#F6F7F9]">
          <Search className="w-4 h-4 text-[#5A6573] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe el nombre del paciente, ID o acción clínica..."
            className="w-full px-3 py-3 text-[13px] text-[#0E1621] bg-transparent focus:outline-none placeholder-[#8A94A3]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8A94A3] hover:text-[#0E1621]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Acciones Rápidas */}
        {!query && (
          <div className="p-3 border-b border-[#E3E6EB] bg-white">
            <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8A94A3] block mb-2 px-2">
              Acciones Rápidas
            </span>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <button
                onClick={() => {
                  onAnalyzeFolder();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-[4px] hover:bg-[#F0F2F5] text-[#1D3B6B] font-medium text-left border border-[#E3E6EB]"
              >
                <Play className="w-3.5 h-3.5 fill-[#1D3B6B]" />
                <span>Analizar carpeta en 1 clic</span>
              </button>
              <button
                onClick={() => {
                  const firstSilent = patients.find((p) => p.categoria === 'OCULTO');
                  if (firstSilent) onSelectPatient(firstSilent);
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-[4px] hover:bg-[#FDEFE6] text-[#C2410C] font-medium text-left border border-[#F4D0BD]"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ir al caso silente (Manuel S. R.)</span>
              </button>
            </div>
          </div>
        )}

        {/* Lista de Resultados de Pacientes */}
        <div className="max-h-72 overflow-y-auto divide-y divide-[#E3E6EB]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-[#5A6573]">
              No se encontraron coincidencias para "{query}".
            </div>
          ) : (
            filtered.map((p, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPatient(p);
                    onClose();
                  }}
                  className={`p-3 cursor-pointer flex items-center justify-between text-[12px] transition-colors ${
                    isSelected ? 'bg-[#F0F2F5]' : 'hover:bg-[#F6F7F9]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[#0E1621]">{p.nombre}</div>
                    <div className="text-[11px] font-mono text-[#5A6573]">
                      {p.id} • eGFR: {p.valores_clave?.egfr?.actual} mL/min • UACR: {p.valores_clave?.uacr?.actual} mg/g
                    </div>
                  </div>
                  <RiskBadge variant={p.categoria} />
                </div>
              );
            })
          )}
        </div>

        {/* Pie con Atajos */}
        <div className="px-4 py-2 bg-[#F6F7F9] border-t border-[#E3E6EB] text-[10px] text-[#8A94A3] flex items-center justify-between font-mono">
          <span>↑↓ para navegar • Enter para abrir</span>
          <span>Esc para cerrar</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CommandMenu);
