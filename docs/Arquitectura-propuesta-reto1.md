# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular

## 1. Contexto del Proyecto y Flujo de Trabajo Clínico
**Objetivo:** Desarrollar un prototipo (MVP) para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP) en el Sistema Nacional de Salud (SNS español).
**Problema:** En consultas con apenas 5-7 minutos por paciente, analíticas rutinarias con valores aparentemente "aceptables" o en rangos limítrofes enmascaran riesgos cardiovasculares elevados (especialmente por deterioro renal asintomático o sobrecarga cardíaca). Los médicos no disponen de tiempo para transcribir datos manualmente a calculadoras externas.
**Solución ("Segunda Opinión con 1 Clic"):**
* **Modo Principal (Consulta Real de AP):** Un botón que analiza directamente la analítica ya cargada en la historia del paciente (o un lote de pacientes del cupo del día) para emitir una segunda opinión médica inmediata, explicable y sin carga administrativa.
* **Modo Demo / Simulador Manual:** Pestaña secundaria para introducir o ajustar 10 variables clínicas manualmente, diseñada para pruebas interactivas durante la evaluación del reto o casos no informatizados.
* **Salida Multidimensional ("Tipos de Riesgo"):** El sistema clasifica el riesgo en **tres fenotipos clínicos** (Aterosclerótico, Insuficiencia Cardíaca y Cardiorrenal) siguiendo guías médicas de la ESC, SEC y ecuaciones PREVENT/SCORE2-HF. Si no se supera ningún umbral, concluye categóricamente: *"Sin riesgo significativo detectado"*.

---

## 2. Fuentes de Datos (Datasets) y Justificación

Debido a las restricciones de protección de datos (RGPD) para acceder en abierto a historiales clínicos españoles reales (ej. BIFAP o PADRIS), el entrenamiento y calibración del modelo adopta un **enfoque híbrido**:

### 2.1 Fuente 1 (Principal): NutriSynthCare - Salud, Diabetes y Riesgo CV en España
* **Enlace:** [https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio)
* **Descripción y Utilidad:** Dataset sintético diseñado para modelar la población de pacientes en España con diabetes, sobrepeso y comorbilidad cardiovascular. Refleja fielmente la demografía y los perfiles habituales de la consulta de Atención Primaria española (el entorno de trabajo de la Dra. Carmen).

### 2.2 Fuente 2 (Secundaria / Apoyo Estadístico): Cardiovascular Disease Dataset
* **Enlace:** [https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset)
* **Descripción y Utilidad:** Dataset de 70.000 registros clínicos con medidas antropométricas y eventos cardiovasculares confirmados. Aporta volumen y robustez matemática para que el algoritmo XGBoost aprenda interacciones biomédicas no lineales universales de tensión arterial, colesterol e IMC.

### 2.3 Generación Sintética de Variables Renales y Cardiorrenales (Clínicamente Guiada)
Dado que los datasets abiertos estándar no suelen registrar determinaciones de laboratorio renal continuo en orina, el pipeline de preprocesamiento (`prepare_data.py`) inyecta variables renales correlacionadas mediante modelado fisiopatológico:
* **Tasa de Filtración Glomerular estimada (`egfr`)**: Deterioro asociado a edad, hipertensión no controlada y diabetes.
* **Cociente Albúmina/Creatinina en orina (`uacr`)**: Microalbuminuria asintomática presente en etapas tempranas de enfermedad cardiorrenal.

---

## 3. Definición del Dataset y Trazabilidad de Variables

### 3.1 Variables de Entrada (Features utilizadas para Inferencia y Consulta)
Estas son las **únicas 10 variables** que entran al modelo y que viajan en el payload de la API desde la analítica del paciente o el simulador:

