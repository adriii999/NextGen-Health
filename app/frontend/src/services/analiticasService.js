import apiClient from './apiClient.js';

const number = (value) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

export function mapPatient(item, index) {
  if (!item?.evaluacion || !item.archivo) throw new Error('Respuesta de análisis inválida.');
  const raw = item.datos_entrada || {};
  const evaluation = item.evaluacion;
  const progression = raw.progresion || raw;
  const fields = [
    ['egfr', 'egfr', 'delta_egfr', 'mL/min/1,73 m²', 'Filtrado glomerular'],
    ['uacr', 'uacr', 'delta_uacr', 'mg/g', 'Albuminuria'],
    ['pas', 'ap_hi', 'delta_ap_hi', 'mmHg', 'Presión sistólica'],
    ['pad', 'ap_lo', null, 'mmHg', 'Presión diastólica'],
    ['colesterol', 'colesterol_total', 'delta_colesterol', 'mg/dL', 'Colesterol total'],
    ['bmi', 'bmi', 'delta_bmi', 'kg/m²', 'Índice de masa corporal'],
  ];
  const valores_clave = Object.fromEntries(fields.map(([key, source, delta, unidad, label]) => [
    key, { actual: number(raw[source]), delta: number(progression[delta]), unidad, label },
  ]));
  return {
    ...evaluation,
    id: `${item.archivo}:${index}`,
    nombre: raw.nombre || item.archivo,
    archivo: item.archivo,
    edad: number(raw.edad),
    categoria: { ALTA: 'ALTO', MEDIA: 'MEDIO', BAJA: 'CONTROLADO' }[evaluation.nivel_prioridad],
    valores_clave,
    tiene_progresion: Object.values(valores_clave).some((value) => value.delta !== null),
    disparador_principal: evaluation.factores_clave?.[0]?.descripcion,
  };
}

export function analysisError(error) {
  if (error.response?.status === 501) return 'El modelo todavía no está disponible. Puedes consultar los archivos y volver a intentar el análisis más adelante.';
  if (!error.response && error.code) return 'No se ha podido conectar con el servicio. Comprueba la conexión y vuelve a intentarlo.';
  return 'No se ha podido completar la operación. Vuelve a intentarlo.';
}

export const analiticasService = {
  async checkHealth() {
    try {
      const { data } = await apiClient.get('/health');
      return { online: true, modelo_cargado: !!data.modelo_cargado };
    } catch {
      return { online: false, modelo_cargado: false };
    }
  },
  async getArchivosAnaliticas() {
    const { data } = await apiClient.get('/analiticas');
    if (!Array.isArray(data)) throw new Error('Listado de archivos inválido.');
    return { success: true, archivos: data, fromApi: true };
  },
  async analizarCarpeta() {
    const { data } = await apiClient.post('/analiticas/analizar-carpeta', undefined, { timeout: 120000 });
    if (!Array.isArray(data)) throw new Error('Respuesta de análisis inválida.');
    return { success: true, pacientes: data.map(mapPatient), isDemo: false };
  },
  async predecirIndividual(payload) {
    const { data } = await apiClient.post('/predict', payload, { timeout: 120000 });
    return { success: true, evaluacion: data, isDemo: false };
  },
};
