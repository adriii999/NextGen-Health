import apiClient from './apiClient.js';

const number = (value) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

export function mapPatient(item, index = 0) {
  const incompleteStates = ['DATOS_INSUFICIENTES', 'DATOS_NO_VALIDOS'];
  if (!item?.archivo || (!item.evaluacion && !incompleteStates.includes(item.estado))) {
    throw new Error('Respuesta de análisis inválida.');
  }
  const raw = item.datos_entrada || {};
  const evaluation = item.evaluacion || {};
  const progression = raw.progresion || {};
  const fields = [
    ['egfr', 'egfr', 'delta_egfr', 'mL/min/1,73 m²', 'Filtrado del riñón'],
    ['uacr', 'uacr', 'delta_uacr', 'mg/g', 'Albúmina en orina'],
    ['pas', 'ap_hi', 'delta_ap_hi', 'mmHg', 'Presión arterial sistólica'],
    ['pad', 'ap_lo', null, 'mmHg', 'Presión arterial diastólica'],
    ['colesterol', 'colesterol_total', 'delta_colesterol', 'mg/dL', 'Colesterol total'],
    ['bmi', 'bmi', 'delta_bmi', 'kg/m²', 'Índice de masa corporal (IMC)'],
  ];
  const valores_clave = Object.fromEntries(fields.map(([key, source, delta, unidad, label]) => [
    key,
    {
      actual: number(raw[source]),
      delta: delta ? number(progression[delta] ?? raw[delta]) : null,
      unidad,
      label,
    },
  ]));
  const tiene_progresion = Object.values(valores_clave).some((value) => value.delta !== null);
  const modo_evaluacion = raw.modo_evaluacion || (tiene_progresion ? 'MODO_B' : 'MODO_A');
  const paciente_id = raw.paciente_id || item.archivo;
  const analitica_evaluada = raw.analitica_evaluada || item.archivo;

  return {
    ...evaluation,
    id: `${paciente_id}:${modo_evaluacion}:${analitica_evaluada}:${index}`,
    paciente_id,
    nombre: raw.nombre || item.archivo,
    archivo: item.archivo,
    analitica_evaluada,
    modo_evaluacion,
    num_analiticas: number(raw.num_analiticas) || 1,
    historial_visitas: Array.isArray(raw.historial_visitas) ? raw.historial_visitas : [],
    edad: number(raw.edad),
    sexo: number(raw.sexo),
    fuma: number(raw.fuma),
    diabetes: number(raw.diabetes),
    categoria: { ALTA: 'ALTO', MEDIA: 'MEDIO', BAJA: 'CONTROLADO' }[evaluation.nivel_prioridad],
    valores_clave,
    tiene_progresion,
    disparador_principal: evaluation.factores_clave?.[0]?.descripcion,
    datos_entrada: raw,
    estado: item.estado || 'EVALUADA',
    campos_pendientes: item.campos_pendientes || [],
    errores_datos: item.errores_datos || [],
  };
}

export function analysisError(error) {
  if (error?.response?.status === 501) return 'No se puede revisar el cupo porque falta el modelo de evaluación. Avisa al equipo técnico.';
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => {
    const location = item.loc || [];
    const index = location.indexOf('visitas');
    const file = index >= 0 && Number.isInteger(location[index + 1]) ? `Archivo ${location[index + 1] + 1}, ` : '';
    return `${file}${location.at(-1) === 'body' ? 'Carga' : location.at(-1)}: ${item.msg}`;
  }).join('\n');
  if (typeof detail === 'string') return detail;
  if (error?.response?.status === 422) return 'Los parámetros introducidos están fuera de los rangos fisiológicos permitidos.';
  if (!error?.response && error?.code) return 'No se pudo conectar para revisar las analíticas. Comprueba la conexión e inténtalo de nuevo.';
  return detail?.mensaje || error?.message || 'No se ha podido completar la operación. Vuelve a intentarlo.';
}

export const analiticasService = {
  async validarCarga(payload) {
    const { data } = await apiClient.post('/analiticas/validar-carga', payload);
    return data;
  },
  async evaluarCarga(payload) {
    const { data } = await apiClient.post('/analiticas/evaluar-carga', payload, { timeout: 120000 });
    return mapPatient(data);
  },
  async evaluarSeleccion(paciente_id, analiticas_archivos) {
    const { data } = await apiClient.post('/analiticas/evaluar',
      { paciente_id, analiticas_archivos }, { timeout: 120000 });
    return mapPatient(data);
  },
  async checkHealth() {
    try {
      const { data } = await apiClient.get('/health');
      return { online: true, modelo_cargado: !!data.modelo_cargado, estado_modelo: data.estado_modelo };
    } catch {
      return { online: false, modelo_cargado: false };
    }
  },
  async getArchivosAnaliticas() {
    const { data } = await apiClient.get('/analiticas');
    if (!Array.isArray(data)) throw new Error('Listado de archivos inválido.');
    return { success: true, archivos: data, fromApi: true };
  },
  async getVersionFuentes() {
    const { data } = await apiClient.get('/analiticas/version-fuentes');
    if (typeof data?.version !== 'string') throw new Error('No se pudo comprobar si hay cambios en las analíticas.');
    return data.version;
  },
  async analizarCarpeta(modo = 'B') {
    const { data } = await apiClient.post(`/analiticas/analizar-carpeta?modo=${encodeURIComponent(modo)}`, undefined, { timeout: 120000 });
    if (!Array.isArray(data)) throw new Error('Respuesta de análisis inválida.');
    return { success: true, pacientes: data.map((item, idx) => mapPatient(item, idx)) };
  },
  async evaluarSeguimientoOAnalitica({ paciente_id, modo = 'B', analitica_archivo = null }) {
    const { data } = await apiClient.post(
      '/analiticas/evaluar',
      { paciente_id, modo, analitica_archivo },
      { timeout: 120000 }
    );
    if (!data?.evaluacion) throw new Error('Respuesta de evaluación inválida.');
    return { success: true, paciente: mapPatient(data, 0) };
  },
  async predecirIndividual(payload) {
    const { data } = await apiClient.post('/predict', payload, { timeout: 120000 });
    return { success: true, evaluacion: data };
  },
};