| Variable Modelo | Nombre Clínico | Tipo / Rango | Fuente de Origen | Justificación Médica |
| :--- | :--- | :--- | :--- | :--- |
| `edad` | Edad del paciente | Años (30 – 85) | **Fuente 1** (`Edad`) / **Fuente 2** (`age_years`) | Factor multiplicador de riesgo vascular en todas las escalas (SCORE2/PREVENT). |
| `sexo` | Sexo biológico | 1: Mujer, 2: Hombre | **Fuente 1** (`Genero`) / **Fuente 2** (`gender`) | Diferenciación de riesgo cardiovascular basal por sexo. |
| `bmi` | Índice de Masa Corporal | $\text{kg/m}^2$ (15.0 – 60.0) | **Fuente 1** (`IMC`) / **Fuente 2** (calculado: $\text{peso}/\text{altura}^2$) | Marcador de adiposidad visceral y sobrecarga metabólica/hemodinámica. |
| `ap_hi` | Presión Arterial Sistólica | mmHg (80 – 220) | **Fuente 1** (`Presion_Arterial_Sis`) / **Fuente 2** (`ap_hi`) | Causa directa de daño endotelial e hipertrofia ventricular. |
| `ap_lo` | Presión Arterial Diastólica | mmHg (50 – 130) | **Fuente 1** (`Presion_Arterial_Dia`) / **Fuente 2** (`ap_lo`) | Resistencia vascular periférica y sobrecarga miocárdica. |
| `colesterol` | Nivel de Colesterol Total | Categórico: 1: Normal, 2: Limítrofe, 3: Muy Alto | **Fuente 1** (`Colesterol`) / **Fuente 2** (`cholesterol`) | Sustrato directo para la aterogénesis y formación de placa ateromatosa. |
| `fuma` | Tabaquismo activo | Binario: 0 = No, 1 = Sí | **Fuente 1** (`Fumador`) / **Fuente 2** (`smoke`) | Acelerador de disfunción endotelial y trombogénesis. |
| `diabetes` | Presencia de Diabetes Mellitus | Binario: 0 = No, 1 = Sí | **Fuente 1** (`Diabetes` / `Nivel_Glucosa`) / **Fuente 2** (`gluc`) | Factor clave en el perfil de la Dra. Carmen; duplica el riesgo vascular y renal. |
| `egfr` | Tasa Filtración Glomerular | $\text{mL/min}/1.73\text{m}^2$ (15.0 – 120.0) | **Síntesis Clínica Calibrada** (guía KDIGO) | Función renal oculta; $<60\text{ mL/min}$ multiplica eventos de insuficiencia cardíaca. |
| `uacr` | Cociente Albúmina/Creatinina | $\text{mg/g}$ (2.0 – 300.0) | **Síntesis Clínica Calibrada** (guía KDIGO) | Daño microvascular renal silencioso; $\ge 30\text{ mg/g}$ indica microalbuminuria patológica. |

### 3.2 Etiquetas de Entrenamiento (Targets en Fase de Aprendizaje Supervisado)
> [!NOTE]
> Estas variables existen **únicamente en los archivos CSV históricos durante el entrenamiento del modelo** (para que el algoritmo aprenda a relacionar las entradas con el desenlace médico real o evento sucedido). **Nunca forman parte de la entrada de la API ni de la consulta médica**, ya que son precisamente lo que el modelo predice.

* `target_cardio`: Evento cardiovascular histórico en los datasets (0 = No evento, 1 = Evento cardiovascular registrado). Se utiliza como etiqueta de supervisión para calibrar la función de coste y optimizar la sensibilidad (Recall).

---

## 4. Tipos de Riesgo Evaluados (Guías ESC / SEC / PREVENT)

1. **Riesgo Aterosclerótico (ASCVD - Infarto / Ictus):**
   * *Variables determinantes:* `edad`, `sexo`, `colesterol`, `ap_hi`, `fuma`.
   * *Umbral de alerta:* $\ge 10\%$ a 10 años.
2. **Riesgo de Insuficiencia Cardíaca (Heart Failure - IC):**
   * *Variables determinantes:* `bmi`, `ap_hi`, `ap_lo`, `diabetes`, `edad`, `uacr`.
   * *Umbral de alerta:* $\ge 8\%$ (basado en SCORE2-HF / PREVENT-HF).
