// src/components/patientAction/PatientActionView.jsx
import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  AlertTriangle,
  Pill,
  CheckCircle2,
  AlertOctagon,
  FileText,
  ShieldAlert,
  ArrowRight,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';

export const PatientActionView = ({
  isOpen,
  onClose,
  patient,
  onSavePlan,
  onOpenCarePlan
}) => {
  if (!isOpen || !patient) return null;

  // Estado del Triaje de Cita
  const [triagePriority, setTriagePriority] = useState('urgente'); // 'urgente', 'preferente', 'control'
  
  // Justificación algorítmica pre-rellenada
  const defaultObservation = patient.id === 'PAC-02-SILENTE'
    ? 'Deterioro silente de eGFR a 12 meses (caída de 86 a 68 mL/min, -20.9%) con creatinina sérica engañosamente normal (1.10 mg/dL) y microalbuminuria activa (UACR 35 mg/g). Se reprograma cita prioritaria para conciliación terapéutica, retirada de nefrotóxicos y prescripción de iSGLT2.'
    : patient.id === 'PAC-05-LOTE-01'
    ? 'Microalbuminuria acelerada (+22 mg/g en 12 meses) con HbA1c estable. Requiere intervención preventiva precoz para evitar progresión a nefropatía diabética abierta.'
    : `Detección de riesgo cardiorrenal en Atención Primaria (${patient.conclusion_diagnostica || 'Evaluación de trayectoria temporal'}).`;

  const [observations, setObservations] = useState(defaultObservation);

  // Conciliación farmacológica: Fármacos de riesgo actuales
  const [medications, setMedications] = useState([
    {
      id: 'med-1',
      nombre: 'Ibuprofeno 600 mg',
      clase: 'AINE (Antiinflamatorio no esteroideo)',
      pautaActual: '1 comprimido cada 8-12h si dolor articular',
      riesgo: 'Alto riesgo de toxicidad renal, vasoconstricción de arteriola aferente y caída aguda de eGFR.',
      suspendido: false,
    },
    {
      id: 'med-2',
      nombre: 'Enalapril 20 mg',
      clase: 'IECA (Inhibidor ECA)',
      pautaActual: '1 comprimido en ayunas (24h)',
      riesgo: 'Requiere monitorización de potasio e iones tras inicio de nuevo tratamiento.',
      suspendido: false,
      ajustado: false,
    },
  ]);

  // Manejo de Prescripción Nueva
  const [selectedDrug, setSelectedDrug] = useState('Dapagliflozina (iSGLT2)');
  const [selectedDose, setSelectedDose] = useState('10 mg');
  const [selectedSchedule, setSelectedSchedule] = useState('1 comprimido al día en el desayuno');
  const [rxNotes, setRxNotes] = useState(
    'Nefroprotección precoz según KDIGO 2024 / ESC. Control de UACR, creatinina e iones en 60 días con enfermería de Atención Primaria.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Alternar suspensión de fármaco
  const toggleSuspendMed = (medId) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, suspendido: !m.suspendido } : m))
    );
  };

  // Guardar plan e intervenir
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);

      const planData = {
        patientId: patient.id,
        triagePriority,
        triageLabel:
          triagePriority === 'urgente'
            ? 'Urgente (48-72h)'
            : triagePriority === 'preferente'
            ? 'Preferente (1-2 semanas)'
            : 'Control (1 mes)',
        observations,
        suspendedMeds: medications.filter((m) => m.suspendido).map((m) => m.nombre),
        prescribedMed: {
          droga: selectedDrug,
          dosis: selectedDose,
          pauta: selectedSchedule,
          notas: rxNotes,
        },
        fecha: new Date().toLocaleDateString('es-ES'),
      };

      if (onSavePlan) {
        onSavePlan(patient.id, planData);
      }

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop con desenfoque suave */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(14, 22, 33, 0.55)',
          zIndex: 100000,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Contenedor Modal de Intervención Rápida */}
      <div
        style={{
          position: 'relative',
          zIndex: 100001,
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(227, 230, 235, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="animate-modal-in"
      >
        {/* Cabecera Clínica de la Acción */}
        <div className="px-6 py-4 border-b border-[#E3E6EB] bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C2410C]/10 border border-[#C2410C]/20 text-[#C2410C] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#C2410C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0E1621]">
                  Intervención Médica Inmediata
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  Riesgo Oculto Detectado
                </span>
              </div>
              <p className="text-xs text-[#5A6573] mt-0.5">
                Paciente: <strong className="text-[#0E1621]">{patient.nombre}</strong> ({patient.id}) • {patient.edad} años • {patient.sexo}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] transition-colors cursor-pointer"
            aria-label="Cerrar modal de intervención"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario de Intervención Dividido en 2 Secciones */}
        <div className="p-6 overflow-y-auto space-y-6 text-[#0E1621]">

          {/* Resumen Clínico Rápido del Algoritmo (3 segundos de lectura) */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <span className="font-semibold block">
                Disparador de Intervención (CDSS NextGen Health):
              </span>
              <p className="text-slate-700 leading-relaxed">
                Caída del filtrado glomerular de <strong>{patient.valores_clave?.egfr?.previo || 86}</strong> a <strong>{patient.valores_clave?.egfr?.actual || 68} mL/min</strong> ({patient.valores_clave?.egfr?.delta || -18} mL/min) en 12 meses, mientras la creatinina se mantiene engañosamente en rango ({patient.valores_clave?.creatinina?.actual || 1.10} mg/dL).
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 1: REPROGRAMACIÓN PRIORITARIA DE CITA                */}
          {/* ============================================================ */}
          <div className="space-y-3 border-b border-[#E3E6EB] pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1D3B6B]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E1621]">
                  1. Reprogramación Prioritaria de Cita
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Triaje según pérdida anual de filtrado
              </span>
            </div>

            {/* Botones de Triaje Rápido con Badges de Tiempo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'urgente',
                  label: 'Urgente',
                  timeBadge: '48 - 72h',
                  desc: 'Caída de eGFR >5 mL/año o albuminuria descompensada',
                  activeStyle: 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 text-rose-950',
                  badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
                },
                {
                  id: 'preferente',
                  label: 'Preferente',
                  timeBadge: '1 - 2 semanas',
                  desc: 'Ajuste terapéutico y control de presión arterial',
                  activeStyle: 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 text-amber-950',
                  badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
                },
                {
                  id: 'control',
                  label: 'Control',
                  timeBadge: '1 mes',
                  desc: 'Revisión analítica de rutina y hábitos de salud',
                  activeStyle: 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950',
                  badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
                },
              ].map((opt) => {
                const isSelected = triagePriority === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTriagePriority(opt.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? opt.activeStyle
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${opt.badgeStyle}`}>
                        {opt.timeBadge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Campo de Observaciones Clínicas Pre-rellenado */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="clinical-obs" className="font-semibold text-slate-700">
                  Observaciones Clínicas para Citaciones / Agenda:
                </label>
                <button
                  type="button"
                  onClick={() => setObservations(defaultObservation)}
                  className="text-[11px] text-[#1D3B6B] hover:underline cursor-pointer"
                >
                  Restablecer nota algorítmica
                </button>
              </div>
              <textarea
                id="clinical-obs"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none leading-relaxed"
                placeholder="Indique los motivos de la cita para el equipo de admisión y enfermería..."
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 2: MANEJO FARMACOLÓGICO PREVENTIVO                   */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#1D3B6B]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E1621]">
                  2. Manejo Farmacológico Preventivo
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Guías KDIGO 2024 & ESC
              </span>
            </div>

            {/* 2.1 Alerta de Conciliación: Medicación Actual con Riesgo */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Conciliación de Riesgo: Fármacos Actuales del Paciente</span>
              </div>

              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      med.suspendido
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-500'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${med.suspendido ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {med.nombre}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                          {med.clase}
                        </span>
                        {med.suspendido && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Retirada Pautada
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${med.suspendido ? 'text-slate-400' : 'text-rose-900'}`}>
                        {med.riesgo}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSuspendMed(med.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        med.suspendido
                          ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          : 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
                      }`}
                    >
                      {med.suspendido ? 'Reactivar' : 'Retirar / Suspender'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2.2 Bloque para Pautar Nuevo Tratamiento Protector */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Prescripción Nefroprotectora Recomendada
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Evidencia Grado A
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Selector de Fármaco */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Fármaco Protector:
                  </label>
                  <select
                    value={selectedDrug}
                    onChange={(e) => setSelectedDrug(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:outline-none"
                  >
                    <option value="Dapagliflozina (iSGLT2)">Dapagliflozina (iSGLT2)</option>
                    <option value="Empagliflozina (iSGLT2)">Empagliflozina (iSGLT2)</option>
                    <option value="Finerenona (ARM no esteroideo)">Finerenona (ARM no esteroideo)</option>
                  </select>
                </div>

                {/* Selector de Dosis */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Dosis Inicial:
                  </label>
                  <select
                    value={selectedDose}
                    onChange={(e) => setSelectedDose(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:outline-none"
                  >
                    <option value="10 mg">10 mg (Estándar KDIGO)</option>
                    <option value="5 mg">5 mg (Ajuste fraccionado)</option>
                    <option value="25 mg">25 mg</option>
                  </select>
                </div>

                {/* Selector de Pauta */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Posología:
                  </label>
                  <select
                    value={selectedSchedule}
                    onChange={(e) => setSelectedSchedule(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:outline-none"
                  >
                    <option value="1 comprimido al día en el desayuno">1 comp/día en desayuno</option>
                    <option value="1 comprimido cada 24 horas">1 comp/24 horas</option>
                  </select>
                </div>
              </div>

              {/* Notas de Prescripción para Receta Electrónica */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Notas para la Receta Electrónica y Enfermería:
                </label>
                <input
                  type="text"
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>
            </div>

          </div>

        </div>

        {/* ============================================================ */}
        {/* PIE DE ACCIÓN (FOOTER)                                       */}
        {/* ============================================================ */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E3E6EB] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCarePlan?.(patient)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Hoja del Paciente</span>
            </button>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Se sincroniza con el historial clínico
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando plan...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>¡Plan Guardado y Notificado!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Guardar Plan y Notificar Cita</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientActionView;
