---
name: frontend-developer
description: Comprehensive expert guidelines for developing modern, accessible, and high-performance clinical dashboards in React, Vite, Tailwind CSS, Recharts, and Lucide Icons.
---

# Frontend Developer Skill: Medical Dashboard & Clinical Tools

This skill establishes the definitive engineering guidelines, UI/UX architecture, component patterns, and visual design standards for developing the **NextGen-Health** clinical decision support dashboard for Primary Care (AP).

---

## 1. Technological Stack & Setup

* **Runtime & Framework:** React 18+ initialized with Vite (`npm create vite@latest app/frontend -- --template react`).
* **Styling & Design System:** Tailwind CSS v3 with PostCSS and Autoprefixer.
* **Component Primitives:** Clean Tailwind-based accessible components (cards, badges, modals, tabs).
* **Iconography:** `lucide-react` (standard stroke-width: 1.75px for medical instruments and indicators).
* **Data Visualization:** `recharts` for radar charts (3 risk phenotypes), sparklines ($\Delta$ evolution), and bar charts (SHAP feature attributions).
* **HTTP Client:** `axios` with an isolated API client instance:
  ```javascript
  // app/frontend/src/api/client.js
  import axios from 'axios';

  export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // En desarrollo usa proxy de Vite o http://localhost:8000/api
    headers: { 'Content-Type': 'application/json' },
  });
  ```

---

## 2. Design System: Clinical UI & Ergonomics

### 2.1 Color Tokens & Clinical Hierarchy
Primary care physicians work under extreme time constraints and visual fatigue. The interface must avoid neon, hyper-saturated elements, prioritizing high-contrast, sober clinical palettes:

| Semantic Token | Tailwind Class | Clinical Meaning |
| :--- | :--- | :--- |
| **Surface Base** | `bg-slate-50` / `bg-slate-900` | Canvas background |
| **Surface Card** | `bg-white` / `bg-slate-800` | Medical card background |
| **Text Primary** | `text-slate-900` / `text-slate-100` | Values, diagnoses, headings |
| **Text Secondary** | `text-slate-500` / `text-slate-400` | Units (mg/dL, mmHg), timestamps |
| **Border Neutral** | `border-slate-200` / `border-slate-700` | Dividers, card boundaries |
| **Controlled (Bajo)** | `text-emerald-700 bg-emerald-50 border-emerald-200` | Sin riesgo / valores normales |
| **Limítrofe (Medio)** | `text-amber-700 bg-amber-50 border-amber-200` | Alerta temprana / seguimiento |
| **Alerta Alta (Alto)** | `text-rose-700 bg-rose-50 border-rose-200` | Umbral clínico superado / acción |

### 2.2 Typography & Numerical Formatting
* All clinical values must show units immediately adjacent to numbers: `218 mg/dL`, `138 mmHg`, `68 mL/min`, `38.5 mg/g`.
* Tabular numbers (`font-mono` or CSS `font-variant-numeric: tabular-nums`) must be used for tables and comparison cards to prevent layout shifts.

---

## 3. Application Architecture & Views

The frontend is structured in two synchronized tabs:

```text
app/frontend/src/
|-- api/
|   |-- client.js               # Axios instance with baseURL and error interceptors
|   \-- analiticasService.js     # Methods for /api/predict and /api/analiticas
|-- components/
|   |-- common/
|   |   |-- Badge.jsx           # Controlled / Limítrofe / Alerta badges
|   |   |-- Button.jsx          # Primary 1-click action buttons with loading spinners
|   |   \-- Card.jsx            # Standardized bordered clinical cards
|   |-- charts/
|   |   |-- RiskRadarChart.jsx  # 3-Phenotype Radar vs Clinical Thresholds
|   |   |-- ShapImpactBar.jsx   # Horizontal divergent bar chart for SHAP drivers
|   |   \-- TrendSparkline.jsx  # Small inline delta trend (T-1 vs T)
|   |-- folderView/
|   |   |-- AnaliticasTable.jsx # List of files/reports in data/analiticas/
|   |   \-- PatientDetailModal.jsx # Detailed drawer showing complete evaluation
|   \-- simulator/
|       |-- LabInputForm.jsx    # 10 clinical continuous inputs
|       \-- ProgressionToggle.jsx # Accordion for delta (T-1) values
|-- pages/
|   |-- FolderEvaluationPage.jsx # Main 1-click folder analysis view
|   \-- SimulatorPage.jsx        # Manual interactive lab tester
|-- App.jsx                      # Navigation tabs & top-level state
\-- main.jsx
```

---

## 4. Recharts Visualization Patterns

### 4.1 Tri-Phenotype Radar Chart with Clinical Thresholds
```jsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export const RiskRadarChart = ({ tiposRiesgo }) => {
  if (!tiposRiesgo) return null;

  const data = [
    {
      subject: 'Aterosclerótico (ASCVD)',
      Riesgo: Math.round(tiposRiesgo.riesgo_aterosclerotico.valor * 100),
      Umbral: Math.round(tiposRiesgo.riesgo_aterosclerotico.umbral * 100),
    },
    {
      subject: 'Insuf. Cardíaca (IC)',
      Riesgo: Math.round(tiposRiesgo.riesgo_insuficiencia_cardiaca.valor * 100),
      Umbral: Math.round(tiposRiesgo.riesgo_insuficiencia_cardiaca.umbral * 100),
    },
    {
      subject: 'Cardiorrenal (KDIGO)',
      Riesgo: Math.round(tiposRiesgo.riesgo_cardiorrenal.valor * 100),
      Umbral: Math.round(tiposRiesgo.riesgo_cardiorrenal.umbral * 100),
    },
  ];

  return (
    <div className="w-full h-72 bg-white p-4 rounded-xl border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Estratificación Multidimensional de Riesgo</h3>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
          <Radar name="Umbral de Alerta" dataKey="Umbral" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeDasharray="4 4" />
          <Radar name="Riesgo Estimado" dataKey="Riesgo" stroke="#e11d48" fill="#e11d48" fillOpacity={0.35} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Tooltip formatter={(value) => `${value}%`} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 4.2 SHAP Feature Drivers Horizontal Bar Chart
```jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ShapImpactBar = ({ factoresClave }) => {
  if (!factoresClave || factoresClave.length === 0) return null;

  const data = factoresClave.map((f) => ({
    name: f.variable,
    impactoNumerico: parseFloat(f.impacto.replace('%', '')),
    descripcion: f.descripcion,
    valorActual: f.valor_actual,
  }));

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Factores Clave de Riesgo (Explicabilidad SHAP)</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" unit="%" domain={[-30, 30]} stroke="#94a3b8" />
            <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name, props) => [`${value}% (${props.payload.valorActual})`, props.payload.descripcion]}
            />
            <Bar dataKey="impactoNumerico" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.impactoNumerico > 0 ? '#e11d48' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

---

## 5. Defensive Frontend Coding Checklist

1. **Null/Undefined Resilience:** Always verify `tipos_riesgo?.[key]?.valor` safely before rendering or math operations.
2. **Delta Direction Rendering:**
   * Declining eGFR (`delta_egfr < 0`) must render in red with an arrow down ($\downarrow$).
   * Rising UACR (`delta_uacr > 0`) must render in red with an arrow up ($\uparrow$).
3. **Empty Folder State:** When `data/analiticas/` contains no files, render an informative callout rather than a blank white screen.
4. **Keyboard Accessibility:** Simulator forms must allow full navigation and submission via `Tab` and `Enter`.
