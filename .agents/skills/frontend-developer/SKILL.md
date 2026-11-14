---
name: frontend-developer
description: Expert frontend development guidelines for React, Vite, Tailwind CSS, Recharts, and Lucide Icons in clinical medical dashboards.
---

# Frontend Developer Skill: Medical Dashboard & Clinical Tools

This skill guides the design, implementation, and refinement of the frontend application for the NextGen-Health project, ensuring an accessible, high-performance, and clinically credible UI tailored for primary care physicians (e.g., Dr. Carmen).

## Core Stack & Tools
* **Framework:** React 18+ with Vite (TypeScript or modern ES6+).
* **Styling:** Tailwind CSS (utility-first, clean neutral medical palette with purposeful alert accents).
* **Icons:** `lucide-react` for crisp, medical-grade UI iconography.
* **Data Visualization:** `recharts` for radar charts (3 risk phenotypes), trend sparklines ($\Delta$ progression), and horizontal bar charts for SHAP feature impacts.
* **HTTP Client:** `axios` with configured base URL and request/response interceptors.

---

## Key Architecture & UI Patterns

### 1. View Layout (Tab-based Architecture)
1. **Primary Tab ("Analíticas de Cupo"):**
   * High-density, low-clutter table displaying available patient lab reports from `data/analiticas/`.
   * Clear badges distinguishing between:
     - `[Foto Fija / Aislada]` (single lab report).
     - `[Con Progresión 12m]` (lab report with temporal $\Delta$).
   * Action trigger: Single click button **"Obtener Segunda Opinión"** to trigger the AI analysis.
   * Result Drawer or Card:
     - **Tri-Phenotype Radar / Bar:** Atherosclerotic, Heart Failure, Cardiorenal scores vs. alert thresholds.
     - **Verdict Banner:** Categorical verdict (*"Sin riesgo detectado"* vs. *"Alerta: Deterioro cardiorrenal"*).
     - **SHAP Drivers:** Top features pushing the risk up (+) or down (-).
     - **Preventive Recommendation:** Clear actionable advice.
2. **Secondary Tab ("Simulador Manual / Demo"):**
   * Accessible 10-input form (numeric inputs with physiological step and boundary validation).
   * Toggle: *"¿Incluir datos previos / calcular progresión?"* revealing $\Delta$ inputs.
   * Real-time reactive recalculation or dedicated "Simular Diagnóstico" action.

---

## Design Principles for Clinical Software
* **No "AI Slop" or Generic Cards:** Use high information-density, sober clinical contrast (slate/slate-800 for dark mode, clean white/zinc-50 for light mode, emerald for controlled, amber for borderline, rose-600 for high risk).
* **Speed to Action:** No unnecessary modal confirmation dialogues. 1-click execution.
* **Accessibility:** Units always visible beside input fields (`mg/dL`, `mmHg`, `mL/min`, `mg/g`).
* **Visualizing $\Delta$:** Use subtle direction indicators:
  - $\downarrow$ `delta_egfr` in red (renal decline is bad).
  - $\uparrow$ `delta_uacr` in red (albuminuria increase is bad).
  - $\uparrow$ `delta_ap_hi` in amber/red.

---

## Sample Component Pattern (Recharts Radar for 3 Risks)

```tsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RiskData {
  tipo: string;
  valor: number; // 0 to 1
  umbral: number; // 0 to 1
}

export const ClinicalRiskRadar: React.FC<{ data: RiskData[] }> = ({ data }) => {
  const chartData = data.map(d => ({
    subject: d.tipo,
    Riesgo: Math.round(d.valor * 100),
    Umbral: Math.round(d.umbral * 100),
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar name="Umbral Clínico" dataKey="Umbral" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="3 3" />
          <Radar name="Riesgo Estimado" dataKey="Riesgo" stroke="#e11d48" fill="#e11d48" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
```
