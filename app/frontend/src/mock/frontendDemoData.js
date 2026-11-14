const risk = (value, umbral, alerta, interpretacion) => ({ value, valor: value, umbral, alerta, interpretacion });

export const DEMO_FILES = [
  { archivo: 'demo_paciente_01.json', fecha_modificacion: 'DEMO', tamano_bytes: 384, tiene_progresion: true },
  { archivo: 'demo_paciente_02.json', fecha_modificacion: 'DEMO', tamano_bytes: 392, tiene_progresion: true },
];

export const DEMO_PATIENTS = [
  {
    id: 'demo-paciente-01',
    nombre: 'Paciente DEMO 01',
    archivo: 'demo_paciente_01.json',
    edad: 54,
    categoria: 'MEDIO',
    nivel_prioridad: 'MEDIA',
    isDemo: true,
    conclusion_diagnostica: 'Ejemplo visual: riesgo cardiorrenal por encima del umbral de referencia en estos datos ficticios.',
    disparador_principal: 'Ejemplo ficticio de evolución de filtrado glomerular y albuminuria.',
    recomendacion_preventiva: 'Este texto es una recomendación ficticia, únicamente para mostrar el diseño.',
    tiene_progresion: true,
    valores_clave: {
      egfr: { actual: 68, delta: -8, unidad: 'mL/min/1,73 m²', label: 'Filtrado glomerular' },
      uacr: { actual: 42, delta: 18, unidad: 'mg/g', label: 'Albuminuria' },
      pas: { actual: 138, delta: 8, unidad: 'mmHg', label: 'Presión sistólica' },
      pad: { actual: 86, delta: null, unidad: 'mmHg', label: 'Presión diastólica' },
      colesterol: { actual: 208, delta: 12, unidad: 'mg/dL', label: 'Colesterol total' },
      bmi: { actual: 27.4, delta: 0.8, unidad: 'kg/m²', label: 'Índice de masa corporal' },
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: risk(0.24, 0.2, true, 'Ejemplo ficticio de riesgo aterosclerótico.'),
      riesgo_insuficiencia_cardiaca: risk(0.12, 0.15, false, 'Ejemplo ficticio de riesgo de insuficiencia cardíaca.'),
      riesgo_cardiorrenal: risk(0.37, 0.18, true, 'Ejemplo ficticio de riesgo cardiorrenal.'),
    },
    factores_clave: [
      { variable: 'delta_egfr', valor_actual: '-8 mL/min/1,73 m²', impacto: '+18.4%', descripcion: 'Contribución ficticia para ilustrar la gráfica.', fuente: 'Demo' },
      { variable: 'delta_uacr', valor_actual: '+18 mg/g', impacto: '+13.2%', descripcion: 'Contribución ficticia para ilustrar la gráfica.', fuente: 'Demo' },
      { variable: 'presion_sistolica', valor_actual: '138 mmHg', impacto: '-4.5%', descripcion: 'Contribución ficticia protectora para ilustrar la gráfica.', fuente: 'Demo' },
    ],
  },
  {
    id: 'demo-paciente-02',
    nombre: 'Paciente DEMO 02',
    archivo: 'demo_paciente_02.json',
    edad: 46,
    categoria: 'CONTROLADO',
    nivel_prioridad: 'BAJA',
    isDemo: true,
    conclusion_diagnostica: 'Ejemplo visual: estimaciones ficticias por debajo de los umbrales mostrados.',
    disparador_principal: 'Ejemplo ficticio con valores relativamente estables.',
    recomendacion_preventiva: 'Este texto es una recomendación ficticia, únicamente para mostrar el diseño.',
    tiene_progresion: true,
    valores_clave: {
      egfr: { actual: 94, delta: -1, unidad: 'mL/min/1,73 m²', label: 'Filtrado glomerular' },
      uacr: { actual: 12, delta: 1, unidad: 'mg/g', label: 'Albuminuria' },
      pas: { actual: 118, delta: -2, unidad: 'mmHg', label: 'Presión sistólica' },
      pad: { actual: 74, delta: null, unidad: 'mmHg', label: 'Presión diastólica' },
      colesterol: { actual: 172, delta: -6, unidad: 'mg/dL', label: 'Colesterol total' },
      bmi: { actual: 23.8, delta: -0.2, unidad: 'kg/m²', label: 'Índice de masa corporal' },
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: risk(0.08, 0.2, false, 'Ejemplo ficticio de riesgo aterosclerótico.'),
      riesgo_insuficiencia_cardiaca: risk(0.05, 0.15, false, 'Ejemplo ficticio de riesgo de insuficiencia cardíaca.'),
      riesgo_cardiorrenal: risk(0.06, 0.18, false, 'Ejemplo ficticio de riesgo cardiorrenal.'),
    },
    factores_clave: [
      { variable: 'egfr', valor_actual: '94 mL/min/1,73 m²', impacto: '-11.3%', descripcion: 'Contribución ficticia para ilustrar la gráfica.', fuente: 'Demo' },
      { variable: 'uacr', valor_actual: '12 mg/g', impacto: '-7.1%', descripcion: 'Contribución ficticia para ilustrar la gráfica.', fuente: 'Demo' },
    ],
  },
];
