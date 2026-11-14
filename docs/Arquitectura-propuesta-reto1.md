# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular (Dual: Foto Fija y Progresión Temporal)

## 1. Contexto del Proyecto y Enfoque de la Demo
**Objetivo:** Desarrollar un prototipo / demo para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP) en el Sistema Nacional de Salud (SNS).
**Filosofía de Demo Ligera:** No requiere base de datos ni gestión de usuarios. Analiza archivos de analíticas depositados en una carpeta local (`data/analiticas/`) o ingresados en un simulador.

---

## 2. Doble Funcionalidad Analítica: Analítica Aislada vs. Progresión Temporal

Para reproducir con fidelidad la realidad de una consulta médica, el sistema implementa una **arquitectura de evaluación dual** capaz de operar en dos escenarios clínicos fundamentales:

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
                   │ • Alerta adicional: "Falta seguimiento temporal"              │ • Prioriza caídas aceleradas aunque estén en rango
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

### 2.1 Modo A: Analítica Aislada / Foto Fija (Primer Contacto o Sin Histórico)
* **Escenario Clínico:** El paciente acude por primera vez o no dispone de registros previos en el centro de salud.
* **Comportamiento del Sistema:**
  * Recibe las 10 determinaciones actuales del laboratorio (`edad`, `sexo`, `bmi`, `ap_hi`, `ap_lo`, `colesterol_total`, `fuma`, `diabetes`, `egfr`, `uacr`).
  * Los campos de variación temporal ($\Delta$) viajan como valores nulos (`NaN` / `null`).
  * El modelo **XGBoost procesa nativamente los valores nulos (`missing=np.nan`)**, calculando el riesgo basándose estrictamente en los valores absolutos actuales.
  * La respuesta clínica emite la evaluación de riesgos y añade un aviso orientativo: *"Evaluación basada en foto fija única; se recomienda programar analítica de control para evaluar progresión"*.

### 2.2 Modo B: Progresión Temporal / Análisis Longitudinal (Analítica + Histórico Previo)
* **Escenario Clínico:** Paciente habitual con analítica previa (ej. hace 6–12 meses).
* **Comportamiento del Sistema:**
  * Recibe la analítica actual y la analítica anterior (o bien los $\Delta$ calculados automáticamente por la API al leer el archivo).
  * **Ingeniería de Características en Tabular ($\Delta$):**
    $$\Delta_{\text{eGFR}} = \text{eGFR}_{\text{actual}} - \text{eGFR}_{\text{previo}}$$
    $$\Delta_{\text{UACR}} = \text{UACR}_{\text{actual}} - \text{UACR}_{\text{previo}}$$
    $$\Delta_{\text{ap\_hi}} = \text{ap\_hi}_{\text{actual}} - \text{ap\_hi}_{\text{previo}}$$
    $$\Delta_{\text{colesterol}} = \text{colesterol}_{\text{actual}} - \text{colesterol}_{\text{previo}}$$
    $$\Delta_{\text{bmi}} = \text{bmi}_{\text{actual}} - \text{bmi}_{\text{previo}}$$
  * **Potencia Diagnóstica:** Permite destapar el "riesgo oculto" que pasa desapercibido en una analítica aislada. Un valor actual de $\text{eGFR} = 68\text{ mL/min}$ con $\Delta_{\text{eGFR}} = -15\text{ mL/min/año}$ dispara una alarma de alto riesgo cardiorrenal aunque el valor absoluto no esté en rango de alarma roja.

---

## 3. Fuentes de Datos (Datasets) y Justificación

Para respetar la protección de datos española (RGPD) sin renunciar a precisión clínica y matemática:

1. **Fuente 1 (Población España):** [NutriSynthCare](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio). Proporciona la distribución sociodemográfica, diabetes, tabaquismo y perfiles de AP en España.
2. **Fuente 2 (Calibración estadística masiva):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset). 70.000 registros para combinaciones fisiológicas no lineales robustas.
3. **Síntesis Longitudinal y Renal Calibrada:** Generación de variables continuas renales (`egfr`, `uacr` según KDIGO) y simulación de trayectorias temporales estables frente a deterioros acelerados para entrenar los deltas ($\Delta$).

---

## 4. Variables del Sistema (Valores Continuos y Deltas)

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

## 5. Salida Multidimensional y Regla de Corte

El sistema clasifica el resultado en **tres tipos de riesgo independientes** (según guías ESC / SEC / PREVENT):
1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus (umbral $\ge 10\%$).
2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga hemodinámica/metabólica (umbral $\ge 8\%$).
3. **Riesgo Cardiorrenal:** Deterioro renal silente y microalbuminuria (umbral $\ge 12\%$).

> **Regla Diagnóstica de Cierre:**
> * Si ningún tipo supera su umbral $\rightarrow$ **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**.
> * Si al menos uno supera el umbral $\rightarrow$ Se emite la alerta con el fenotipo predominante, factores explicativos SHAP y recomendación preventiva.

---

## 6. Diseño de la API (FastAPI)

* `GET /api/analiticas`: Lista las analíticas encontradas en la carpeta `data/analiticas/`.
* `POST /api/analiticas/analizar-carpeta`: **(Flujo Principal en 1 Clic)** Analiza todos los archivos de la carpeta, detectando automáticamente si cada registro contiene progresión previa o es analítica aislada, y devolviendo la priorización.
* `POST /api/predict`: **(Simulador / Demo)** Recibe un JSON que puede contener solo la analítica actual (Modo A) o incluir el bloque opcional `progresion` (Modo B).

#### Ejemplo Payload Modo A (Analítica Aislada):
```json
{
  "edad": 58,
  "sexo": 1,
  "bmi": 27.2,
  "ap_hi": 138,
  "ap_lo": 86,
  "colesterol_total": 218.0,
  "fuma": 0,
  "diabetes": 1,
  "egfr": 68.0,
  "uacr": 38.5,
  "progresion": null
}
```

#### Ejemplo Payload Modo B (Con Progresión Temporal):
```json
{
  "edad": 58,
  "sexo": 1,
  "bmi": 27.2,
  "ap_hi": 138,
  "ap_lo": 86,
  "colesterol_total": 218.0,
  "fuma": 0,
  "diabetes": 1,
  "egfr": 68.0,
  "uacr": 38.5,
  "progresion": {
    "delta_egfr": -14.0,
    "delta_uacr": 22.0,
    "delta_ap_hi": 8.0,
    "delta_colesterol": 12.0,
    "delta_bmi": 1.1
  }
}
```

---

## 7. Vistas del Frontend (React + Tailwind)
1. **Pestaña Principal ("Analizar Carpeta"):**
   * Tabla de analíticas de `data/analiticas/`. Cada fila muestra un distintivo visual (*"Analítica Aislada"* vs. *"Con Progresión Temporal $\Delta$ (12 meses)"*).
   * Botón destacado: *"Analizar Analíticas"*.
   * Panel de resultados con radar de tipos de riesgo, factores explicativos y recomendación preventiva.
2. **Pestaña Secundaria ("Simulador Manual"):**
   * Formulario con los 10 valores de laboratorio continuos.
   * Interruptor (toggle): *"¿Incluir analítica previa / progresión temporal?"* que despliega los campos o sliders de variación interanual ($\Delta$).
