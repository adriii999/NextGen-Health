# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular (Dual: Foto Fija y Progresión Temporal)

## 1. Contexto del Proyecto y Enfoque de la Demo
**Objetivo:** Desarrollar un prototipo / demo para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP) en el Sistema Nacional de Salud (SNS).
**Filosofía de Demo Ligera:** No requiere base de datos ni gestión de usuarios. Analiza archivos de analíticas depositados en una carpeta local (`data/analiticas/`) o ingresados en un simulador manual.

---

## 2. Doble Funcionalidad Analítica: Analítica Aislada vs. Progresión Temporal

El sistema implementa una **arquitectura de evaluación dual** que se adapta dinámicamente a la disponibilidad de datos del paciente:

```
                            ┌──────────────────────────────────────────────┐
                            │      ENTRADA DE DATOS CLÍNICOS              │
                            │  (Carpeta data/analiticas/ o Simulador)      │
                            └──────────────────────┬───────────────────────┘
                                                   │
                   ┌───────────────────────────────┴───────────────────────────────┐
                   ▼                                                               ▼
     ┌───────────────────────────┐                                   ┌───────────────────────────┐
     │ MODO A: FOTO FIJA AISLADA │                                   │ MODO B: PROGRESIÓN TEMPORAL│
     │   (Analítica Única)       │                                   │   (Analítica + Deltas Δ)  │
     └─────────────┬─────────────┘                                   └─────────────┬─────────────┘
                   │                                                               │
                   │ • Primer contacto o sin histórico previo                     │ • Paciente con analítica previa (~12 meses)
                   │ • Deltas = NaN (soporte nativo en XGBoost)                    │ • Calcula variaciones: ΔeGFR, ΔUACR, etc.
                   │ • Evalúa umbrales estáticos absolutos                         │ • Detecta velocidad de deterioro silencioso
                   │ • Aviso: "Falta seguimiento temporal"                         │ • Prioriza caídas aceleradas en rango aceptable
                   │                                                               │
                   └───────────────────────────────┬───────────────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │    MOTOR XGBoost + SHAP     │
                                    │  (missing=np.nan tolerante) │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │ SALIDA MULTIDIMENSIONAL     │
                                    │ 1. Riesgo Aterosclerótico   │
                                    │ 2. Insuficiencia Cardíaca   │
                                    │ 3. Riesgo Cardiorrenal      │
                                    │ (Sin riesgo si no supera)   │
                                    └─────────────────────────────┘
```

### 2.1 Modo A: Analítica Aislada / Foto Fija
* Recibe las 10 determinaciones actuales del laboratorio (`edad`, `sexo`, `bmi`, `ap_hi`, `ap_lo`, `colesterol_total`, `fuma`, `diabetes`, `egfr`, `uacr`).
* Las variaciones temporales ($\Delta$) viajan como nulos (`NaN`).
* **XGBoost procesa nativamente los valores nulos (`missing=np.nan`)** evaluando los valores absolutos actuales.

### 2.2 Modo B: Progresión Temporal ($\Delta$)
* Recibe analítica actual y previa, calculando:
  $$\Delta_{\text{eGFR}} = \text{eGFR}_{\text{actual}} - \text{eGFR}_{\text{previo}}$$
  $$\Delta_{\text{UACR}} = \text{UACR}_{\text{actual}} - \text{UACR}_{\text{previo}}$$
  $$\Delta_{\text{ap\_hi}} = \text{ap\_hi}_{\text{actual}} - \text{ap\_hi}_{\text{previo}}$$
  $$\Delta_{\text{colesterol}} = \text{colesterol}_{\text{actual}} - \text{colesterol}_{\text{previo}}$$
  $$\Delta_{\text{bmi}} = \text{bmi}_{\text{actual}} - \text{bmi}_{\text{previo}}$$
* Destapa el riesgo oculto: un paciente con eGFR actual de 68 mL/min (aparentemente aceptable) con $\Delta_{\text{eGFR}} = -15\text{ mL/min/año}$ dispara la alerta cardiorrenal por deterioro acelerado.

---

## 3. ¿Para qué se usa SHAP (XAI) y por qué es indispensable?

En un entorno médico como la consulta de la Dra. Carmen, un algoritmo que actúe como una **"caja negra"** (entregando solo un porcentaje como *"Riesgo: 82%"*) es **inaceptable e inutilizable clínicamente**:
1. **Confianza médica:** El médico necesita saber **por qué** la herramienta considera que ese paciente está en riesgo, sobre todo si la analítica parece "aceptable" a simple vista.
2. **Identificación de factores agravantes:** **SHAP (`shap.TreeExplainer`)** calcula matemáticamente la contribución exacta (atribución aditiva de Shapley) de cada variable individual al resultado final.
3. **Conversión a lenguaje clínico comprensible:** La librería SHAP nos permite desglosar el resultado en:
   * **Factores agravantes (+):** Por ejemplo, *"La caída de eGFR (-14 mL/min) aporta un +18% al riesgo"*, *"La microalbuminuria UACR 38.5 mg/g aporta un +14%"*.
   * **Factores protectores (-):** Por ejemplo, *"No ser fumador reduce un -8% el riesgo aterosclerótico"*.
