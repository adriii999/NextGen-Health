# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular

## 1. Contexto del Proyecto y Flujo de Trabajo Clínico (Para el LLM)
**Objetivo:** Desarrollar un prototipo (MVP) para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP) en el Sistema Nacional de Salud.
**Problema:** En consultas de 5-7 minutos, analíticas rutinarias con valores aparentemente "en rango" o límites ocultan perfiles de alto riesgo específico (aterosclerótico, insuficiencia cardíaca o cardiorrenal). El profesional no dispone de tiempo para introducir datos a mano.
**Solución ("Segunda Opinión con un Clic"):**
* **Modo Principal (Consulta Real):** Un botón que envía a analizar la analítica/historial ya cargado del paciente (o lote de analíticas recientes del cupo) para obtener una segunda opinión inmediata e integrada sin carga administrativa extra.
* **Modo Demo / Laboratorio:** Pestaña secundaria para introducir 10 valores manualmente y simular o ajustar analíticas en tiempo real durante la demo/evaluación.
* **Salida Multidimensional ("Tipos de Riesgo"):** El sistema no entrega una única cifra ambigua, sino la estratificación de los **tres fenotipos cardiovasculares fundamentales** respaldados por las guías ESC / SEC y ecuaciones PREVENT/SCORE2-HF, concluyendo ausencia de riesgo si ningún umbral se supera.

---

## 2. Tipos de Riesgo Clínico Evaluados (Guías ESC / SEC / PREVENT)

Siguiendo las directrices de la **Sociedad Europea de Cardiología (ESC)**, la **Sociedad Española de Cardiología (SEC)** y las ecuaciones multidimensionales **AHA PREVENT**:

1. **Riesgo Aterosclerótico (ASCVD - Infarto / Ictus):**
   * *Mecanismo:* Formación de placa ateromatosa, dislipemia e hipertensión vascular.
   * *Variables clave:* Edad, colesterol total, presión sistólica (`ap_hi`), tabaquismo, sexo.
   * *Umbral de alerta:* Probabilidad estimada $\ge$ 10% a 10 años (o corte calibrado de alto riesgo).

2. **Riesgo de Insuficiencia Cardíaca (Heart Failure - IC):**
   * *Mecanismo:* Sobrecarga hemodinámica, remodelado ventricular temprano, hipertrofia por HTA o toxicidad metabólica.
   * *Variables clave:* IMC elevado, presión diastólica/sistólica sostenida, diabetes, edad avanzada, microalbuminuria.
   * *Umbral de alerta:* Probabilidad estimada $\ge$ 8% (SCORE2-HF / PREVENT-HF).

3. **Riesgo Cardiorrenal / Deterioro Renal Silencioso:**
   * *Mecanismo:* Daño endotelial microvascular y glomerular progresivo ("sin que duela").
   * *Variables clave:* Cociente Albúmina/Creatinina (`uacr` $\ge 30\text{ mg/g}$), filtrado glomerular (`egfr` $< 60\text{ mL/min}$), diabetes, hipertensión.
   * *Umbral de alerta:* Caída de eGFR o presencia de micro/macroalbuminuria.

> **Regla de Conclusión Global:** Si ninguno de los tres subtipos supera su umbral clínico, el sistema concluye: **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**, evitando fatiga de alarmas al médico. Si al menos uno supera el umbral, se emite una alerta priorizada con el fenotipo predominante y recomendaciones preventivas.

---

## 3. Stack Tecnológico
* **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons + Recharts (radares y barras para visualización de subtipos de riesgo y SHAP).
* **Backend:** FastAPI (Python 3.10+) + Pydantic v2.
* **Machine Learning & XAI:** XGBoost (`xgboost`) con soporte nativo de valores ausentes (`missing=np.nan`), `joblib` para serialización y `shap` para explicabilidad de cada subtipo de riesgo.

---

## 4. Estructura de Datos y Preprocesamiento

### 4.1 Variables Clínicas de Entrada
* `edad`: Años (30–85).
* `sexo`: 1 = Mujer, 2 = Hombre.
* `bmi`: Índice de masa corporal ($\text{peso} / \text{altura}^2$).
* `ap_hi`: Presión arterial sistólica (mmHg).
* `ap_lo`: Presión arterial diastólica (mmHg).
* `colesterol`: Nivel (1: normal, 2: limítrofe, 3: elevado).
* `fuma`: Tabaquismo activo (0 = No, 1 = Sí).
* `diabetes`: Presencia diagnóstica o glucemia basal alterada (0 = No, 1 = Sí).
* `egfr`: Tasa de filtración glomerular estimada ($\text{mL/min}/1.73\text{m}^2$).
* `uacr`: Cociente albúmina/creatinina en orina ($\text{mg/g}$).

