// src/components/charts/Sparkline.jsx
import React from 'react';

export const Sparkline = ({
  points = [],
  width = 76,
  height = 24,
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

  // Normalizar coordenadas
  const coords = validPoints.map((val, idx) => {
    const x = paddingX + (idx / (validPoints.length - 1)) * usableWidth;
    const y = paddingY + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y, val };
  });

  // Generar curva suavizada o línea limpia con stroke 2px
  let pathD = '';
  if (coords.length === 2) {
    // Si son dos puntos, trazar línea limpia directa
    pathD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  } else {
    pathD = coords.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  }

  const lastPt = coords[coords.length - 1];

  // Paleta clínica sobria
  let strokeColor = '#94A3B8'; // Slate 400
  let dotColor = '#64748B';

  if (isSilent) {
    strokeColor = '#C2410C'; // Alerta silente naranja
    dotColor = '#C2410C';
  } else if (isCritical) {
    strokeColor = '#E11D48'; // Rose 600
    dotColor = '#E11D48';
  } else if (isFavorable) {
    strokeColor = '#059669'; // Emerald 600
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
      {/* Línea de trayectoria suavizada con stroke de 2px */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
