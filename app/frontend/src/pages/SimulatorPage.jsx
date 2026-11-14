// src/pages/SimulatorPage.jsx
import React, { useState } from 'react';
import { Stethoscope, Sliders, Play, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { RiskRadarChart } from '../components/charts/RiskRadarChart';
import { ShapImpactBar } from '../components/charts/ShapImpactBar';
import { Badge } from '../components/common/Badge';
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
    <div className="space-y-6">
      
      {/* Cabecera y Presets */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Simulador Clínico Interactivo (Modo A / Modo B)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Modifica parámetros analíticos en tiempo real o carga perfiles predefinidos para evaluar la respuesta de la IA.
          </p>
        </div>

        {/* Botones de Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Casos Tipo:</span>
          <Button variant="secondary" size="sm" onClick={() => handleApplyPreset('silente')}>
            Caso Silente
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleApplyPreset('sano')}>
            Control Sano
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleApplyPreset('modoA')}>
            Modo A (Sin Δ)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulario de Entrada (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card title="Datos de Entrada de la Analítica" padding="p-5">
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Edad</label>
                <input
                  type="number"
                  value={form.edad}
                  onChange={(e) => handleInputChange('edad', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sexo</label>
                <select
                  value={form.sexo}
                  onChange={(e) => handleInputChange('sexo', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                >
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">PAS (mmHg)</label>
                <input
                  type="number"
                  value={form.presion_sistolica}
                  onChange={(e) => handleInputChange('presion_sistolica', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">eGFR (mL/min)</label>
                <input
                  type="number"
                  value={form.filtrado_egfr}
                  onChange={(e) => handleInputChange('filtrado_egfr', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">UACR (mg/g)</label>
                <input
                  type="number"
                  value={form.cociente_uacr}
                  onChange={(e) => handleInputChange('cociente_uacr', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Creatinina (mg/dL)</label>
                <input
                  type="number"
                  step="0.05"
                  value={form.creatinina}
                  onChange={(e) => handleInputChange('creatinina', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Colesterol LDL (mg/dL)</label>
                <input
                  type="number"
                  value={form.colesterol_ldl}
                  onChange={(e) => handleInputChange('colesterol_ldl', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Colesterol HDL (mg/dL)</label>
                <input
                  type="number"
                  value={form.colesterol_hdl}
                  onChange={(e) => handleInputChange('colesterol_hdl', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.hemoglobina_hba1c}
                  onChange={(e) => handleInputChange('hemoglobina_hba1c', Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Toggle de Progresión Temporal (Modo B) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggleProgresion"
                    checked={form.activarProgresion}
                    onChange={(e) => handleInputChange('activarProgresion', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="toggleProgresion" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Activar Modo B (Comparar con analítica previa de hace ~12 meses)
                  </label>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  form.activarProgresion ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {form.activarProgresion ? 'MODO B ACTIVO' : 'MODO A (FOTO FIJA)'}
                </span>
              </div>

              {form.activarProgresion && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-indigo-50/40 rounded-lg border border-indigo-100">
                  <div>
                    <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">
                      Δ eGFR (mL/min)
                    </label>
                    <input
                      type="number"
                      value={form.delta_egfr}
                      onChange={(e) => handleInputChange('delta_egfr', Number(e.target.value))}
                      className="w-full text-xs p-1.5 rounded border border-indigo-200 font-mono bg-white text-rose-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">
                      Δ UACR (mg/g)
                    </label>
                    <input
                      type="number"
                      value={form.delta_uacr}
                      onChange={(e) => handleInputChange('delta_uacr', Number(e.target.value))}
                      className="w-full text-xs p-1.5 rounded border border-indigo-200 font-mono bg-white text-rose-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">
                      Δ PAS (mmHg)
                    </label>
                    <input
                      type="number"
                      value={form.delta_pas}
                      onChange={(e) => handleInputChange('delta_pas', Number(e.target.value))}
                      className="w-full text-xs p-1.5 rounded border border-indigo-200 font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                variant="primary"
                size="md"
                icon={Play}
                loading={loading}
                onClick={handleSimular}
                className="w-full sm:w-auto"
              >
                Ejecutar Inferencia Clínica
              </Button>
            </div>

          </Card>
        </div>

        {/* Panel de Resultados (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Resultado de Inferencia y Explicabilidad" padding="p-5">
            {!resultado ? (
              <div className="py-14 text-center text-slate-400">
                <Stethoscope className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium">
                  Introduce los valores y pulsa "Ejecutar Inferencia Clínica" para ver la estratificación multidimensional y los factores SHAP.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                
                {/* Veredicto */}
                <div className={`p-3.5 rounded-xl border ${
                  resultado.nivel_prioridad === 'ALTA'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : resultado.nivel_prioridad === 'MEDIA'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Prioridad: {resultado.nivel_prioridad}
                    </span>
                    <Badge variant={resultado.nivel_prioridad === 'ALTA' ? 'OCULTO' : resultado.nivel_prioridad === 'MEDIA' ? 'MEDIO' : 'CONTROLADO'} size="sm" />
                  </div>
                  <p className="text-xs font-semibold mt-1">
                    {resultado.conclusion_diagnostica}
                  </p>
                </div>

                {/* Radar */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <RiskRadarChart tiposRiesgo={resultado.tiposRiesgo || resultado.tipos_riesgo} />
                </div>

                {/* SHAP */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <ShapImpactBar factoresClave={resultado.factoresClave || resultado.factores_clave} />
                </div>

                {/* Recomendación */}
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-950">
                  <strong>Recomendación AP:</strong> {resultado.recomendacion_preventiva}
                </div>

              </div>
            )}
          </Card>
        </div>

      </div>

    </div>
  );
};

export default SimulatorPage;