3. **Riesgo Cardiorrenal (Deterioro Renal Silencioso):**
   * *Variables determinantes:* `uacr` $\ge 30\text{ mg/g}$, `egfr` $< 60\text{ mL/min}$, `diabetes`, `ap_hi`.
   * *Umbral de alerta:* $\ge 12\%$ de probabilidad de progresión / evento adverso renal.

> **Regla de Conclusión Diagnóstica:**
> * Si **ningún subtipo supera su umbral**: El sistema concluye: **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**.
> * Si **uno o más superan el umbral**: El sistema declara alerta diagnóstica, resalta el fenotipo específico comprometido, presenta los factores explicativos SHAP y emite una recomendación preventiva individualizada.

---

## 5. Diseño de la API (FastAPI)

Las rutas de la API quedan simplificadas sin prefijo de versionado innecesario:

### 5.1 Endpoints Principales
* `GET /api/pacientes`: Recupera el listado de pacientes del cupo de Carmen con sus analíticas precargadas.
* `POST /api/pacientes/{id}/predict`: **(Flujo Principal en 1 Clic)** Ejecuta la segunda opinión médica automática sobre la analítica registrada del paciente.
* `POST /api/predict`: **(Modo Simulador / Demo)** Permite enviar un JSON con los 10 valores manualmente y devuelve el diagnóstico multidimensional con SHAP.

#### Payload de Entrada (`POST /api/predict`):
```json
{
  "paciente_id": "PAC-4892",
  "edad": 58,
  "sexo": 1,
  "bmi": 27.2,
  "ap_hi": 138,
  "ap_lo": 86,
  "colesterol": 1,
  "fuma": 0,
  "diabetes": 1,
  "egfr": 68.0,
  "uacr": 38.5
}
```

#### Formato de Respuesta Multidimensional:
```json
{
  "paciente_id": "PAC-4892",
  "hay_riesgo": true,
  "conclusion_diagnostica": "Riesgo detectado: sospecha de deterioro cardiorrenal temprano e insuficiencia cardíaca incipiente con perfil lipídico normal.",
  "nivel_prioridad": "ALTA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": { "valor": 0.08, "umbral": 0.10, "alerta": false, "interpretacion": "Bajo (colesterol y hábitos controlados)" },
    "riesgo_insuficiencia_cardiaca": { "valor": 0.14, "umbral": 0.08, "alerta": true, "interpretacion": "Moderado-Alto (sobrecarga tensional + diabetes)" },
    "riesgo_cardiorrenal": { "valor": 0.22, "umbral": 0.12, "alerta": true, "interpretacion": "Alto (microalbuminuria UACR 38.5 mg/g con eGFR 68 mL/min)" }
  },
  "factores_clave": [
    { "variable": "uacr", "valor_actual": "38.5 mg/g", "impacto": "+14%", "descripcion": "Microalbuminuria activa: marcador precoz de daño vascular renal", "fuente": "Síntesis Clínica Calibrada" },
    { "variable": "egfr", "valor_actual": "68 mL/min", "impacto": "+11%", "descripcion": "Filtrado glomerular en rango limítrofe estadio G2", "fuente": "Síntesis Clínica Calibrada" },
    { "variable": "diabetes", "valor_actual": "Sí", "impacto": "+9%", "descripcion": "Multiplicador de riesgo endotelial", "fuente": "NutriSynthCare España" }
  ],
  "recomendacion_preventiva": "Solicitar confirmación de UACR en 3 meses, control tensional (<130 mmHg) y valorar iSGLT2."
}
```

---

## 6. Vistas de Usuario (Frontend React + Tailwind)
1. **Vista Principal (Cupo de Atención Primaria - 1 Clic):**
   * Tabla con el cupo de pacientes y analíticas precargadas.
   * Botón de acción: *"Obtener Segunda Opinión"* que llama a `POST /api/pacientes/{id}/predict`.
   * Panel de resultados: Tarjetas con los 3 tipos de riesgo, gráfico de radares/barras comparando valor vs. umbral, desglose SHAP y recomendación clínica.
2. **Vista Secundaria (Simulador de Analítica):**
   * Formulario de 10 parámetros que llama a `POST /api/predict` para ajustar valores manualmente y ver los cambios dinámicos en los tipos de riesgo.
