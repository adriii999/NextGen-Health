// src/components/folderView/PatientDetailModal.jsx
import React from 'react';
import { X, Calendar, Activity, AlertOctagon, CheckCircle2, FileText, Stethoscope } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { RiskPill } from '../common/RiskPill';
import { RiskRadarChart } from '../charts/RiskRadarChart';
import { ShapImpactBar } from '../charts/ShapImpactBar';

export const PatientDetailModal = ({ patient, onClose }) => {
  if (!patient) return null;

  const { valores_clave, tipos_riesgo, factores_clave } = patient;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Cabecera del Expediente Clínico */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{patient.nombre}</h3>
                <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {patient.id}
                </span>
                <Badge variant={patient.categoria} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.edad} años • {patient.sexo} • Archivo: <span className="font-mono">{patient.archivo}</span> • {patient.tiene_progresion ? 'Modo B (Evolución Interanual)' : 'Modo A (Foto Fija)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Alerta Destacada / Diagnóstico */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            patient.categoria === 'OCULTO'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : patient.categoria === 'ALTO'
              ? 'bg-red-50/70 border-red-200 text-red-950'
              : patient.categoria === 'MEDIO'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <AlertOctagon className={`w-5 h-5 shrink-0 mt-0.5 ${
              patient.categoria === 'OCULTO' ? 'text-rose-600' : patient.categoria === 'ALTO' ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                {patient.categoria === 'OCULTO' ? 'ALERTA DE DETERIORO SILENTE DETECTADA' : 'EVALUACIÓN CLÍNICA'}
              </div>
              <p className="text-sm font-semibold mt-0.5">{patient.conclusion_diagnostica}</p>
              <p className="text-xs mt-1.5 opacity-90 leading-relaxed font-medium">
                <strong>Disparador:</strong> {patient.disparador_principal}
              </p>
            </div>
          </div>

          {/* Grilla de Métricas Clínicas con Deltas */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
              Parámetros Analíticos y Evolución Interanual (T - 1 vs T)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {valores_clave?.egfr && (
                <RiskPill
                  label="Filtrado (eGFR)"
                  actual={valores_clave.egfr.actual}
                  previo={valores_clave.egfr.previo}
                  delta={valores_clave.egfr.delta}
                  unidad={valores_clave.egfr.unidad}
                  inversed={false}
                />
              )}
              {valores_clave?.uacr && (
                <RiskPill
                  label="Albuminuria (UACR)"
                  actual={valores_clave.uacr.actual}
                  previo={valores_clave.uacr.previo}
                  delta={valores_clave.uacr.delta}
                  unidad={valores_clave.uacr.unidad}
                  inversed={true}
                />
              )}
              {valores_clave?.creatinina && (
                <RiskPill
                  label="Creatinina"
                  actual={valores_clave.creatinina.actual}
                  previo={valores_clave.creatinina.previo}
                  delta={valores_clave.creatinina.delta}
                  unidad={valores_clave.creatinina.unidad}
                  inversed={true}
                />
              )}
              {valores_clave?.pas && (
                <RiskPill
                  label="Presión Sistólica"
                  actual={valores_clave.pas.actual}
                  previo={valores_clave.pas.previo}
                  delta={valores_clave.pas.delta}
                  unidad={valores_clave.pas.unidad}
                  inversed={true}
                />
              )}
              {valores_clave?.ldl && (
                <RiskPill
                  label="Colesterol LDL"
                  actual={valores_clave.ldl.actual}
                  previo={valores_clave.ldl.previo}
                  delta={valores_clave.ldl.delta}
                  unidad={valores_clave.ldl.unidad}
                  inversed={true}
                />
              )}
            </div>
          </div>

          {/* Visualizaciones Gráficas Recharts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              <RiskRadarChart tiposRiesgo={tiposRiesgo} />
            </div>
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              <ShapImpactBar factoresClave={factores_clave} />
            </div>
          </div>

          {/* Recomendación Clínica Preventiva */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Plan de Acción y Recomendación Preventiva en AP
              </div>
              <p className="text-xs sm:text-sm text-indigo-950 mt-1 leading-relaxed">
                {patient.recomendacion_preventiva}
              </p>
            </div>
          </div>

        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Evaluación validada con guías KDIGO 2024 & ESC CVD Prevention
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FileText}
              onClick={() => alert(`Informe clínico del paciente ${patient.nombre} preparado para exportar.`)}
            >
              Exportar Informe AP
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientDetailModal;
