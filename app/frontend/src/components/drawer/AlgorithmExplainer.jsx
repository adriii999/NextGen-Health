// src/components/drawer/AlgorithmExplainer.jsx
import React from 'react';

export const AlgorithmExplainer = ({ patient }) => {
  if (!patient) return null;

  const { valores_clave, tiene_progresion } = patient;
  const egfr = valores_clave?.egfr?.actual;
  const deltaEgfr = valores_clave?.egfr?.delta;
  const uacr = valores_clave?.uacr?.actual;
  const pas = valores_clave?.pas?.actual;
  const creatinina = valores_clave?.creatinina?.actual;

  const steps = [
    {
      paso: '1. Evaluación del filtrado glomerular (eGFR)',
      dato: `${egfr} mL/min/1.73m² ${deltaEgfr !== null && deltaEgfr !== undefined ? `(Δ anual: ${deltaEgfr} mL/min)` : ''}`,
      umbral: 'Caída > 5 mL/min/año define progresión rápida (KDIGO 2024)',
      resultado: deltaEgfr < -5 
        ? 'ALERTA ADVERSA: Pérdida acelerada de masa de nefronas funcionantes (-20.9% en 12 meses)' 
        : 'Dentro del rango de pérdida fisiológica esperable por edad',
      cumple: deltaEgfr < -5,
    },
    {
      paso: '2. Cociente Albúmina / Creatinina (UACR)',
      dato: `${uacr} mg/g`,
      umbral: 'Normal < 30 mg/g; Microalbuminuria A2 entre 30 y 300 mg/g',
      resultado: uacr > 30 
        ? 'ALERTA ADVERSA: Daño en la barrera podocitaria glomerular detectado (Estadio A2)'
        : 'Normoalbuminuria preservada (Estadio A1)',
      cumple: uacr > 30,
    },
    {
      paso: '3. Trampa de la creatinina sérica aislada',
      dato: `${creatinina} mg/dL`,
      umbral: 'Rango de referencia estándar de laboratorio: 0.70 - 1.20 mg/dL',
      resultado: creatinina <= 1.20 && deltaEgfr < -5
        ? 'ENGAÑOSO: La creatinina permanece en rango "normal" a pesar de que el paciente ya ha perdido 1/5 de su filtrado'
        : 'Valores concordantes con el filtrado glomerular',
      cumple: creatinina <= 1.20 && deltaEgfr < -5,
    },
    {
      paso: '4. Presión arterial sistólica (PAS)',
      dato: `${pas} mmHg`,
      umbral: 'Objetivo de protección renal en AP: < 130 mmHg (KDIGO)',
      resultado: pas > 130 
        ? 'FACTOR ACELERADOR: La hipertensión descontrolada perpetúa la hiperfiltración y esclerosis'
        : 'Tensión arterial en rango terapéutico diana',
      cumple: pas > 130,
    },
  ];

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-3">
      <div className="border-b border-[#E3E6EB] pb-2">
        <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
          Explicabilidad del Algoritmo (Paso a Paso)
        </h4>
        <p className="text-[11px] text-[#5A6573]">
          {tiene_progresion ? 'Modo B: Validación combinada de trayectoria temporal + umbrales estáticos' : 'Modo A: Reglas estáticas de corte clínico'}
        </p>
      </div>

      <div className="space-y-2.5">
        {steps.map((st, idx) => (
          <div key={idx} className="p-2.5 rounded-[4px] bg-[#F6F7F9] border border-[#E3E6EB] text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0E1621]">{st.paso}</span>
              <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-[4px] border ${
                st.cumple ? 'bg-[#FDEFE6] text-[#C2410C] border-[#F4D0BD]' : 'bg-[#E6F4EC] text-[#1F7A55] border-[#BDDFC9]'
              }`}>
                {st.cumple ? 'Alerta Activada' : 'Normal'}
              </span>
            </div>
            <div className="text-[#5A6573]">
              <strong className="text-[#0E1621]">Dato paciente:</strong> <span className="font-mono">{st.dato}</span>
            </div>
            <div className="text-[#5A6573]">
              <strong className="text-[#0E1621]">Criterio clínico:</strong> {st.umbral}
            </div>
            <div className={`p-1.5 rounded-[4px] font-medium leading-snug mt-1 ${
              st.cumple ? 'bg-white text-[#842A06] border border-[#F4D0BD]' : 'bg-white text-[#5A6573] border border-[#E3E6EB]'
            }`}>
              {st.resultado}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(AlgorithmExplainer);
