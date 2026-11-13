# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular

## 1. Contexto del Proyecto y Enfoque de la Demo
**Objetivo:** Desarrollar un prototipo / demo para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP).
**Enfoque de Demo Ligera (Sin Base de Datos de Usuarios):**
No es una aplicación con gestión de usuarios ni base de datos relacional. Funciona como una herramienta de demostración directa sobre **archivos de analíticas almacenados en una carpeta** (ej. `data/analiticas/` en formato CSV o JSON) que simulan las extracciones del laboratorio o del sistema de salud:
* **Modo Principal ("Analizar Carpeta de Analíticas"):** Un botón central que lee y analiza de golpe las analíticas existentes en la carpeta para emitir la segunda opinión médica, clasificando y ordenando los casos por urgencia preventiva.
* **Modo Demo ("Simulador de Analítica Manual"):** Pestaña secundaria con un formulario de 10 valores para simular o alterar una analítica en tiempo real durante la presentación.
* **Salida Multidimensional ("Tipos de Riesgo"):** El sistema clasifica el riesgo en **tres fenotipos clínicos** (Aterosclerótico, Insuficiencia Cardíaca y Cardiorrenal) siguiendo guías médicas de la ESC, SEC y ecuaciones PREVENT/SCORE2-HF. Si ningún valor supera su umbral, concluye: *"Sin riesgo significativo detectado"*.

---

## 2. Fuentes de Datos (Datasets) y Justificación

Para entrenar el modelo XGBoost ante la imposibilidad legal de compartir datos reales protegidos por RGPD, se adopta un enfoque híbrido:

### 2.1 Fuente 1 (Principal - Población España): NutriSynthCare
* **Enlace:** [https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio)
* **Utilidad:** Modela la demografía, diabetes y factores de riesgo propios de la población atendida en Atención Primaria en España.

### 2.2 Fuente 2 (Apoyo Estadístico y Volumen): Cardiovascular Disease Dataset
* **Enlace:** [https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset)
* **Utilidad:** 70.000 registros clínicos para aportar volumen y calibración estadística robusta de presión arterial, colesterol e IMC.

### 2.3 Síntesis Clínica Calibrada (Función Cardiorrenal)
Inyección de variables renales correlacionadas mediante modelado fisiopatológico según guías KDIGO:
* **`egfr` (Tasa de Filtración Glomerular)**: Deterioro progresivo asintomático.
* **`uacr` (Cociente Albúmina/Creatinina en orina)**: Microalbuminuria silenciosa.

---

## 3. Definición del Dataset y Variables

### 3.1 Variables Clínicas de Entrada (Features de la Analítica)
Son los 10 valores que componen cada registro analítico (tanto en los archivos de la carpeta como en el simulador manual):

| Variable | Nombre Clínico | Rango / Tipo | Fuente de Origen | Justificación Médica |
| :--- | :--- | :--- | :--- | :--- |
| `edad` | Edad | Años (30 – 85) | **Fuente 1** (`Edad`) / **Fuente 2** (`age_years`) | Multiplicador de riesgo vascular basal. |
| `sexo` | Sexo biológico | 1: Mujer, 2: Hombre | **Fuente 1** (`Genero`) / **Fuente 2** (`gender`) | Diferenciación de riesgo según sexo. |
| `bmi` | Índice de Masa Corporal | $\text{kg/m}^2$ (15.0 – 60.0) | **Fuente 1** (`IMC`) / **Fuente 2** ($\text{peso}/\text{altura}^2$) | Sobrecarga metabólica y hemodinámica. |
| `ap_hi` | Presión Sistólica | mmHg (80 – 220) | **Fuente 1** (`Presion_Arterial_Sis`) / **Fuente 2** (`ap_hi`) | Daño endotelial e hipertrofia vascular. |
| `ap_lo` | Presión Diastólica | mmHg (50 – 130) | **Fuente 1** (`Presion_Arterial_Dia`) / **Fuente 2** (`ap_lo`) | Resistencia periférica vascular. |
| `colesterol` | Nivel de Colesterol | Categórico: 1, 2, 3 | **Fuente 1** (`Colesterol`) / **Fuente 2** (`cholesterol`) | Sustrato aterogénico (formación de placa). |
| `fuma` | Tabaquismo activo | Binario: 0 = No, 1 = Sí | **Fuente 1** (`Fumador`) / **Fuente 2** (`smoke`) | Acelerador de disfunción endotelial. |
| `diabetes` | Presencia de Diabetes | Binario: 0 = No, 1 = Sí | **Fuente 1** (`Diabetes` / Glucosa) / **Fuente 2** (`gluc`) | Duplica el riesgo vascular y renal. |
| `egfr` | Tasa Filtración Glomerular | $\text{mL/min}/1.73\text{m}^2$ (15 – 120) | **Síntesis Clínica Calibrada** (KDIGO) | Deterioro de función renal asintomático. |
| `uacr` | Albúmina/Creatinina en orina | $\text{mg/g}$ (2 – 300) | **Síntesis Clínica Calibrada** (KDIGO) | Marcador de daño microvascular temprano. |

