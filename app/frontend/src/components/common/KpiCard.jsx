// src/components/common/KpiCard.jsx
import React from 'react';

export const KpiCard = ({
  label,
  value,
  context,
  isHero = false, // True para la tarjeta de Riesgo Oculto Silencioso
  colSpan = 'col-span-1',
}) => {
  if (isHero) {
    return (
      <div
        className={`bg-white rounded-[6px] border border-[#E3E6EB] border-l-[3px] border-l-[#C2410C] p-4 flex flex-col justify-between ${colSpan}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#C2410C]">
            {label}
          </span>
          <span className="text-[11px] font-medium text-[#C2410C] bg-[#FDEFE6] px-2 py-0.5 rounded-[4px] border border-[#F4D0BD]">
            Prioridad AP
          </span>
        </div>
        <div className="my-2">
          <span className="text-[28px] font-semibold text-[#0E1621] tabular-nums leading-none">
            {value}
          </span>
        </div>
        <p className="text-[12px] text-[#5A6573] leading-snug">
          {context}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-[6px] border border-[#E3E6EB] p-4 flex flex-col justify-between ${colSpan}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573]">
        {label}
      </span>
      <div className="my-2">
        <span className="text-[28px] font-semibold text-[#0E1621] tabular-nums leading-none">
          {value}
        </span>
      </div>
      <p className="text-[12px] text-[#5A6573] leading-snug">
        {context}
      </p>
    </div>
  );
};

export default React.memo(KpiCard);
