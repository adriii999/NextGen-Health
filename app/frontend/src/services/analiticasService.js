// src/services/analiticasService.js
import apiClient from './apiClient';
import { MOCK_PATIENTS, MOCK_KPIS } from '../mock/patientsData';

export const analiticasService = {
  /**
   * Comprueba el estado del backend FastAPI y la disponibilidad del modelo ML.
   */
  async checkHealth() {
    try {
      const res = await apiClient.get('/health');
      return {
        online: true,
        modelo_cargado: !!res.data.modelo_cargado,
        data: res.data,
      };
    } catch (err) {
      return {
        online: false,
        modelo_cargado: false,
        error: err.message,
      };
    }
  },

  /**
   * Obtiene el listado de archivos analíticos en disco (data/analiticas/).
   */
  async getArchivosAnaliticas() {
    try {
      const res = await apiClient.get('/analiticas');
      return { success: true, archivos: res.data, fromApi: true };
    } catch (err) {
      console.warn('[analiticasService] Fallback a listado mock:', err.message);
      return {
        success: true,
        archivos: MOCK_PATIENTS.map((p) => ({
          archivo: p.archivo,
          tiene_progresion: p.tiene_progresion,
          tamano_bytes: 1024,
          fecha_modificacion: new Date().toISOString(),
          datos_resumen: p.valores_clave,
        })),
        fromApi: false,
      };
    }
  },

  /**
   * Ejecuta el análisis en 1 Clic de todas las analíticas de la carpeta.
   * Si el modelo ML aún no está entrenado (501) o el backend está offline,
   * suministra los resultados clínicos estructurados del mock sin romper el flujo.
   */
  async analizarCarpeta() {
    try {
      const res = await apiClient.post('/analiticas/analizar-carpeta');
      // Mapear respuesta real de la API a formato UI
      const mapped = res.data.map((item, idx) => ({
        id: `PAC-API-${idx + 1}`,
        archivo: item.archivo,
        nombre: item.datos_entrada?.nombre || `Paciente ${idx + 1}`,
        edad: item.datos_entrada?.edad || 55,
        sexo: item.datos_entrada?.sexo || 'Hombre',
        categoria: item.evaluacion.nivel_prioridad === 'ALTA' 
          ? (item.evaluacion.tipos_riesgo?.riesgo_cardiorrenal?.alerta ? 'OCULTO' : 'ALTO')
          : item.evaluacion.nivel_prioridad === 'MEDIA' ? 'MEDIO' : 'CONTROLADO',
        nivel_prioridad: item.evaluacion.nivel_prioridad,
        hay_riesgo: item.evaluacion.hay_riesgo,
        conclusion_diagnostica: item.evaluacion.conclusion_diagnostica,
        disparador_principal: item.evaluacion.factores_clave?.[0]?.descripcion || 'Evaluación multivariable completada.',
        valores_clave: {
          egfr: { actual: item.datos_entrada?.filtrado_egfr || 75, delta: item.datos_entrada?.progresion?.delta_egfr || null, unidad: 'mL/min/1.73m²' },
          uacr: { actual: item.datos_entrada?.cociente_uacr || 25, delta: item.datos_entrada?.progresion?.delta_uacr || null, unidad: 'mg/g' },
          creatinina: { actual: item.datos_entrada?.creatinina || 1.0, delta: item.datos_entrada?.progresion?.delta_creatinina || null, unidad: 'mg/dL' },
          pas: { actual: item.datos_entrada?.presion_sistolica || 130, delta: item.datos_entrada?.progresion?.delta_pas || null, unidad: 'mmHg' },
          ldl: { actual: item.datos_entrada?.colesterol_ldl || 130, delta: item.datos_entrada?.progresion?.delta_ldl || null, unidad: 'mg/dL' },
        },
        tipos_riesgo: item.evaluacion.tipos_riesgo,
        factores_clave: item.evaluacion.factores_clave || [],
        recomendacion_preventiva: item.evaluacion.recomendacion_preventiva,
        tiene_progresion: !!item.datos_entrada?.progresion,
      }));
      return { success: true, pacientes: mapped, isDemo: false };
    } catch (err) {
      console.info('[analiticasService] Activando motor de evaluación de referencia:', err.message);
      return {
        success: true,
        pacientes: MOCK_PATIENTS,
        isDemo: true,
        motivoDemo: err.response?.status === 501 
          ? 'Modelo ML en proceso de entrenamiento (501). Mostrando evaluaciones de referencia precalculadas.' 
          : 'Backend FastAPI no conectado. Mostrando datos de prueba locales.',
      };
    }
  },

  /**
   * Envía un caso manual individual al endpoint /api/predict.
   */
  async predecirIndividual(payload) {
    try {
      const res = await apiClient.post('/predict', payload);
      return { success: true, evaluacion: res.data, isDemo: false };
    } catch (err) {
      console.warn('[analiticasService] Fallback predict:', err.message);
      // Fallback heurístico si no hay backend activo
      return {
        success: true,
        isDemo: true,
        evaluacion: {
          hay_riesgo: (payload.filtrado_egfr < 60 || payload.cociente_uacr > 30 || payload.presion_sistolica > 140),
          nivel_prioridad: (payload.filtrado_egfr < 60 && payload.cociente_uacr > 30) ? 'ALTA' : 'MEDIA',
          conclusion_diagnostica: 'Evaluación manual preliminar basada en guías clínicas KDIGO/ESC.',
          tipos_riesgo: {
            riesgo_aterosclerotico: {
              valor: Math.min(0.9, (payload.colesterol_ldl || 100) / 200 * 0.4 + (payload.presion_sistolica || 120) / 180 * 0.3),
              umbral: 0.20,
              alerta: payload.colesterol_ldl > 130 || payload.presion_sistolica > 135,
              interpretacion: 'Riesgo calculado según perfil lipídico y tensional.'
            },
            riesgo_insuficiencia_cardiaca: {
              valor: Math.min(0.8, (payload.presion_sistolica || 120) / 180 * 0.35),
              umbral: 0.15,
              alerta: payload.presion_sistolica > 140,
              interpretacion: 'Riesgo de sobrecarga ventricular.'
            },
            riesgo_cardiorrenal: {
              valor: payload.filtrado_egfr < 70 ? 0.38 : 0.08,
              umbral: 0.18,
              alerta: payload.filtrado_egfr < 70,
              interpretacion: 'Alerta cardiorrenal temprana.'
            }
          },
          factores_clave: [
            {
              variable: 'filtrado_egfr',
              valor_actual: `${payload.filtrado_egfr} mL/min`,
              impacto: payload.filtrado_egfr < 70 ? '+21.4%' : '-12.0%',
              descripcion: 'Tasa de filtración glomerular estimada.',
              fuente: 'Laboratorio'
            }
          ],
          recomendacion_preventiva: 'Revisión periódica de función renal y control de factores de riesgo vascular.',
        }
      };
    }
  }
};

export default analiticasService;
