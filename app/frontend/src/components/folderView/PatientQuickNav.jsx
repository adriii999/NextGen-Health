import { useState } from 'react';
import { patientDisplayName } from '../../services/patientDisplayName';

const labels = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

function PatientList({ patients, selected, onSelect, inputId }) {
  const [query, setQuery] = useState('');
  const filtered = patients.filter((patient) =>
    `${patientDisplayName(patient)} ${patient.nombre} ${patient.paciente_id}`.toLocaleLowerCase('es')
      .includes(query.trim().toLocaleLowerCase('es')));

  return <>
    <label className="quicknav-search-label" htmlFor={inputId}>Buscar paciente del cupo</label>
    <input id={inputId} className="quicknav-search" type="search" placeholder="Nombre o identificador"
      value={query} onChange={(event) => setQuery(event.target.value)} />
    {filtered.length ? <ul className="quicknav-list">
        {filtered.map((patient) => (
          <li key={patient.id}>
            <button type="button" className={selected.id === patient.id ? 'quicknav-patient selected' : 'quicknav-patient'}
            aria-current={selected.id === patient.id ? 'true' : undefined}
            aria-label={`Abrir ${patientDisplayName(patient)}`}
            onClick={() => onSelect(patient)}>
            <strong>{patientDisplayName(patient)}</strong>
            <span className={`priority ${patient.estado === 'EVALUADA'
              ? `priority-${patient.nivel_prioridad}`
              : 'priority-pending'}`}>
              {patient.estado === 'EVALUADA'
                ? `Prioridad ${labels[patient.nivel_prioridad]?.toLowerCase() || 'no disponible'}`
                : 'Datos pendientes'}
            </span>
          </button>
        </li>
      ))}
    </ul> : <p className="quicknav-empty">No hay pacientes que coincidan.</p>}
  </>;
}

export function PatientQuickNav({ patients, selected, onSelect }) {
  return <>
    <aside className="surface patient-quicknav" aria-label="Pacientes del cupo">
      <div className="quicknav-heading">
        <h2>Pacientes del cupo</h2>
        <p>{patients.length} disponibles · ordenados por prioridad</p>
      </div>
      <PatientList patients={patients} selected={selected} onSelect={onSelect} inputId="quicknav-search-desktop" />
    </aside>
    <details className="surface mobile-patient-quicknav">
      <summary>Cambiar de paciente · {patientDisplayName(selected)} ({patients.length})</summary>
      <PatientList patients={patients} selected={selected} onSelect={onSelect} inputId="quicknav-search-mobile" />
    </details>
  </>;
}
