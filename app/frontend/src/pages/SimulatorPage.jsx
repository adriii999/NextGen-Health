// src/pages/SimulatorPage.jsx
import React, { useState } from 'react';
import { Stethoscope, Sliders, Play, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { RiskRadarChart } from '../components/charts/RiskRadarChart';
import { ShapImpactBar } from '../components/charts/ShapImpactBar';
import { RiskBadge } from '../components/common/RiskBadge';
import { analiticasService } from '../services/analiticasService';

const PRESETS = {
  silente: {
    nombre: 'Caso Silente (Manuel S. R. - Trampa Creatinina)',
    edad: 58,
    sexo: 'Hombre',
    presion_sistolica: 136,
    presion_diastolica: 84,
    colesterol_total: 215,
    colesterol_hdl: 42,
    colesterol_ldl: 138,
    trigliceridos: 175,
    glucosa_ayunas: 104,
    hemoglobina_hba1c: 5.9,
    creatinina: 1.10,
    filtrado_egfr: 68,
    cociente_uacr: 35.0,
    activarProgresion: true,
    delta_egfr: -18,
    delta_uacr: 17.0,
    delta_creatinina: 0.18,
    delta_pas: 10,
    delta_ldl: 18,
    delta_hba1c: 0.5,
  },
  sano: {
    nombre: 'Control Sano (Elena V. G.)',
    edad: 42,
    sexo: 'Mujer',
    presion_sistolica: 118,
    presion_diastolica: 74,
    colesterol_total: 175,
    colesterol_hdl: 58,
    colesterol_ldl: 98,
    trigliceridos: 95,
    glucosa_ayunas: 88,
    hemoglobina_hba1c: 5.2,
    creatinina: 0.80,
    filtrado_egfr: 98,
    cociente_uacr: 12.0,
    activarProgresion: true,
    delta_egfr: 2,
    delta_uacr: 0.5,
    delta_creatinina: -0.01,
    delta_pas: 2,
    delta_ldl: -4,
    delta_hba1c: 0.1,
  },
  modoA: {
    nombre: 'Foto Fija Modo A (Sin Historial Previo)',
    edad: 51,
    sexo: 'Mujer',
    presion_sistolica: 132,
    presion_diastolica: 82,
    colesterol_total: 210,
    colesterol_hdl: 46,
    colesterol_ldl: 142,
    trigliceridos: 160,
    glucosa_ayunas: 98,
    hemoglobina_hba1c: 5.7,
    creatinina: 1.05,
    filtrado_egfr: 64,
    cociente_uacr: 28.0,
    activarProgresion: false,
    delta_egfr: 0,
    delta_uacr: 0,
    delta_creatinina: 0,
    delta_pas: 0,
    delta_ldl: 0,
    delta_hba1c: 0,
  },
};

export const SimulatorPage = () => {
  const [form, setForm] = useState(PRESETS.silente);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === 'number' ? value : value,
    }));
  };

  const handleApplyPreset = (key) => {
    if (PRESETS[key]) {
      setForm(PRESETS[key]);
      setResultado(null);
    }
  };

  const handleSimular = async () => {
    setLoading(true);
    try {
      const payload = {
        edad: Number(form.edad),
        sexo: form.sexo,
        presion_sistolica: Number(form.presion_sistolica),
        presion_diastolica: Number(form.presion_diastolica),
        colesterol_total: Number(form.colesterol_total),
        colesterol_hdl: Number(form.colesterol_hdl),
        colesterol_ldl: Number(form.colesterol_ldl),
        trigliceridos: Number(form.trigliceridos),
        glucosa_ayunas: Number(form.glucosa_ayunas),
        hemoglobina_hba1c: Number(form.hemoglobina_hba1c),
        creatinina: Number(form.creatinina),
        filtrado_egfr: Number(form.filtrado_egfr),
        cociente_uacr: Number(form.cociente_uacr),
        ...(form.activarProgresion
          ? {
              progresion: {
                delta_egfr: Number(form.delta_egfr),
                delta_uacr: Number(form.delta_uacr),
                delta_creatinina: Number(form.delta_creatinina),
                delta_pas: Number(form.delta_pas),
                delta_ldl: Number(form.delta_ldl),
                delta_hba1c: Number(form.delta_hba1c),
              },
            }
          : {}),
      };

      const res = await analiticasService.predecirIndividual(payload);
      if (res.success) {
        setResultado(res.evaluacion);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Cabecera y Presets Clínicos */}
      <div className="bg-white p-4 rounded-[6px] border border-[#E3E6EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0E1621] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#1D3B6B]" />
            <span>Simulador Clínico Interactivo (Modo A / Modo B)</span>
          </h2>
          <p className="text-[12px] text-[#5A6573] mt-0.5">
            Evaluación dinámica de parámetros analíticos para contrastar la trampa de normalidad clínica en Atención Primaria.
          </p>
        </div>

        {/* Botones de Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#5A6573]">Casos de Prueba:</span>
          <button
            onClick={() => handleApplyPreset('silente')}
            className="px-2.5 py-1 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[11px] font-medium text-[#1D3B6B] transition-colors"
          >
            Caso Silente
          </button>
          <button
            onClick={() => handleApplyPreset('sano')}
            className="px-2.5 py-1 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[11px] font-medium text-[#5A6573] transition-colors"
          >
            Control Sano
          </button>
          <button
            onClick={() => handleApplyPreset('modoA')}
            className="px-2.5 py-1 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[11px] font-medium text-[#5A6573] transition-colors"
          >
            Modo A (Sin Δ)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Formulario de Entrada (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] mb-3 border-b border-[#E3E6EB] pb-2">
              Parámetros de Laboratorio y Constantes del Paciente
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">Edad (años)</label>
                <input
                  type="number"
                  value={form.edad}
                  onChange={(e) => handleInputChange('edad', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">Sexo</label>
                <select
                  value={form.sexo}
                  onChange={(e) => handleInputChange('sexo', e.target.value)}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] focus:border-[#1D3B6B] focus:outline-none bg-white"
                >
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">PAS (mmHg)</label>
                <input
                  type="number"
                  value={form.presion_sistolica}
                  onChange={(e) => handleInputChange('presion_sistolica', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">eGFR (mL/min)</label>
                <input
                  type="number"
                  value={form.filtrado_egfr}
                  onChange={(e) => handleInputChange('filtrado_egfr', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono font-semibold text-[#1D3B6B] focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">UACR (mg/g)</label>
                <input
                  type="number"
                  value={form.cociente_uacr}
                  onChange={(e) => handleInputChange('cociente_uacr', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono font-semibold text-[#1D3B6B] focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">Creatinina (mg/dL)</label>
                <input
                  type="number"
                  step="0.05"
                  value={form.creatinina}
                  onChange={(e) => handleInputChange('creatinina', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">Colesterol LDL (mg/dL)</label>
                <input
                  type="number"
                  value={form.colesterol_ldl}
                  onChange={(e) => handleInputChange('colesterol_ldl', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">Colesterol HDL (mg/dL)</label>
                <input
                  type="number"
                  value={form.colesterol_hdl}
                  onChange={(e) => handleInputChange('colesterol_hdl', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5A6573] block mb-1">HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.hemoglobina_hba1c}
                  onChange={(e) => handleInputChange('hemoglobina_hba1c', Number(e.target.value))}
                  className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono focus:border-[#1D3B6B] focus:outline-none"
                />
              </div>
            </div>

            {/* Toggle de Progresión Temporal (Modo B) */}
            <div className="mt-5 pt-4 border-t border-[#E3E6EB]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggleProgresion"
                    checked={form.activarProgresion}
                    onChange={(e) => handleInputChange('activarProgresion', e.target.checked)}
                    className="w-4 h-4 text-[#1D3B6B] rounded border-[#CBD0D8]"
                  />
                  <label htmlFor="toggleProgresion" className="text-[12px] font-semibold text-[#0E1621] cursor-pointer">
                    Activar Modo B (Comparar con analítica de hace ~12 meses)
                  </label>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border font-bold ${
                  form.activarProgresion ? 'bg-[#E8EEF7] text-[#1D3B6B] border-[#CBD0D8]' : 'bg-[#F0F2F5] text-[#5A6573] border-[#E3E6EB]'
                }`}>
                  {form.activarProgresion ? 'MODO B ACTIVO' : 'MODO A (FOTO FIJA)'}
                </span>
              </div>

              {form.activarProgresion && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#F6F7F9] rounded-[5px] border border-[#E3E6EB]">
                  <div>
                    <label className="text-[10px] font-semibold text-[#5A6573] block mb-0.5">
                      Δ eGFR (mL/min)
                    </label>
                    <input
                      type="number"
                      value={form.delta_egfr}
                      onChange={(e) => handleInputChange('delta_egfr', Number(e.target.value))}
                      className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono bg-white text-[#C2410C] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#5A6573] block mb-0.5">
                      Δ UACR (mg/g)
                    </label>
                    <input
                      type="number"
                      value={form.delta_uacr}
                      onChange={(e) => handleInputChange('delta_uacr', Number(e.target.value))}
                      className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono bg-white text-[#C2410C] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#5A6573] block mb-0.5">
                      Δ PAS (mmHg)
                    </label>
                    <input
                      type="number"
                      value={form.delta_pas}
                      onChange={(e) => handleInputChange('delta_pas', Number(e.target.value))}
                      className="w-full text-[12px] p-1.5 rounded-[4px] border border-[#CBD0D8] font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleSimular}
                className="w-full sm:w-auto px-4 py-2 rounded-[5px] bg-[#1D3B6B] hover:bg-[#162E54] text-white text-[12px] font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? 'Calculando inferencia...' : 'Ejecutar Inferencia Clínica'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Panel de Resultados (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5A6573] mb-3 border-b border-[#E3E6EB] pb-2">
              Resultado de Inferencia y Explicabilidad
            </h3>

            {!resultado ? (
              <div className="py-14 text-center text-[#8A94A3]">
                <Stethoscope className="w-9 h-9 mx-auto text-[#CBD0D8] mb-2 stroke-[1.5]" />
                <p className="text-[12px] max-w-xs mx-auto">
                  Introduce los valores analíticos y pulsa "Ejecutar Inferencia Clínica" para obtener la estratificación y explicabilidad.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                
                {/* Veredicto Diagnóstico */}
                <div className={`p-3.5 rounded-[5px] border ${
                  resultado.nivel_prioridad === 'ALTA'
                    ? 'bg-[#FDEFE6] border-[#F4D0BD] text-[#842A06]'
                    : resultado.nivel_prioridad === 'MEDIA'
                    ? 'bg-[#FBF3DD] border-[#F2DFAC] text-[#714405]'
                    : 'bg-[#E6F4EC] border-[#BDDFC9] text-[#16563C]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.04em]">
                      Prioridad: {resultado.nivel_prioridad}
                    </span>
                    <RiskBadge variant={resultado.nivel_prioridad === 'ALTA' ? 'OCULTO' : resultado.nivel_prioridad === 'MEDIA' ? 'MEDIO' : 'CONTROLADO'} />
                  </div>
                  <p className="text-[12px] font-semibold mt-1">
                    {resultado.conclusion_diagnostica}
                  </p>
                </div>

                {/* Radar */}
                <div className="bg-[#F6F7F9] p-3 rounded-[5px] border border-[#E3E6EB]">
                  <RiskRadarChart tiposRiesgo={resultado.tiposRiesgo || resultado.tipos_riesgo} />
                </div>

                {/* SHAP */}
                <div className="bg-[#F6F7F9] p-3 rounded-[5px] border border-[#E3E6EB]">
                  <ShapImpactBar factoresClave={resultado.factoresClave || resultado.factores_clave} />
                </div>

                {/* Recomendación */}
                <div className="p-3 bg-[#E8EEF7] rounded-[5px] border border-[#CBD0D8] text-[12px] text-[#1D3B6B]">
                  <strong>Recomendación AP:</strong> {resultado.recomendacion_preventiva}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SimulatorPage;
