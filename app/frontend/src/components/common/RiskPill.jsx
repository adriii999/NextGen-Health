// src/components/common/RiskPill.jsx
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export const RiskPill = ({ label, actual, previo, delta, unidad, inversed = false }) => {
  // inversed: true para valores donde SUBIR es MALO (e.g., UACR, LDL, Presión)
  // inversed: false para valores donde BAJAR es MALO (e.g., eGFR, HDL)
  const hasDelta = delta !== null && delta !== undefined;

  let deltaColor = 'text-slate-500 bg-slate-100';
  let DeltaIcon = Minus;

  if (hasDelta) {
    if (delta > 0) {
      DeltaIcon = ArrowUpRight;
      deltaColor = inversed
        ? 'text-rose-700 bg-rose-50 border-rose-200' // Sube UACR -> Malo
        : 'text-emerald-700 bg-emerald-50 border-emerald-200'; // Sube eGFR -> Bueno
    } else if (delta < 0) {
      DeltaIcon = ArrowDownRight;
      deltaColor = !inversed
        ? 'text-rose-700 bg-rose-50 border-rose-200' // Cae eGFR -> Malo
        : 'text-emerald-700 bg-emerald-50 border-emerald-200'; // Baja LDL -> Bueno
    }
  }

  return (
    <div className="flex flex-col bg-slate-50 rounded-lg p-2.5 border border-slate-100">
      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline justify-between mt-1">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-slate-900 tabular-nums">{actual}</span>
          <span className="text-[11px] text-slate-500 font-medium">{unidad}</span>
        </div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded border tabular-nums ${deltaColor}`}
            title={previo !== null ? `Previo: ${previo} ${unidad}` : 'Variación interanual'}
          >
            <DeltaIcon className="w-3 h-3" />
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </div>
  );
};

export default RiskPill;
