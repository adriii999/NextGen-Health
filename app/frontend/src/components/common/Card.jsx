// src/components/common/Card.jsx
import React from 'react';

export const Card = ({
  children,
  className = '',
  title = null,
  subtitle = null,
  headerAction = null,
  footer = null,
  padding = 'p-5',
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50/60 rounded-b-xl border-t border-slate-100 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