4. **Acción preventiva directa:** Al conocer con precisión qué parámetro eleva el riesgo, el sistema emite una recomendación clínica orientada a la causa (ej. si el culpable es `delta_uacr`, solicitar confirmación en 3 meses e iniciar nefroprotección con iSGLT2).

---

## 4. Stack Tecnológico y Librerías

* **Frontend:** React 18+ (Vite), Tailwind CSS, Lucide Icons y Recharts (para visualización de radar de riesgos y barras de impacto SHAP).
* **Backend:** FastAPI (Python 3.10+), Pydantic v2.
* **Librerías de Machine Learning & XAI:**
  * **`xgboost`:** Clasificador de gradiente para datos tabulares con soporte nativo de valores ausentes (`missing=np.nan`).
  * **`shap` (`TreeExplainer`):** Motor de explicabilidad algorítmica para extraer las contribuciones de cada parámetro analítico y traducirlas a impactos porcentuales (+X% / -X%).
  * **`joblib`:** Serialización y carga en memoria del modelo entrenado y del explicador SHAP.
  * **`scikit-learn`:** Validación cruzada (`StratifiedKFold`) y calibración de curvas Precision-Recall para Recall $\ge 85\%$.
  * **`pandas` y `numpy`:** Procesamiento de matrices y cálculo de deltas temporales.

---

## 5. Fuentes de Datos (Datasets) y Justificación

1. **Fuente 1 (Población España):** [NutriSynthCare](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio) (diabetes, sobrepeso, factores de riesgo en población española).
2. **Fuente 2 (Calibración masiva):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset) (70.000 registros para combinaciones fisiológicas no lineales).
3. **Síntesis Longitudinal y Renal Calibrada:** Generación de variables continuas renales (`egfr`, `uacr` según KDIGO) y cálculo de deltas interanuales ($\Delta$).

---

## 6. Variables del Sistema (Valores Continuos y Deltas)

| Variable | Nombre Clínico | Rango / Unidad | Modo A (Aislada) | Modo B (Progresión $\Delta$) |
| :--- | :--- | :--- | :--- | :--- |
| `edad` | Edad | Años (30 – 85) | Presente | Presente |
| `sexo` | Sexo biológico | 1: Mujer, 2: Hombre | Presente | Presente |
| `bmi` | Índice de Masa Corporal | $\text{kg/m}^2$ (15.0 – 60.0) | Presente | Presente + `delta_bmi` |
| `ap_hi` | Presión Sistólica | mmHg (80 – 220) | Presente | Presente + `delta_ap_hi` |
| `ap_lo` | Presión Diastólica | mmHg (50 – 130) | Presente | Presente + `delta_ap_lo` |
| `colesterol_total` | Colesterol Total | **mg/dL continuo (120 – 350)** | Presente | Presente + `delta_colesterol` |
| `fuma` | Tabaquismo activo | Binario: 0 = No, 1 = Sí | Presente | Presente |
| `diabetes` | Presencia de Diabetes | Binario: 0 = No, 1 = Sí | Presente | Presente |
| `egfr` | Filtrado Glomerular | $\text{mL/min}/1.73\text{m}^2$ (15 – 120) | Presente | Presente + **`delta_egfr`** |
| `uacr` | Albúmina/Creatinina en orina | $\text{mg/g}$ (2 – 300) | Presente | Presente + **`delta_uacr`** |

> **Variable Target (`target_cardio`):** Binaria (0/1), solo presente en los CSV históricos de entrenamiento para guiar la optimización de sensibilidad (Recall).

---

## 7. Salida Multidimensional y Regla de Corte

1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus (umbral $\ge 10\%$).
2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga hemodinámica/metabólica (umbral $\ge 8\%$).
3. **Riesgo Cardiorrenal:** Deterioro renal silente y microalbuminuria (umbral $\ge 12\%$).

> **Regla Diagnóstica de Cierre:**
> * Si ningún tipo supera su umbral $\rightarrow$ **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**.
> * Si al menos uno supera el umbral $\rightarrow$ Se emite la alerta con el fenotipo predominante, factores explicativos generados por SHAP y recomendación preventiva.

---

## 8. Diseño de la API (FastAPI)

