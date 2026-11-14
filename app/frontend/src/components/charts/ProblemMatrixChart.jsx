// src/components/charts/ProblemMatrixChart.jsx
import React from 'react';

export const ProblemMatrixChart = ({ patient }) => {
  if (!patient) return null;

  const { valores_clave, tipos_riesgo } = patient;

  // Cálculo de severidad de problemas clínicos (0 a 100%)
  const egfr = valores_clave?.egfr?.actual || 75;
  const deltaEgfr = valores_clave?.egfr?.delta || 0;
  const uacr = valores_clave?.uacr?.actual || 20;
  const ldl = valores_clave?.ldl?.actual || 120;
  const pas = valores_clave?.pas?.actual || 125;
  const hba1c = valores_clave?.hba1c?.actual || 5.4;

  const problems = [
    {
      id: 'renal',
      nombre: 'Deterioro Renal Silencioso (KDIGO)',
      score: Math.min(100, Math.round(
        (deltaEgfr < -5 ? 45 : 10) +
        (uacr > 30 ? 40 : 10) +
        (egfr < 70 ? 15 : 0)
      )),
      estado: deltaEgfr < -5 || uacr > 30 ? 'SILENTE' : egfr < 60 ? 'ALTO' : 'OK',
      evidencia: deltaEgfr < -5 
        ? `Pérdida anual acelerada (${deltaEgfr} mL/min) y UACR en ${uacr} mg/g.`
        : `Filtrado estable en ${egfr} mL/min con normoalbuminuria (${uacr} mg/g).`,
      accion: deltaEgfr < -5
        ? 'Valorar inicio de iSGLT2 (Dapagliflozina/Empagliflozina) y titular ARA-II.'
        : 'Mantener control habitual en 12-24 meses.',
    },
    {
      id: 'aterosclerotico',
      nombre: 'Riesgo Aterosclerótico Vascular (ASCVD)',
      score: Math.min(100, Math.round(
        ((ldl - 70) / 130) * 60 + ((pas - 115) / 60) * 40
      )),
      estado: ldl > 160 || pas > 145 ? 'ALTO' : ldl > 130 || pas > 135 ? 'MODERADO' : 'OK',
      evidencia: `LDL en ${ldl} mg/dL y PAS en ${pas} mmHg.`,
      accion: ldl > 130 
        ? 'Optimizar dosis de estatina de alta potencia; objetivo < 100 mg/dL.'
        : 'Perfil lipídico dentro del objetivo primario de prevención.',
    },
    {
      id: 'hemodinamico',
      nombre: 'Sobrecarga Hemodinámica / Tensión Arterial',
      score: Math.min(100, Math.round(Math.max(0, (pas - 110) / 50 * 100))),
      estado: pas > 140 ? 'ALTO' : pas > 130 ? 'MODERADO' : 'OK',
      evidencia: `PAS actual ${pas} mmHg ${valores_clave?.pas?.delta ? `(Δ +${valores_clave.pas.delta} mmHg)` : ''}.`,
      accion: pas > 135 
        ? 'Reforzar restricción de sodio y optimizar régimen antihipertensivo.'
        : 'Tensión arterial en rango óptimo de protección endotelial.',
    },
    {
      id: 'metabolico',
      nombre: 'Riesgo Metabólico / Glucemia',
      score: Math.min(100, Math.round(Math.max(0, (hba1c - 5.0) / 3.0 * 100))),
      estado: hba1c >= 6.5 ? 'ALTO' : hba1c >= 5.7 ? 'MODERADO' : 'OK',
      evidencia: `HbA1c en ${hba1c}% ${hba1c >= 5.7 ? '(Rango prediabetes/diabetes)' : '(Glucorregulación normal)'}.`,
      accion: hba1c >= 5.7 
        ? 'Control dietético y seguimiento de HbA1c cada 6 meses.'
        : 'Metabolismo hidrocarbonado compensado.',
    },
  ];

  return (
    <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-2.5">
        <div>
          <h4 className="text-[12px] font-semibold text-[#0E1621] uppercase tracking-[0.04em]">
            Segunda Opinión: Árbol de Problemas Clínicos Detectados
          </h4>
          <p className="text-[11px] text-[#5A6573] mt-0.5">
            Estratificación objetiva basada en cruce multivariable (datos actuales vs trayectoria)
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E8EEF7] text-[#1D3B6B] border border-[#CBD0D8] font-semibold">
          Algoritmo CDSS AP
        </span>
      </div>

      {/* Gráfico de Barras de Severidad de Problemas */}
      <div className="space-y-3">
        {problems.map((prob) => {
          let barColor = '#1F7A55'; // ok
          let badgeBg = 'bg-[#E6F4EC] text-[#16563C] border-[#BDDFC9]';
          let badgeLabel = 'Compensado';

          if (prob.estado === 'SILENTE') {
            barColor = '#C2410C'; // silent
            badgeBg = 'bg-[#FDEFE6] text-[#842A06] border-[#F4D0BD]';
            badgeLabel = 'Deterioro silente';
          } else if (prob.estado === 'ALTO') {
            barColor = '#B3261E'; // crit
            badgeBg = 'bg-[#FBEAE9] text-[#8C1D18] border-[#F5C2C0]';
            badgeLabel = 'Alerta alta';
          } else if (prob.estado === 'MODERADO') {
            barColor = '#A16207'; // warn
            badgeBg = 'bg-[#FBF3DD] text-[#714405] border-[#F2DFAC]';
            badgeLabel = 'Vigilancia';
          }

          return (
            <div key={prob.id} className="p-2.5 rounded-[6px] bg-[#F6F7F9] border border-[#E3E6EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#0E1621]">
                  {prob.nombre}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border ${badgeBg}`}>
                  {badgeLabel}
                </span>
              </div>

              {/* Barra de progreso de severidad */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#E3E6EB] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${prob.score}%`, backgroundColor: barColor }}
                  />
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#0E1621] w-8 text-right">
                  {prob.score}%
                </span>
              </div>

              <div className="text-[11px] text-[#5A6573] leading-snug">
                <strong className="text-[#0E1621]">Evidencia:</strong> {prob.evidencia}
              </div>
              <div className="text-[11px] text-[#1D3B6B] leading-snug bg-white p-1.5 rounded-[4px] border border-[#E3E6EB]">
                <strong className="text-[#1D3B6B]">Intervención precoz:</strong> {prob.accion}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ProblemMatrixChart);
