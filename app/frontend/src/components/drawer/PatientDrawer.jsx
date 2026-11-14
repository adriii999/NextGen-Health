// src/components/drawer/PatientDrawer.jsx
import React, { useEffect, useRef } from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { ClinicalTimelineChart } from '../charts/ClinicalTimelineChart';
import { ProblemMatrixChart } from '../charts/ProblemMatrixChart';
import { AlgorithmExplainer } from './AlgorithmExplainer';

export const PatientDrawer = ({ patient, onClose }) => {
  const drawerRef = useRef(null);

  // Manejo de tecla ESC para cerrar el drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!patient) return null;

  const { valores_clave } = patient;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop sutil con clic para cerrar */}
      <div
        className="absolute inset-0 bg-[#0E1621]/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-[540px] bg-white border-l border-[#E3E6EB] shadow-lg flex flex-col drawer-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          {/* Cabecera del Drawer */}
          <div className="px-5 py-4 border-b border-[#E3E6EB] bg-[#F6F7F9] flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 id="drawer-title" className="text-[16px] font-semibold text-[#0E1621]">
                  {patient.nombre}
                </h3>
                <span className="font-mono text-[11px] text-[#5A6573] bg-white px-2 py-0.5 rounded-[4px] border border-[#E3E6EB]">
                  {patient.id}
                </span>
                <RiskBadge variant={patient.categoria} />
              </div>
              <p className="text-[12px] text-[#5A6573] mt-0.5">
                {patient.edad} años • {patient.sexo} • {patient.tiene_progresion ? 'Modo B (Trayectoria interanual)' : 'Modo A (Analítica aislada)'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#5A6573] hover:text-[#0E1621] hover:bg-[#E3E6EB] transition-colors"
              aria-label="Cerrar panel de detalle (Esc)"
              title="Cerrar panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo con Scroll */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#F6F7F9]">

            {/* 1. Resumen de Valores Analíticos */}
            <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] block">
                Resumen de Laboratorio (Valores Numéricos Tabulares)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">eGFR actual:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.egfr?.actual} <span className="text-[10px] text-[#5A6573]">mL/min</span>
                  </span>
                </div>
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">UACR orina:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.uacr?.actual} <span className="text-[10px] text-[#5A6573]">mg/g</span>
                  </span>
                </div>
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">Creatinina:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.creatinina?.actual} <span className="text-[10px] text-[#5A6573]">mg/dL</span>
                  </span>
                </div>
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">Presión PAS:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.pas?.actual} <span className="text-[10px] text-[#5A6573]">mmHg</span>
                  </span>
                </div>
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">Colesterol LDL:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.ldl?.actual} <span className="text-[10px] text-[#5A6573]">mg/dL</span>
                  </span>
                </div>
                <div className="p-2 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB]">
                  <span className="text-[10px] text-[#5A6573] block">HbA1c:</span>
                  <span className="font-mono font-semibold text-[13px] text-[#0E1621]">
                    {valores_clave?.hba1c?.actual || '5.4'} <span className="text-[10px] text-[#5A6573]">%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Línea Temporal de Analíticas (eGFR y UACR) */}
            <ClinicalTimelineChart
              egfrActual={valores_clave?.egfr?.actual}
              egfrPrevio={valores_clave?.egfr?.previo}
              uacrActual={valores_clave?.uacr?.actual}
              uacrPrevio={valores_clave?.uacr?.previo}
            />

            {/* 3. Por qué se clasifica así (Reglas del algoritmo paso a paso) */}
            <AlgorithmExplainer patient={patient} />

            {/* 4. Gráfico de Segunda Opinión Clínica (Árbol de problemas) */}
            <ProblemMatrixChart patient={patient} />

            {/* 5. Acciones Sugeridas en Atención Primaria */}
            <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#1D3B6B] block">
                Plan Terapéutico y Preventivo en AP
              </span>
              <p className="text-[12px] text-[#0E1621] leading-relaxed">
                {patient.recomendacion_preventiva}
              </p>
            </div>

            {/* 6. Datos del Archivo Origen */}
            <div className="text-[11px] text-[#5A6573] bg-white p-3 rounded-[6px] border border-[#E3E6EB]">
              Archivo origen: <span className="font-mono text-[#0E1621] font-medium">{patient.archivo}</span>
            </div>

          </div>

          {/* Pie del Drawer */}
          <div className="px-5 py-3 border-t border-[#E3E6EB] bg-white flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#5A6573] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F7A55]" />
              Conforme con Guías Clínicas KDIGO 2024
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-[6px] border border-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] hover:bg-[#F6F7F9] text-[12px] font-medium transition-colors"
              >
                Cerrar (Esc)
              </button>
              <button
                onClick={() => alert(`Ficha de ${patient.nombre} lista para interconsulta en Atención Primaria.`)}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[12px] font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Exportar Informe AP</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default React.memo(PatientDrawer);