* `GET /api/analiticas`: Lista las analíticas encontradas en la carpeta `data/analiticas/`.
* `POST /api/analiticas/analizar-carpeta`: **(Flujo Principal en 1 Clic)** Analiza todos los archivos de la carpeta, ejecutando la inferencia y SHAP sobre cada uno.
* `POST /api/predict`: **(Simulador / Demo)** Recibe un JSON (analítica actual o con bloque `progresion`) y devuelve la evaluación multidimensional con SHAP.

#### Formato de Respuesta con Explicabilidad SHAP y Perfil Renal KDIGO 2024:
```json
{
  "hay_riesgo": true,
  "conclusion_diagnostica": "Alerta crítica: Aunque los valores absolutos parecen casi normales, la progresión temporal muestra una pérdida acelerada de filtrado glomerular (-16 mL/min) y duplicación de albuminuria.",
  "nivel_prioridad": "ALTA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": { "valor": 0.08, "umbral": 0.10, "alerta": false, "interpretacion": "Bajo" },
    "riesgo_insuficiencia_cardiaca": { "valor": 0.16, "umbral": 0.08, "alerta": true, "interpretacion": "Alto (sobrecarga hemodinámica incipiente)" },
    "riesgo_cardiorrenal": { "valor": 0.28, "umbral": 0.12, "alerta": true, "interpretacion": "Muy Alto (deterioro renal acelerado)" }
  },
  "perfil_renal": {
    "estadio_gfr": "G2",
    "estadio_uacr": "A2",
    "cuadrante_kdigo": "ALTO",
    "progresor_rapido": true,
    "descripcion_clinica": "Estadio KDIGO G2-A2 (Riesgo ALTO). eGFR: 68.0 mL/min, uACR: 38.5 mg/g. ALERTA NEFROLÓGICA: Progresor rápido con caída de -16.0 mL/min/año (umbral patológico: -5 mL/min/año)."
  },
  "factores_clave": [
    {
      "variable": "delta_egfr",
      "valor_actual": "-16.0 mL/min",
      "impacto": "+26%",
      "descripcion": "Pérdida acelerada de filtrado glomerular (-16 mL/min/año) indica daño renal progresivo activo.",
      "fuente": "Evolución Longitudinal"
    },
    {
      "variable": "delta_uacr",
      "valor_actual": "+24.0 mg/g",
      "impacto": "+101%",
      "descripcion": "Incremento interanual de microalbuminuria (+24 mg/g) confirma estrés glomerular.",
      "fuente": "Evolución Longitudinal"
    },
    {
      "variable": "diabetes",
      "valor_actual": "Sí",
      "impacto": "+18%",
      "descripcion": "Diagnóstico de diabetes mellitus: multiplicador de progresión renal.",
      "fuente": "Historial Clínico"
    }
  ],
  "recomendacion_preventiva": "Intervención inmediata: Iniciar nefroprotección (iSGLT2 / ARA-II) y citación a 3 meses para frenar caída de eGFR y reducir albuminuria."
}
```

---

## 8.1 Énfasis de Primer Nivel en Salud Renal (Guías KDIGO 2024)

Para responder a la necesidad de **foco intensivo en el riñón**, el sistema incorpora 4 mecanismos clave:
1. **La Trampa del Rango Normal:** En los laboratorios del SNS, valores de eGFR $> 60\text{ mL/min}$ suelen imprimirse sin asteriscos de alerta, lo que oculta pacientes que caen de 84 a 68 mL/min. El sistema detecta esta caída silente.
2. **Matriz de Riesgo KDIGO (Semáforo Bi-dimensional):** Cruza el estadio de filtrado ($G1$ a $G5$) con el estadio de microalbuminuria ($A1: <30$, $A2: 30-300$, $A3: >300\text{ mg/g}$).
3. **Detección de Progresor Rápido (*Rapid Progressor*):** Si $\Delta_{\text{eGFR}} \le -5.0\text{ mL/min/año}$, se eleva la prioridad automáticamente a ALTA con alerta de nefroprotección urgente.
4. **Target de Entrenamiento con Daño Renal Compuesto:** Todo paciente con daño renal progresivo objetivo en el dataset es clasificado como evento prioritario ($target=1$), asegurando que los modelos de ML penalicen severamente los falsos negativos renales.

---

## 9. Vistas del Frontend (React + Tailwind)
1. **Pestaña Principal ("Analizar Carpeta"):** Tabla de analíticas de `data/analiticas/` con distintivo visual (*"Aislada"* vs. *"Progresión 12m"*). Botón *"Analizar Analíticas"*. Despliega el radar de riesgos, los factores clave SHAP y la recomendación preventiva.
2. **Pestaña Secundaria ("Simulador Manual"):** Formulario con los 10 valores y toggle opcional para progresión previa ($\Delta$).
