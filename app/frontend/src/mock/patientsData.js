// src/mock/patientsData.js
// Dataset clínico simulado para soporte preventivo en Atención Primaria
// Refleja exactamente los casos de prueba de data/analiticas/

export const MOCK_PATIENTS = [
  {
    id: "PAC-02-SILENTE",
    archivo: "02_paciente_invisible_deterioro_silente.json",
    nombre: "Manuel S. R.",
    edad: 58,
    sexo: "Hombre",
    categoria: "OCULTO", // OCULTO, ALTO, MEDIO, CONTROLADO
    nivel_prioridad: "ALTA",
    hay_riesgo: true,
    conclusion_diagnostica: "Deterioro silente cardiorrenal y aterosclerótico acelerado con creatinina sérica en rango normal.",
    disparador_principal: "Caída del filtrado glomerular de 86 a 68 mL/min (-20.9%) y microalbuminuria creciente (+17 mg/g) en 12 meses, pese a creatinina 'normal' (1.1 mg/dL).",
    valores_clave: {
      egfr: { actual: 68, previo: 86, delta: -18, unidad: "mL/min/1.73m²", estado: "alerta" },
      uacr: { actual: 35.0, previo: 18.0, delta: 17.0, unidad: "mg/g", estado: "alerta" },
      creatinina: { actual: 1.10, previo: 0.92, delta: 0.18, unidad: "mg/dL", estado: "normal_enganoso" },
      pas: { actual: 136, previo: 126, delta: 10, unidad: "mmHg", estado: "limite" },
      pad: { actual: 84, previo: 78, delta: 6, unidad: "mmHg", estado: "normal" },
      ldl: { actual: 138, previo: 120, delta: 18, unidad: "mg/dL", estado: "limite" },
      hba1c: { actual: 5.9, previo: 5.4, delta: 0.5, unidad: "%", estado: "prediabetes" }
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: {
        valor: 0.28,
        umbral: 0.20,
        alerta: true,
        interpretacion: "Riesgo aterosclerótico moderado-alto impulsado por progresión de tensión y LDL."
      },
      riesgo_insuficiencia_cardiaca: {
        valor: 0.19,
        umbral: 0.15,
        alerta: true,
        interpretacion: "Riesgo incipiente de sobrecarga hemodinámica por caída de función de filtrado."
      },
      riesgo_cardiorrenal: {
        valor: 0.44,
        umbral: 0.18,
        alerta: true,
        interpretacion: "Alerta crítica silenciosa: progresión hacia KDIGO G2-A2 con riesgo cardiovascular triplicado."
      }
    },
    factores_clave: [
      {
        variable: "delta_egfr",
        valor_actual: "-18 mL/min/1.73m²",
        impacto: "+24.5%",
        descripcion: "Pérdida anual superior a 5 mL/min/año define progresión rápida renal subclínica.",
        fuente: "Evolución Temporal"
      },
      {
        variable: "delta_uacr",
        valor_actual: "+17.0 mg/g",
        impacto: "+18.2%",
        descripcion: "Transición de normoalbuminuria a microalbuminuria activa (>30 mg/g).",
        fuente: "Laboratorio Orina"
      },
      {
        variable: "presion_sistolica",
        valor_actual: "136 mmHg",
        impacto: "+9.1%",
        descripcion: "Hipertensión grado 1 mantenida que acelera la esclerosis glomerular.",
        fuente: "Constantes"
      },
      {
        variable: "colesterol_ldl",
        valor_actual: "138 mg/dL",
        impacto: "+6.8%",
        descripcion: "Por encima del objetivo primario (<100 mg/dL en pacientes con daño de órgano diana).",
        fuente: "Perfil Lipídico"
      }
    ],
    recomendacion_preventiva: "Prioridad 1 en AP: Confirmar cociente albúmina/creatinina en 2 meses. Valorar inicio precoz de iSGLT2 / optimización de ARA-II para frenar progresión renal antes de evento macrovascular.",
    tiene_progresion: true
  },
  {
    id: "PAC-01-SANO",
    archivo: "01_paciente_control_sano.json",
    nombre: "Elena V. G.",
    edad: 42,
    sexo: "Mujer",
    categoria: "CONTROLADO",
    nivel_prioridad: "BAJA",
    hay_riesgo: false,
    conclusion_diagnostica: "Perfil biometabólico y cardiorrenal óptimo. Parámetros estables sin trayectoria de daño.",
    disparador_principal: "Filtrado glomerular 98 mL/min y UACR 12 mg/g en rango de protección completa.",
    valores_clave: {
      egfr: { actual: 98, previo: 96, delta: 2, unidad: "mL/min/1.73m²", estado: "optimo" },
      uacr: { actual: 12.0, previo: 11.5, delta: 0.5, unidad: "mg/g", estado: "optimo" },
      creatinina: { actual: 0.80, previo: 0.81, delta: -0.01, unidad: "mg/dL", estado: "optimo" },
      pas: { actual: 118, previo: 116, delta: 2, unidad: "mmHg", estado: "optimo" },
      pad: { actual: 74, previo: 75, delta: -1, unidad: "mmHg", estado: "optimo" },
      ldl: { actual: 98, previo: 102, delta: -4, unidad: "mg/dL", estado: "optimo" },
      hba1c: { actual: 5.2, previo: 5.1, delta: 0.1, unidad: "%", estado: "optimo" }
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: {
        valor: 0.04,
        umbral: 0.20,
        alerta: false,
        interpretacion: "Riesgo ASCVD muy bajo (<5% a 10 años)."
      },
      riesgo_insuficiencia_cardiaca: {
        valor: 0.03,
        umbral: 0.15,
        alerta: false,
        interpretacion: "Sin indicadores de estrés miocárdico o retención."
      },
      riesgo_cardiorrenal: {
        valor: 0.02,
        umbral: 0.18,
        alerta: false,
        interpretacion: "KDIGO G1-A1: Función renal perfecta y endotelio intacto."
      }
    },
    factores_clave: [
      {
        variable: "filtrado_egfr",
        valor_actual: "98 mL/min/1.73m²",
        impacto: "-16.4%",
        descripcion: "Excelente capacidad de depuración renal basal.",
        fuente: "Perfil Renal"
      },
      {
        variable: "colesterol_hdl",
        valor_actual: "58 mg/dL",
        impacto: "-8.2%",
        descripcion: "Niveles protectores frente a aterogénesis.",
        fuente: "Perfil Lipídico"
      }
    ],
    recomendacion_preventiva: "Mantenimiento de estilo de vida saludable y control rutinario habitual cada 2 años.",
    tiene_progresion: true
  },
  {
    id: "PAC-03-EVIDENTE",
    archivo: "03_riesgo_aterosclerotico_evidente.json",
    nombre: "Javier M. T.",
    edad: 66,
    sexo: "Hombre",
    categoria: "ALTO",
    nivel_prioridad: "ALTA",
    hay_riesgo: true,
    conclusion_diagnostica: "Riesgo aterosclerótico y vascular mayor manifiesto con dislipidemia y cifras tensionales descontroladas.",
    disparador_principal: "LDL 175 mg/dL junto a PAS 152 mmHg y microalbuminuria establecida (45 mg/g).",
    valores_clave: {
      egfr: { actual: 72, previo: 75, delta: -3, unidad: "mL/min/1.73m²", estado: "limite" },
      uacr: { actual: 45.0, previo: 40.0, delta: 5.0, unidad: "mg/g", estado: "alerta" },
      creatinina: { actual: 1.25, previo: 1.20, delta: 0.05, unidad: "mg/dL", estado: "limite" },
      pas: { actual: 152, previo: 148, delta: 4, unidad: "mmHg", estado: "alerta" },
      pad: { actual: 92, previo: 88, delta: 4, unidad: "mmHg", estado: "alerta" },
      ldl: { actual: 175, previo: 168, delta: 7, unidad: "mg/dL", estado: "alerta" },
      hba1c: { actual: 6.8, previo: 6.5, delta: 0.3, unidad: "%", estado: "alerta" }
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: {
        valor: 0.52,
        umbral: 0.20,
        alerta: true,
        interpretacion: "Riesgo cardiovascular muy elevado (>50%). Requiere intervención farmacológica inmediata."
      },
      riesgo_insuficiencia_cardiaca: {
        valor: 0.29,
        umbral: 0.15,
        alerta: true,
        interpretacion: "Presión de pulso elevada y rigidez arterial con repercusión en cavidades izquierdas."
      },
      riesgo_cardiorrenal: {
        valor: 0.31,
        umbral: 0.18,
        alerta: true,
        interpretacion: "KDIGO G2-A2 confirmada con albuminuria persistente."
      }
    },
    factores_clave: [
      {
        variable: "colesterol_ldl",
        valor_actual: "175 mg/dL",
        impacto: "+31.0%",
        descripcion: "Dislipidemia aterogénica severa no tratada.",
        fuente: "Perfil Lipídico"
      },
      {
        variable: "presion_sistolica",
        valor_actual: "152 mmHg",
        impacto: "+22.5%",
        descripcion: "HTA grado 2 con sobrecarga de pared vascular.",
        fuente: "Constantes"
      }
    ],
    recomendacion_preventiva: "Ajuste estricto de estatinas de alta potencia (Atorvastatina/Rosuvastatina) y terapia combinada antihipertensiva.",
    tiene_progresion: true
  },
  {
    id: "PAC-04-MODO-A",
    archivo: "04_analitica_aislada_modo_a.json",
    nombre: "Carmen L. P.",
    edad: 51,
    sexo: "Mujer",
    categoria: "MEDIO",
    nivel_prioridad: "MEDIA",
    hay_riesgo: true,
    conclusion_diagnostica: "Evaluación aislada Modo A: Riesgo moderado intermedio sin analítica previa para calcular deltas.",
    disparador_principal: "LDL 142 mg/dL y eGFR 64 mL/min en límite bajo de normalidad sin referencia histórica disponible.",
    valores_clave: {
      egfr: { actual: 64, previo: null, delta: null, unidad: "mL/min/1.73m²", estado: "limite" },
      uacr: { actual: 28.0, previo: null, delta: null, unidad: "mg/g", estado: "limite" },
      creatinina: { actual: 1.05, previo: null, delta: null, unidad: "mg/dL", estado: "normal" },
      pas: { actual: 132, previo: null, delta: null, unidad: "mmHg", estado: "limite" },
      pad: { actual: 82, previo: null, delta: null, unidad: "mmHg", estado: "normal" },
      ldl: { actual: 142, previo: null, delta: null, unidad: "mg/dL", estado: "limite" },
      hba1c: { actual: 5.7, previo: null, delta: null, unidad: "%", estado: "limite" }
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: {
        valor: 0.18,
        umbral: 0.20,
        alerta: false,
        interpretacion: "Límite superior de normalidad; requiere seguimiento a 6 meses."
      },
      riesgo_insuficiencia_cardiaca: {
        valor: 0.11,
        umbral: 0.15,
        alerta: false,
        interpretacion: "Parámetros hemodinámicos en compensación."
      },
      riesgo_cardiorrenal: {
        valor: 0.22,
        umbral: 0.18,
        alerta: true,
        interpretacion: "Alerta por eGFR en 64 mL/min. Requiere programar analítica de control para activar Modo B de evolución."
      }
    },
    factores_clave: [
      {
        variable: "filtrado_egfr",
        valor_actual: "64 mL/min/1.73m²",
        impacto: "+12.8%",
        descripcion: "Zona gris entre estadio G1 y G2.",
        fuente: "Perfil Renal"
      },
      {
        variable: "colesterol_ldl",
        valor_actual: "142 mg/dL",
        impacto: "+9.4%",
        descripcion: "Riesgo aterosclerótico añadido en paciente femenina perimenopáusica.",
        fuente: "Perfil Lipídico"
      }
    ],
    recomendacion_preventiva: "Solicitar analítica completa con UACR en 6 meses para calcular trayectoria de deterioro (Modo B).",
    tiene_progresion: false
  },
  {
    id: "PAC-05-LOTE-01",
    archivo: "05_lote_cupo_semanal.csv (Fila 1)",
    nombre: "Antonio B. F.",
    edad: 61,
    sexo: "Hombre",
    categoria: "OCULTO",
    nivel_prioridad: "ALTA",
    hay_riesgo: true,
    conclusion_diagnostica: "Deterioro silente detectado en cribado de cupo: disociación entre glucemia y lesión endotelial renal.",
    disparador_principal: "Microalbuminuria acelerada (+22 mg/g) con HbA1c aparentemente controlada (6.2%).",
    valores_clave: {
      egfr: { actual: 70, previo: 84, delta: -14, unidad: "mL/min/1.73m²", estado: "alerta" },
      uacr: { actual: 38.0, previo: 16.0, delta: 22.0, unidad: "mg/g", estado: "alerta" },
      creatinina: { actual: 1.12, previo: 0.95, delta: 0.17, unidad: "mg/dL", estado: "normal_enganoso" },
      pas: { actual: 138, previo: 128, delta: 10, unidad: "mmHg", estado: "limite" },
      pad: { actual: 85, previo: 80, delta: 5, unidad: "mmHg", estado: "normal" },
      ldl: { actual: 128, previo: 118, delta: 10, unidad: "mg/dL", estado: "limite" },
      hba1c: { actual: 6.2, previo: 5.8, delta: 0.4, unidad: "%", estado: "limite" }
    },
    tipos_riesgo: {
      riesgo_aterosclerotico: {
        valor: 0.24,
        umbral: 0.20,
        alerta: true,
        interpretacion: "Alerta moderada por incremento de tensión arterial sistólica."
      },
      riesgo_insuficiencia_cardiaca: {
        valor: 0.17,
        umbral: 0.15,
        alerta: true,
        interpretacion: "Tendencia de presión diferencial ensanchada."
      },
      riesgo_cardiorrenal: {
        valor: 0.39,
        umbral: 0.18,
        alerta: true,
        interpretacion: "Deterioro silente: la microalbuminuria predice evento cardiovascular antes de 3 años."
      }
    },
    factores_clave: [
      {
        variable: "delta_uacr",
        valor_actual: "+22.0 mg/g",
        impacto: "+21.0%",
        descripcion: "Aumento rápido de daño podocitario glomerular.",
        fuente: "Laboratorio Orina"
      },
      {
        variable: "delta_egfr",
        valor_actual: "-14 mL/min/1.73m²",
        impacto: "+17.6%",
        descripcion: "Pérdida acelerada de masa de nefronas funcionantes.",
        fuente: "Evolución Temporal"
      }
    ],
    recomendacion_preventiva: "Citar en consulta de enfermería y medicina de familia para ajuste de tratamiento y protección cardiorrenal.",
    tiene_progresion: true
  }
];

export const MOCK_KPIS = {
  totalPacientes: 24,
  pacientesAnalizados: 24,
  riesgoOcultoDetectado: 8,
  altoRiesgoEvidente: 5,
  riesgoModerado: 4,
  controlados: 7,
  tasaDeteccionTemprana: "33.3%",
  egfrMedioCupo: "74.2 mL/min",
  tiempoAhorradoEstimado: "4.8 h/semana"
};
