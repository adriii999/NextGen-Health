// src/components/patientCare/PatientCarePlanModal.jsx
import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, Heart, Pill, Calendar, Droplets } from 'lucide-react';

export const PatientCarePlanModal = ({ isOpen, onClose, patient }) => {
  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(14, 22, 33, 0.55)',
          zIndex: 100000,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Contenedor del Modal / Hoja de Impresión */}
      <div
        style={{
          position: 'relative',
          zIndex: 100001,
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera de la Ventana */}
        <div className="px-6 py-3.5 border-b border-[#E3E6EB] bg-[#F6F7F9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#C2410C]" />
            <h3 className="text-[14px] font-semibold text-[#0E1621]">
              Hoja de Cuidados y Recomendaciones para el Paciente
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Documento Clínico para Entregar */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#0E1621]">
          
          {/* Membrete Institucional del Centro de Salud */}
          <div className="border-b border-[#E3E6EB] pb-4 flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-[#1D3B6B] uppercase tracking-[0.05em] block">
                Atención Primaria • Servicio de Salud
              </span>
              <h2 className="text-[17px] font-bold text-[#0E1621] mt-0.5">
                Plan de Salud y Protección Cardiorrenal
              </h2>
              <p className="text-[12px] text-[#5A6573] mt-1">
                Instrucciones personalizadas entregadas en consulta médica.
              </p>
            </div>
            <div className="text-right text-[11px] text-[#5A6573] font-mono">
              <div>Fecha: {new Date().toLocaleDateString('es-ES')}</div>
              <div className="font-semibold text-[#0E1621]">{patient.nombre}</div>
              <div>ID: {patient.id} • {patient.edad} años</div>
            </div>
          </div>

          {/* Estado Explicado al Paciente con Claridad */}
          <div className="bg-[#FAFBFD] p-3.5 rounded-[6px] border border-[#E3E6EB] text-[12px] leading-relaxed">
            <strong className="text-[#1D3B6B] block mb-1">Estimado/a {patient.nombre}:</strong>
            En la revisión de sus análisis hemos detectado que, aunque su creatinina parece normal, sus riñones están empezando a trabajar con sobreesfuerzo y muestran una pérdida progresiva de filtrado. Iniciando este plan hoy, <strong>frenamos ese deterioro y protegemos su corazón</strong> para que se mantenga sano muchos años.
          </div>

          {/* Bloque 1: Medicación Protectora */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1D3B6B]">
              <Pill className="w-4 h-4 text-[#1D3B6B]" />
              <span>1. Su Tratamiento Médico Recomendado</span>
            </div>
            <div className="bg-white rounded-[6px] border border-[#E3E6EB] divide-y divide-[#E3E6EB] text-[12px]">
              <div className="p-3">
                <div className="font-semibold text-[#0E1621] flex items-center justify-between">
                  <span>Protector renal iSGLT2 (Dapagliflozina 10 mg o Empagliflozina 10 mg)</span>
                  <span className="text-[11px] font-mono bg-[#E8EEF7] text-[#1D3B6B] px-2 py-0.5 rounded font-semibold">
                    1 comp. al día
                  </span>
                </div>
                <p className="text-[#5A6573] text-[11px] mt-1">
                  Tomar por las mañanas. Este fármaco actúa como un escudo protector para los filtros del riñón y reduce el cansancio del corazón.
                </p>
              </div>

              <div className="p-3">
                <div className="font-semibold text-[#0E1621] flex items-center justify-between">
                  <span>Control de Tensión Arterial (Objetivo &lt; 130/80 mmHg)</span>
                  <span className="text-[11px] font-mono bg-[#F0F2F5] text-[#5A6573] px-2 py-0.5 rounded">
                    Según pauta médica
                  </span>
                </div>
                <p className="text-[#5A6573] text-[11px] mt-1">
                  Mantener la medicación antihipertensiva fijada en receta para evitar sobrepresión en las arterias renales.
                </p>
              </div>
            </div>
          </div>

          {/* Bloque 2: ¡Alerta de Fármacos a Evitar! */}
          <div className="bg-[#FDEFE6] p-3.5 rounded-[6px] border border-[#F4D0BD] text-[12px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#842A06]">
              <AlertTriangle className="w-4 h-4 text-[#C2410C]" />
              <span>2. Medicamentos que DEBE EVITAR (Nefrotóxicos)</span>
            </div>
            <p className="text-[#842A06] text-[11px] leading-relaxed">
              <strong>Evite tomar antiinflamatorios (AINEs)</strong> como <em>Ibuprofeno, Naproxeno, Dexketoprofeno (Enantyum) o Diclofenaco (Voltarén)</em>, ya que dañan directamente la función renal en este momento.
            </p>
            <p className="text-[11px] text-[#5A6573] pt-0.5">
              Si tiene dolor o fiebre, consulte a su médico. El <strong>Paracetamol</strong> suele ser la alternativa más segura.
            </p>
          </div>

          {/* Bloque 3: Consejos Cotidianos de Estilo de Vida */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0E1621]">
              <Droplets className="w-4 h-4 text-[#1F7A55]" />
              <span>3. Hábitos para el Día a Día</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-[5px] bg-[#F6F7F9] border border-[#E3E6EB]">
                <strong className="block text-[#0E1621] mb-0.5">🧂 Menos Sal</strong>
                Cocine con limón, hierbas y ajo. Evite ultraprocesados, embutidos y sopas de sobre.
              </div>
              <div className="p-2.5 rounded-[5px] bg-[#F6F7F9] border border-[#E3E6EB]">
                <strong className="block text-[#0E1621] mb-0.5">💧 Hidratación</strong>
                Beba de 1.5 a 2 litros de agua diarios salvo que su médico le haya indicado otra pauta.
              </div>
              <div className="p-2.5 rounded-[5px] bg-[#F6F7F9] border border-[#E3E6EB]">
                <strong className="block text-[#0E1621] mb-0.5">🚶 Paseo Diario</strong>
                Camine 30 minutos al día a paso ligero para activar la circulación y regular el azúcar.
              </div>
            </div>
          </div>

          {/* Bloque 4: Próxima Cita en el Centro de Salud */}
          <div className="p-3 bg-[#E6F4EC] rounded-[6px] border border-[#BDDFC9] flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1F7A55] shrink-0" />
              <div>
                <strong className="text-[#16563C]">Próximo Control en Atención Primaria:</strong>
                <div className="text-[11px] text-[#16563C]/90">
                  Cita con enfermería en 60 días para repetición de orina (UACR) y toma tensional.
                </div>
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold text-[#16563C] bg-white px-2 py-1 rounded border border-[#BDDFC9]">
              60 Días
            </span>
          </div>

        </div>

        {/* Pie con Botones de Acción */}
        <div className="px-6 py-3.5 border-t border-[#E3E6EB] bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#5A6573]">
            Documento generado por el CDSS de Atención Primaria NextGen Health
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-[5px] border border-[#E3E6EB] text-[#5A6573] hover:text-[#0E1621] hover:bg-[#F6F7F9] text-[12px] font-medium transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-[5px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Entregar al Paciente</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientCarePlanModal;
