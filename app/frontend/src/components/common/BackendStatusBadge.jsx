// src/components/common/BackendStatusBadge.jsx
import React from 'react';

export const BackendStatusBadge = ({ online = false, modeloCargado = false }) => {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-[#E3E6EB] bg-[#F6F7F9] text-[11px] font-medium text-[#5A6573] cursor-help"
      title={
        online
          ? `FastAPI activo en puerto 8000. ${modeloCargado ? 'Modelo ML XGBoost cargado.' : 'Pendiente artefacto ML.'}`
          : 'Backend FastAPI no detectado en localhost:8000. Operando en Modo Autónomo Local.'
      }
    >
      <span
        className={`w-2 h-2 rounded-full ${
          online ? 'bg-[#1F7A55]' : 'bg-[#A16207]'
        }`}
        aria-hidden="true"
      />
      <span className="font-mono text-[#0E1621]">
        FastAPI: {online ? 'Online' : 'Local'}
      </span>
    </div>
  );
};

export default React.memo(BackendStatusBadge);
