// src/components/common/RiskBadge.jsx
import React from 'react';

export const RiskBadge = ({ variant = 'CONTROLADO', label = null }) => {
  const configs = {
    OCULTO: {
      dotColor: 'bg-[#C2410C]',
      textColor: 'text-[#842A06]',
      bgColor: 'bg-[#FDEFE6]',
      borderColor: 'border-[#F4D0BD]',
      defaultLabel: 'Riesgo oculto silencioso',
    },
    ALTO: {
      dotColor: 'bg-[#B3261E]',
      textColor: 'text-[#8C1D18]',
      bgColor: 'bg-[#FBEAE9]',
      borderColor: 'border-[#F5C2C0]',
      defaultLabel: 'Alto riesgo',
    },
    MEDIO: {
      dotColor: 'bg-[#A16207]',
      textColor: 'text-[#714405]',
      bgColor: 'bg-[#FBF3DD]',
      borderColor: 'border-[#F2DFAC]',
      defaultLabel: 'Riesgo moderado',
    },
    CONTROLADO: {
      dotColor: 'bg-[#1F7A55]',
      textColor: 'text-[#16563C]',
      bgColor: 'bg-[#E6F4EC]',
      borderColor: 'border-[#BDDFC9]',
      defaultLabel: 'Control óptimo',
    },
  };

  const config = configs[variant] || configs.CONTROLADO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[12px] font-medium whitespace-nowrap ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotColor}`} aria-hidden="true" />
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};

export default RiskBadge;
