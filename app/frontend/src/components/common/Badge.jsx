// src/components/common/Badge.jsx
import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle, EyeOff } from 'lucide-react';

export const Badge = ({ variant = 'default', children, showIcon = true, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const variantStyles = {
    // Alerta de riesgo oculto / deterioro silente (Prioridad máxima en AP)
    OCULTO: {
      container: 'bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-200/50',
      dot: 'bg-rose-500 animate-pulse',
      icon: <EyeOff className="w-3.5 h-3.5 text-rose-600 mr-1 shrink-0" />,
      label: 'Riesgo Oculto Silente',
    },
    // Alto riesgo evidente
    ALTO: {
      container: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 mr-1 shrink-0" />,
      label: 'Alto Riesgo',
    },
    // Riesgo intermedio / limítrofe
    MEDIO: {
      container: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />,
      label: 'Riesgo Moderado',
    },
    // Controlado / sin alerta
    CONTROLADO: {
      container: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />,
      label: 'Control Óptimo',
    },
    default: {
      container: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: null,
      label: 'Normal',
    },
  };

  const current = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors ${sizeClasses[size]} ${current.container}`}
    >
      {showIcon && current.icon}
      <span>{children || current.label}</span>
    </span>
  );
};

export default Badge;
