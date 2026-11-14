// src/components/charts/Sparkline.jsx
import React from 'react';

export const Sparkline = ({
  points = [],
  width = 72,
  height = 22,
  isSilent = false,
  isCritical = false,
  isFavorable = false,
  ariaLabel = 'Tendencia temporal',
}) => {
  // Asegurar al menos 2 puntos válidos
  const validPoints = points.length >= 2 ? points : [points[0] || 75, points[0] || 75];
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;

  const paddingY = 4;
  const paddingX = 4;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // Normalizar coordenadas (eje Y invertido en SVG: 0 arriba)
  const coords = validPoints.map((val, idx) => {
    const x = paddingX + (idx / (validPoints.length - 1)) * usableWidth;
    const y = paddingY + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y, val };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const lastPt = coords[coords.length - 1];

  // Reglas de color según el sistema de diseño clínico:
  let strokeColor = '#8A94A3'; // neutral faint
  let dotColor = '#5A6573';

  if (isSilent) {
    strokeColor = '#C2410C'; // --silent
    dotColor = '#C2410C';
  } else if (isCritical) {
    strokeColor = '#B3261E'; // --crit
    dotColor = '#B3261E';
  } else if (isFavorable) {
    strokeColor = '#1F7A55'; // --ok
    dotColor = '#1F7A55';
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
      {/* Línea de trayectoria */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Punto final resaltado */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r={2.5}
        fill={dotColor}
      />
    </svg>
  );
};

export default React.memo(Sparkline);
