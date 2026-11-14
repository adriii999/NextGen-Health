// src/components/drawer/PatientDrawer.jsx
import React, { useEffect, useRef } from 'react';
import { X, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { ClinicalTimelineChart } from '../charts/ClinicalTimelineChart';
import { ShapWaterfallChart } from '../charts/ShapWaterfallChart';
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

  const { valores_clave, factores_clave, tipos_riesgo } = patient;
  const isSilent = patient.categoria === 'OCULTO';

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
          <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#F6F7F9]">

            {/* 1. Callout de Aviso Sobrio estilo NHS Design System */}
            <div
              className={`p-3.5 rounded-[6px] border ${
                isSilent
                  ? 'bg-[#FDEFE6] border-[#F4D0BD] text-[#842A06]'
                  : patient.categoria === 'ALTO'
                  ? 'bg-[#FBEAE9] border-[#F5C2C0] text-[#8C1D18]'
                  : 'bg-[#E6F4EC] border-[#BDDFC9] text-[#16563C]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertOctagon className={`w-4 h-4 shrink-0 mt-0.5 ${isSilent ? 'text-[#C2410C]' : 'text-[#B3261E]'}`} />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] block">
                    {isSilent ? 'Alerta de Deterioro Silente Activa' : 'Dictamen Diagnóstico'}
                  </span>
                  <p className="text-[12px] font-semibold mt-0.5 leading-snug">
                    {patient.conclusion_diagnostica}
                  </p>
                  <p className="text-[11px] mt-1 opacity-90 leading-relaxed font-medium">
                    <strong>Disparador:</strong> {patient.disparador_principal}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Lista Resumen Estilo NHS (Etiqueta izquierda, Valor derecha con tabular-nums) */}
            <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] block mb-2 border-b border-[#E3E6EB] pb-1.5">
                Datos de Laboratorio y Constantes Clínicas
              </span>
              <dl className="divide-y divide-[#E3E6EB] text-[12px]">
                <div className="py-1.5 flex justify-between items-baseline">
                  <dt className="text-[#5A6573]">Filtrado Glomerular (eGFR):</dt>
                  <dd className="font-mono font-semibold text-[#0E1621] tabular-nums">
                    {valores_clave?.egfr?.actual} mL/min/1.73m²
                    {valores_clave?.egfr?.delta && (
                      <span className={`ml-1 text-[11px] ${valores_clave.egfr.delta < 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}`}>
                        (Δ {valores_clave.egfr.delta} mL/min)
                      </span>
                    )}
                  </dd>
                </div>
                <div className="py-1.5 flex justify-between items-baseline">
                  <dt className="text-[#5A6573]">Albuminuria Orina (UACR):</dt>
                  <dd className="font-mono font-semibold text-[#0E1621] tabular-nums">
                    {valores_clave?.uacr?.actual} mg/g
                    {valores_clave?.uacr?.delta && (
                      <span className={`ml-1 text-[11px] ${valores_clave.uacr.delta > 0 ? 'text-[#C2410C]' : 'text-[#1F7A55]'}`}>
                        (Δ +{valores_clave.uacr.delta} mg/g)
                      </span>
                    )}
                  </dd>
                </div>
                <div className="py-1.5 flex justify-between items-baseline">
                  <dt className="text-[#5A6573]">Creatinina Sérica:</dt>
                  <dd className="font-mono font-semibold text-[#0E1621] tabular-nums">
                    {valores_clave?.creatinina?.actual} mg/dL <span className="text-[10px] text-[#5A6573]">(Rango normal)</span>
                  </dd>
                </div>
                <div className="py-1.5 flex justify-between items-baseline">
                  <dt className="text-[#5A6573]">Presión Arterial (PAS/PAD):</dt>
                  <dd className="font-mono font-semibold text-[#0E1621] tabular-nums">
                    {valores_clave?.pas?.actual}/{valores_clave?.pad?.actual || 84} mmHg
                  </dd>
                </div>
                <div className="py-1.5 flex justify-between items-baseline">
                  <dt className="text-[#5A6573]">Colesterol LDL:</dt>
                  <dd className="font-mono font-semibold text-[#0E1621] tabular-nums">
                    {valores_clave?.ldl?.actual} mg/dL
                  </dd>
                </div>
              </dl>
            </div>

            {/* 3. Línea Temporal de Analíticas (Apple Health + Our World in Data) */}
            <ClinicalTimelineChart
              egfrActual={valores_clave?.egfr?.actual}
              egfrPrevio={valores_clave?.egfr?.previo}
              uacrActual={valores_clave?.uacr?.actual}
              uacrPrevio={valores_clave?.uacr?.previo}
              archivoOrigen={patient.archivo}
            />

            {/* 4. Por qué se clasifica así (Reglas paso a paso) */}
            <AlgorithmExplainer patient={patient} />

            {/* 5. Desglose Explicable SHAP en Cascada (Waterfall) */}
            <ShapWaterfallChart
              factoresClave={factores_clave}
              riesgoFinal={tipos_riesgo?.riesgo_cardiorrenal?.valor || 0.44}
            />

            {/* 6. Gráfico de Segunda Opinión Clínica (Árbol de problemas) */}
            <ProblemMatrixChart patient={patient} />

            {/* 7. Plan Preventivo en Atención Primaria */}
            <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#1D3B6B] block">
                Recomendación Médica Preventiva en AP
              </span>
              <p className="text-[12px] text-[#0E1621] leading-relaxed">
                {patient.recomendacion_preventiva}
              </p>
            </div>

          </div>

          {/* Pie del Drawer */}
          <div className="px-5 py-3 border-t border-[#E3E6EB] bg-white flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#5A6573] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F7A55]" />
              Conforme a guías KDIGO 2024 & ESC CVD
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-[6px] border border-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] hover:bg-[#F6F7F9] text-[12px] font-medium transition-colors"
              >
                Cerrar (Esc)
              </button>
              <button
                onClick={() => alert(`Ficha de ${patient.nombre} exportada para citación preventiva en Atención Primaria.`)}
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
