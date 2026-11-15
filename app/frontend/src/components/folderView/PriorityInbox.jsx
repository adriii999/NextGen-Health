import { priorityExplanation } from '../../services/priorityExplanation';

const number = (value) => value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const priorityLabels = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
const clinicalLabels = {
  edad: 'Edad', sexo: 'Sexo', bmi: 'índice de masa corporal', ap_hi: 'presión sistólica',
  ap_lo: 'presión diastólica', colesterol_total: 'colesterol total',
  fuma: 'tabaquismo', diabetes: 'diabetes', egfr: 'filtrado del riñón',
  uacr: 'albúmina en orina',
};
function latestDate(patient) {
  const date = patient.datos_entrada.fecha_analitica;
  const datedVisits = patient.analiticas.map((visit) => visit.fecha_analitica)
    .filter((value) => value && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const value = date || datedVisits.at(-1);
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('es-ES', { timeZone: 'UTC' })
    : 'Fecha no disponible';
}

function observedSummary(patient) {
  const egfr = patient.valores_clave.egfr;
  const uacr = patient.valores_clave.uacr;
  const renal = patient.perfil_renal;
  const riskLabels = { BAJO: 'bajo', MODERADO: 'moderado', ALTO: 'alto', MUY_ALTO: 'muy alto' };
  const values = [
    Number.isFinite(egfr.actual) ? `Filtrado del riñón ${number(egfr.actual)} ${egfr.unidad}` : 'Filtrado del riñón sin dato',
    Number.isFinite(egfr.delta) ? `cambio ${egfr.delta > 0 ? '+' : '−'}${number(Math.abs(egfr.delta))}` : null,
    Number.isFinite(uacr.actual) ? `Albúmina en orina ${number(uacr.actual)} ${uacr.unidad}` : 'Albúmina en orina sin dato',
  ].filter(Boolean);
  const classification = renal
    ? `Riesgo para el riñón ${riskLabels[renal.cuadrante_kdigo] || 'no disponible'}`
    : 'Estado del riñón no disponible';
  return { line: `${classification} · ${values.join(' · ')}`, rapid: renal?.progresor_rapido };
}

export function PriorityInbox({ patients, analyzedAt, search, priority, onSearch, onPriority, onSelect, busy }) {
  const query = search.trim().toLocaleLowerCase('es');
  const evaluated = patients.filter((patient) => patient.estado === 'EVALUADA');
  const pending = patients.filter((patient) => patient.estado !== 'EVALUADA');
  const matchesSearch = (patient) =>
    `${patient.nombre} ${patient.paciente_id} ${patient.archivo}`.toLocaleLowerCase('es').includes(query);
  const visible = evaluated.filter((patient) =>
    (!priority || patient.nivel_prioridad === priority) && matchesSearch(patient));
  const visiblePending = pending.filter(matchesSearch);
  const summary = `${evaluated.length} evaluados · ${pending.length} pendiente${pending.length === 1 ? '' : 's'}`;

  return (
    <section className="surface inbox-panel" aria-labelledby="inbox-title">
      <div className="section-heading inbox-heading">
        <div>
          <h2 id="inbox-title">Lista del cupo</h2>
          <p>Abre primero los pacientes con prioridad alta.</p>
          <p className="inbox-meta">Analíticas revisadas · {analyzedAt.toLocaleString('es-ES')}</p>
        </div>
        <strong className="count-label">{summary}</strong>
      </div>

      {pending.length > 0 && <details className="incomplete-patients">
        <summary>Datos pendientes · {pending.length}</summary>
        <p className="pending-intro">Sin puntuación: faltan datos o hay que corregirlos. No significa riesgo bajo.</p>
        {visiblePending.length ? <ul className="incomplete-list">
          {visiblePending.map((patient) => {
            const missing = patient.campos_pendientes.map((key) => clinicalLabels[key] || key);
            const issue = missing.length
              ? `Falta: ${missing.join(', ')}`
              : patient.errores_datos.map((key) => clinicalLabels[key] || key).join(', ') || 'Revisar formato';
            return <li key={patient.id}>
              <div>
                <strong>{patient.nombre}</strong>
                <span className="inbox-meta">{patient.paciente_id} · {latestDate(patient)}</span>
              </div>
              <span>{issue}</span>
              <button className="button secondary" disabled={busy} aria-label={`Ver datos de ${patient.nombre}`}
                onClick={() => onSelect(patient)}>Abrir</button>
            </li>;
          })}
        </ul> : <p className="list-empty">No hay pacientes que coincidan.</p>}
      </details>}

      {evaluated.length > 0 ? <>
        <div className="inbox-filters">
          <div>
            <label htmlFor="cupo-search">Buscar paciente</label>
            <input id="cupo-search" type="search" placeholder="Nombre o identificador" value={search}
              onChange={(event) => onSearch(event.target.value)} />
          </div>
          <div>
            <label htmlFor="cupo-priority">Prioridad</label>
            <select id="cupo-priority" value={priority} onChange={(event) => onPriority(event.target.value)}>
              <option value="">Todas</option>
              {Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          {(search || priority) && <button className="button secondary" onClick={() => {
            onSearch('');
            onPriority('');
          }}>Limpiar</button>}
        </div>
        <p className="inbox-result-count" role="status">{visible.length} de {evaluated.length}</p>
        {visible.length ? <table className="inbox-table">
          <caption className="sr-only">Pacientes evaluados, con datos observados y prioridad de revisión orientativa.</caption>
          <thead><tr>
            <th scope="col">Paciente</th><th scope="col">Prioridad</th>
            <th scope="col">Señal principal</th><th scope="col">Abrir</th>
          </tr></thead>
          <tbody>{visible.map((patient) => {
            const observed = observedSummary(patient);
            const explanation = priorityExplanation(patient);
            return <tr key={patient.id}>
              <td data-label="Paciente">
                <strong className="patient-name">{patient.nombre}</strong>
                <span className="inbox-meta">{patient.paciente_id}</span>
                <span className="inbox-meta">{latestDate(patient)}</span>
              </td>
              <td data-label="Prioridad">
                <span className={`priority priority-${patient.nivel_prioridad}`}>
                  {priorityLabels[patient.nivel_prioridad] || 'No disponible'}
                </span>
              </td>
              <td data-label="Señal principal">
                {explanation.reason && <strong>{explanation.reason}</strong>}
                {explanation.alerts && <span className="inbox-meta">{explanation.alerts}</span>}
                {!explanation.reason && !explanation.alerts && <strong>Motivo de prioridad no disponible</strong>}
                <span className="inbox-meta">{observed.line}</span>
              </td>
              <td data-label="Abrir">
                <button id={`review-${patient.id}`} className="button secondary" disabled={busy}
                  aria-label={`Abrir ${patient.nombre}`} onClick={() => onSelect(patient)}>Abrir</button>
              </td>
            </tr>;
          })}</tbody>
        </table> : <p className="list-empty">No hay pacientes que coincidan con estos filtros.</p>}
      </> : evaluated.length === 0 && pending.length === 0 ? <div className="empty-state">
        <h3>No hay pacientes en el resultado</h3>
        <p>Comprueba las analíticas y vuelve a intentarlo.</p>
      </div> : null}
    </section>
  );
}
