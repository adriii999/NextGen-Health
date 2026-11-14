import { RiskRadarChart } from '../charts/RiskRadarChart';
import { ShapImpactBar } from '../charts/ShapImpactBar';

const format = (value) => value === null || value === undefined ? 'No disponible' : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export function PatientResults({ patient }) {
  return (
    <article>
      <header className="result-heading"><p className="eyebrow">Resultado individual {patient.isDemo && <span className="demo-inline">DEMO FICTICIA</span>}</p><h2>{patient.nombre}</h2><p className="source-label">Origen: {patient.archivo}</p><span className={`priority priority-${patient.nivel_prioridad}`}>Prioridad {patient.nivel_prioridad?.toLowerCase() || 'no disponible'}</span></header>
      <section className="result-section"><RiskRadarChart tiposRiesgo={patient.tipos_riesgo} /></section>
      <section className="clinical-summary"><h3>Valoración del modelo</h3><p>{patient.conclusion_diagnostica || 'No hay una conclusión disponible.'}</p></section>
      <section className="result-section"><ShapImpactBar factoresClave={patient.factores_clave} /></section>
      <section className="recommendation"><h3>Recomendación de apoyo</h3><p>{patient.recomendacion_preventiva || 'No se ha recibido una recomendación.'}</p><small>Revisa el contexto del paciente antes de decidir la actuación clínica.</small></section>
      <section className="result-section"><div className="section-heading"><div><h3>Parámetros de la analítica</h3><p>Valores recibidos y cambio respecto a la analítica anterior, cuando está disponible.</p></div></div>
        <div className="lab-grid">{Object.entries(patient.valores_clave).map(([key, value]) => <div className="lab-value" key={key}><span>{value.label}</span><strong>{format(value.actual)} {value.actual !== null && <small>{value.unidad}</small>}</strong><span className="lab-delta">{value.delta !== null ? `Cambio: ${value.delta > 0 ? '+' : ''}${format(value.delta)} ${value.unidad}` : 'Sin cambio histórico disponible'}</span></div>)}</div>
      </section>
    </article>
  );
}
