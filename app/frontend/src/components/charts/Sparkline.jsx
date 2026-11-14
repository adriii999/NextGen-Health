// src/components/charts/Sparkline.jsx
import React, { useId } from 'react';

export const Sparkline = ({
  points = [],
  width = 76,
  height = 24,
  isSilent = false,
  isCritical = false,
  isFavorable = false,
  ariaLabel = 'Tendencia temporal',
}) => {
  const gradientId = useId();

  // Asegurar al menos 2 puntos válidos
  const validPoints = points.length >= 2 ? points : [points[0] || 75, points[0] || 75];
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;

  const paddingY = 4;
  const paddingX = 4;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // Normalizar coordenadas
  const coords = validPoints.map((val, idx) => {
    const x = paddingX + (idx / (validPoints.length - 1)) * usableWidth;
    const y = paddingY + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y, val };
  });

  // Generar curva suavizada o línea limpia con stroke 2px
  let pathD = '';
  if (coords.length === 2) {
    pathD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  } else {
    pathD = coords.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  }

  const firstPt = coords[0];
  const lastPt = coords[coords.length - 1];

  // Determinar si hay cruce crítico de umbral (deterioro progresivo)
  const hasThresholdDrop = (isSilent || isCritical) && coords.length >= 2 && validPoints[0] > validPoints[validPoints.length - 1];

  let strokeColor = '#94A3B8'; // Slate 400
  let dotColor = '#64748B';

  if (hasThresholdDrop) {
    strokeColor = `url(#${gradientId})`;
    dotColor = isCritical ? '#E11D48' : '#C2410C';
  } else if (isSilent) {
    strokeColor = '#C2410C';
    dotColor = '#C2410C';
  } else if (isCritical) {
    strokeColor = '#E11D48';
    dotColor = '#E11D48';
  } else if (isFavorable) {
    strokeColor = '#059669';
    dotColor = '#059669';
  }

  return (
    <svg
      width={width}
      height={height}
      className="inline-block shrink-0 overflow-visible align-middle"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      <defs>
        {/* Gradiente contextual si hay cruce de umbral: verde seguro -> alerta ámbar -> rojo clínico */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor={isCritical ? '#E11D48' : '#C2410C'} />
        </linearGradient>
      </defs>

      {/* Trazo animado a 400ms con cubic-bezier out-expo */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-sparkline"
      />

      {/* Punto inicial tenue si hay cruce de umbral */}
      {hasThresholdDrop && (
        <circle
          cx={firstPt.x}
          cy={firstPt.y}
          r={2}
          fill="#10B981"
          opacity="0.8"
        />
      )}

      {/* Punto final resaltado con borde blanco para alto contraste */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r={3}
        fill={dotColor}
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
    </svg>
  );
};

export default React.memo(Sparkline);
