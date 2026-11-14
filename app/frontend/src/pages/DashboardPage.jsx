import { useEffect, useRef, useState } from 'react';
import { analiticasService, analysisError } from '../services/analiticasService';
import { PatientResults } from '../components/folderView/PatientResults';
import { PatientEvolutionChart } from '../components/charts/PatientEvolutionChart';
import { UploadPatientPage } from './UploadPatientPage';

export function DashboardPage() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('load');
  const [error, setError] = useState('');
  const [upload, setUpload] = useState(false);
  const requestId = useRef(0);

  async function loadPatients() {
    const id = ++requestId.current;
    setBusy('load');
    setError('');
    setSelected(null);
    setResult(null);
    try {
      const response = await analiticasService.getArchivosAnaliticas();
      if (id === requestId.current) setPatients(response.archivos.filter((item) => item.es_carpeta));
    } catch (err) {
      if (id === requestId.current) setError(analysisError(err));
    } finally {
      if (id === requestId.current) setBusy('');
    }
  }

  useEffect(() => {
    loadPatients();
    return () => { requestId.current += 1; };
  }, []);

  async function selectPatient(patient) {
    const id = ++requestId.current;
    setSelected(patient);
    setResult(null);
    setError('');
    setBusy('evaluate');
    try {
      const evaluation = await analiticasService.evaluarSeleccion(
        patient.archivo, patient.analiticas.map((visit) => visit.nombre_archivo));
      // Una respuesta tardía nunca debe sustituir al paciente abierto después.
      if (id === requestId.current) setResult(evaluation);
    } catch (err) {
      if (id === requestId.current) setError(analysisError(err));
    } finally {
      if (id === requestId.current) setBusy('');
    }
  }

  const filtered = patients.filter((patient) =>
    `${patient.nombre} ${patient.archivo}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  if (upload) return <>
    <div className="consultation-back"><button className="button secondary" onClick={() => setUpload(false)}>Volver a la consulta</button></div>
    <UploadPatientPage />
  </>;

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Revisar un paciente</h1>
          <p>Abre su ficha para consultar la evolución de sus analíticas y la valoración actual de riesgos.</p>
        </div>
        <button className="button secondary" disabled={busy === 'load'} onClick={() => setUpload(true)}>Cargar archivos externos</button>
      </div>
      <p className="consultation-demo" role="note">Entorno de demostración: los pacientes precargados son casos de prueba. Las evaluaciones se calculan con el modelo.</p>
      {error && !selected && <div role="alert" className="error-notice upload-error"><p>{error}</p></div>}
      <div className="consultation-layout">
        <aside className="surface patient-sidebar" aria-label="Pacientes de consulta">
          <div className="section-heading"><h2>Pacientes</h2>
            <button className="button secondary small" disabled={busy === 'load'} onClick={loadPatients}>Actualizar</button>
          </div>
          <div className="patient-filters">
            <label htmlFor="consultation-search">Buscar paciente</label>
            <div className="search-field"><input id="consultation-search" placeholder="Nombre o identificador"
              value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>
          {busy === 'load' ? <p className="list-empty" role="status">Cargando pacientes…</p>
            : <ul className="patient-list">{filtered.map((patient) => (
              <li key={patient.archivo}><button onClick={() => selectPatient(patient)}
                className={selected?.archivo === patient.archivo ? 'selected' : ''}
                aria-pressed={selected?.archivo === patient.archivo}>
                <strong>{patient.nombre || patient.archivo}</strong>
                <span className="patient-meta">{patient.datos_resumen?.edad ?? 'Edad no disponible'} años · {patient.num_analiticas} analíticas</span>
              </button></li>
            ))}</ul>}
          {busy !== 'load' && !filtered.length && <p className="list-empty">
            {patients.length ? 'No hay pacientes con esa búsqueda.' : 'No hay pacientes disponibles. Puedes actualizar o cargar archivos externos.'}
          </p>}
        </aside>

        <div className="consultation-main">
          {selected ? <>
            <PatientEvolutionChart key={selected.archivo} patient={selected} />
            <div className="current-risk-heading">
              <h2>Valoración actual de riesgos</h2>
              <p>Basada en la última analítica y, si hay historial, en la evolución entre las dos últimas visitas.
                Estos riesgos corresponden a la valoración actual, no a cada punto del gráfico.</p>
            </div>
            {busy === 'evaluate' && <div className="surface upload-panel" role="status" aria-live="polite">
              Calculando los riesgos de {selected.nombre} con sus analíticas…
            </div>}
            {error && <div role="alert" className="error-notice upload-error">
              <div><p>{error}</p><button className="button secondary" onClick={() => selectPatient(selected)}>Reintentar valoración</button></div>
            </div>}
            {result && <section className="surface results-panel" aria-label="Resultado del paciente">
              <PatientResults patient={result} busy={busy} showHistory={false} />
            </section>}
          </> : <section className="surface empty-state selection-empty">
            <h2>Selecciona al paciente de la consulta</h2>
            <p>Verás automáticamente su evolución y sus riesgos actuales. Podrás consultar cada analítica por fecha.</p>
          </section>}
        </div>
      </div>
    </div>
  );
}
