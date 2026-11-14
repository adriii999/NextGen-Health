// src/components/common/TrafficLightBadge.jsx
import React from 'react';

export const TrafficLightBadge = ({ variant = 'CONTROLADO', size = 'md' }) => {
  const configs = {
    OCULTO: {
      light: 'amber',
      label: 'Ámbar: Deterioro Silente Oculto',
      shortLabel: 'Alerta Silente',
      action: 'Actuar en AP: Trampa de creatinina normal con caída de filtrado',
      bgColor: 'bg-[#FDEFE6]',
      borderColor: 'border-[#F4D0BD]',
      textColor: 'text-[#842A06]',
      dotAmber: 'bg-[#C2410C] ring-2 ring-[#C2410C]/30 shadow-xs animate-pulse',
      dotRed: 'bg-[#E3E6EB]',
      dotGreen: 'bg-[#E3E6EB]',
    },
    ALTO: {
      light: 'red',
      label: 'Rojo: Alto Riesgo Inmediato',
      shortLabel: 'Riesgo Alto',
      action: 'Intervención inmediata: Tensión o dislipidemia descompensadas',
      bgColor: 'bg-[#FBEAE9]',
      borderColor: 'border-[#F5C2C0]',
      textColor: 'text-[#8C1D18]',
      dotRed: 'bg-[#B3261E] ring-2 ring-[#B3261E]/30 shadow-xs animate-pulse',
      dotAmber: 'bg-[#E3E6EB]',
      dotGreen: 'bg-[#E3E6EB]',
    },
    MEDIO: {
      light: 'yellow',
      label: 'Amarillo: Riesgo Moderado',
      shortLabel: 'Seguimiento',
      action: 'Vigilar evolución: Parámetros subóptimos sin progresión documentada',
      bgColor: 'bg-[#FBF3DD]',
      borderColor: 'border-[#F2DFAC]',
      textColor: 'text-[#714405]',
      dotAmber: 'bg-[#A16207] ring-2 ring-[#A16207]/20',
      dotRed: 'bg-[#E3E6EB]',
      dotGreen: 'bg-[#E3E6EB]',
    },
    CONTROLADO: {
      light: 'green',
      label: 'Verde: Control Óptimo',
      shortLabel: 'Estable',
      action: 'Protegido: Parámetros renales y cardiovasculares en rango seguro',
      bgColor: 'bg-[#E6F4EC]',
      borderColor: 'border-[#BDDFC9]',
      textColor: 'text-[#16563C]',
      dotGreen: 'bg-[#1F7A55] ring-2 ring-[#1F7A55]/30',
      dotRed: 'bg-[#E3E6EB]',
      dotAmber: 'bg-[#E3E6EB]',
    },
  };

  const c = configs[variant] || configs.CONTROLADO;
  const isMini = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[5px] border ${c.bgColor} ${c.borderColor} ${c.textColor} transition-all`}
      title={c.action}
    >
      {/* Cápsula visual del semáforo con 3 luces */}
      <div className="flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded-[4px] border border-black/5 shrink-0">
        <span className={`w-2 h-2 rounded-full ${c.dotRed}`} title="Luz Roja" />
        <span className={`w-2 h-2 rounded-full ${c.dotAmber}`} title="Luz Ámbar" />
        <span className={`w-2 h-2 rounded-full ${c.dotGreen}`} title="Luz Verde" />
      </div>

      <span className={`font-semibold tracking-tight whitespace-nowrap ${isMini ? 'text-[11px]' : 'text-[12px]'}`}>
        {isMini ? c.shortLabel : c.label}
      </span>
    </div>
  );
};

export default TrafficLightBadge;