### 3.2 Etiquetas de Entrenamiento (Supervisión en los CSVs de Desarrollo)
* `target_cardio`: Evento histórico presente solo en los CSV de entrenamiento para que XGBoost aprenda y optimice la sensibilidad (*recall*). No forma parte de la inferencia.

---

## 4. Tipos de Riesgo Evaluados (Guías ESC / SEC / PREVENT)

1. **Riesgo Aterosclerótico (ASCVD - Infarto / Ictus):**
   * *Variables determinantes:* `edad`, `sexo`, `colesterol`, `ap_hi`, `fuma`.
   * *Umbral de alerta:* $\ge 10\%$.
2. **Riesgo de Insuficiencia Cardíaca (Heart Failure - IC):**
   * *Variables determinantes:* `bmi`, `ap_hi`, `ap_lo`, `diabetes`, `edad`, `uacr`.
   * *Umbral de alerta:* $\ge 8\%$.
3. **Riesgo Cardiorrenal (Deterioro Renal Silencioso):**
   * *Variables determinantes:* `uacr` $\ge 30\text{ mg/g}$, `egfr` $< 60\text{ mL/min}$, `diabetes`, `ap_hi`.
   * *Umbral de alerta:* $\ge 12\%$.

> **Regla de Conclusión Diagnóstica:**
> * Si **ningún subtipo supera su umbral**: Conclusión: **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**.
> * Si **uno o más superan el umbral**: Alerta con desglose del tipo de riesgo afectado, factores explicativos SHAP y recomendación preventiva.

---

## 5. Diseño de la API (FastAPI)
### Endpoints:
* `GET /api/analiticas`: Lista las analíticas encontradas en la carpeta de datos (`data/analiticas/`).
* `POST /api/analiticas/analizar-carpeta`: **(Flujo Principal en 1 Clic)** Procesa y evalúa todas las analíticas de la carpeta de una vez, devolviendo la lista de analíticas analizadas, ordenadas por prioridad de riesgo.
* `POST /api/predict`: **(Modo Simulador / Demo)** Recibe un JSON con los 10 valores de una analítica concreta y devuelve su evaluación multidimensional al instante.

#### Payload de Entrada (`POST /api/predict`):
```json
{
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

#### Formato de Respuesta de Evaluación:
```json
{
  "hay_riesgo": true,
  "conclusion_diagnostica": "Riesgo detectado: sospecha de deterioro cardiorrenal temprano e insuficiencia cardíaca incipiente con perfil lipídico normal.",
  "nivel_prioridad": "ALTA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": { "valor": 0.08, "umbral": 0.10, "alerta": false, "interpretacion": "Bajo (colesterol y hábitos controlados)" },
    "riesgo_insuficiencia_cardiaca": { "valor": 0.14, "umbral": 0.08, "alerta": true, "interpretacion": "Moderado-Alto (sobrecarga tensional + diabetes)" },
    "riesgo_cardiorrenal": { "valor": 0.22, "umbral": 0.12, "alerta": true, "interpretacion": "Alto (microalbuminuria UACR 38.5 mg/g con eGFR 68 mL/min)" }
  },
  "factores_clave": [
    { "variable": "uacr", "valor_actual": "38.5 mg/g", "impacto": "+14%", "descripcion": "Microalbuminuria activa: marcador precoz de daño vascular renal" },
    { "variable": "egfr", "valor_actual": "68 mL/min", "impacto": "+11%", "descripcion": "Filtrado glomerular en rango limítrofe estadio G2" },
    { "variable": "diabetes", "valor_actual": "Sí", "impacto": "+9%", "descripcion": "Multiplicador de riesgo endotelial" }
  ],
  "recomendacion_preventiva": "Solicitar confirmación de UACR en 3 meses, control tensional (<130 mmHg) y valorar iSGLT2."
}
```

---

## 6. Vistas de Usuario (Frontend React + Tailwind)
1. **Pestaña Principal ("Segunda Opinión sobre Analíticas"):**
   * Muestra los archivos/registros analíticos cargados en la carpeta local.
   * Botón destacado: *"Analizar Analíticas"* (`POST /api/analiticas/analizar-carpeta`).
   * Despliega los resultados en tarjetas ordenadas por severidad con badges de alerta, gráficos de los 3 tipos de riesgo y factores clave.
2. **Pestaña Secundaria ("Simulador Manual"):**
   * Formulario directo con los 10 parámetros analíticos para modificar valores sobre la marcha (`POST /api/predict`) y ver cómo reaccionan las alertas.