### 4.2 Limpieza y Generación de Datos Sintéticos Correlacionados
* Filtros de rangos fisiológicos: `ap_hi` $\in [80, 220]$, `ap_lo` $\in [50, 130]$, `ap_lo < ap_hi`, `bmi` $\in [15, 60]$.
* Síntesis cardiorrenal calibrada sobre el dataset base para inducir correlaciones clínicas reales (microalbuminuria en hipertensos/diabéticos y disfunción renal silenciosa).

---

## 5. Diseño de la API (FastAPI)

### 5.1 Endpoint Individual / Simulación: `POST /api/v1/analyze`
Permite analizar una analítica enviada en JSON (sea desde la analítica seleccionada del paciente o desde el formulario manual de demo).

#### Payload de Entrada:
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

#### Respuesta Multidimensional por Tipos de Riesgo:
```json
{
  "paciente_id": "PAC-4892",
  "hay_riesgo": true,
  "conclusion_diagnostica": "Riesgo detectado: perfil de deterioro cardiorrenal temprano e insuficiencia cardíaca incipiente con lípidos controlados.",
  "nivel_prioridad": "ALTA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": {
      "valor": 0.08,
      "umbral": 0.10,
      "alerta": false,
      "interpretacion": "Bajo (colesterol y hábitos controlados)"
    },
    "riesgo_insuficiencia_cardiaca": {
      "valor": 0.14,
      "umbral": 0.08,
      "alerta": true,
      "interpretacion": "Moderado-Alto (sobrecarga tensional + diabetes)"
    },
    "riesgo_cardiorrenal": {
      "valor": 0.22,
      "umbral": 0.12,
      "alerta": true,
      "interpretacion": "Alto (microalbuminuria UACR 38.5 mg/g con eGFR 68 mL/min)"
    }
  },
  "factores_clave": [
    {
      "variable": "uacr",
      "valor_actual": "38.5 mg/g",
      "impacto": "+14%",
      "descripcion": "Microalbuminuria activa: marcador precoz de daño vascular renal"
    },
    {
      "variable": "egfr",
      "valor_actual": "68 mL/min",
      "impacto": "+11%",
      "descripcion": "Filtrado glomerular en rango limítrofe estadio G2"
    },
    {
      "variable": "diabetes",
      "valor_actual": "Sí",
      "impacto": "+9%",
      "descripcion": "Multiplicador de riesgo endotelial"
    }
  ],
  "recomendacion_preventiva": "Solicitar confirmación de UACR en 3 meses, optimizar control de presión arterial sistólica (<130 mmHg) y valorar iSGLT2 para protección cardiorrenal."
}
```

#### Caso Negativo (Ningún umbral superado):
```json
{
  "paciente_id": "PAC-1205",
  "hay_riesgo": false,
  "conclusion_diagnostica": "Sin riesgo cardiovascular significativo detectado. Todos los fenotipos se encuentran dentro de los límites de seguridad.",
  "nivel_prioridad": "BAJA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": { "valor": 0.03, "umbral": 0.10, "alerta": false, "interpretacion": "Bajo" },
    "riesgo_insuficiencia_cardiaca": { "valor": 0.02, "umbral": 0.08, "alerta": false, "interpretacion": "Bajo" },
    "riesgo_cardiorrenal": { "valor": 0.04, "umbral": 0.12, "alerta": false, "interpretacion": "Bajo" }
  },
  "factores_clave": [],
  "recomendacion_preventiva": "Continuar con controles habituales de Atención Primaria según protocolo general."
}
```

### 5.2 Endpoint de Analíticas Precargadas: `GET /api/v1/pacientes` y `POST /api/v1/pacientes/{id}/analizar`
Permite a Carmen consultar la lista de pacientes con analíticas recientes ya cargadas en el sistema de salud y ejecutar la segunda opinión con un solo clic.

---

## 6. Vistas de la Interfaz (Frontend React)
1. **Pestaña Principal: "Analíticas de Cupo (Segunda Opinión en 1 Clic)":**
   * Tabla con el cupo de pacientes y sus analíticas precargadas.
   * Botón destacado *"Obtener Segunda Opinión"* para analizar individualmente o en lote.
   * Visualización del veredicto: tarjetas de los 3 tipos de riesgo (Riesgo Aterosclerótico, Insuficiencia Cardíaca, Cardiorrenal), badges de alerta y factores explicativos SHAP.
2. **Pestaña Secundaria: "Simulador de Analítica (Demo Manual)":**
   * Formulario con los 10 valores para introducir analíticas de prueba o modificar variables interactivamente en la defensa del proyecto.
