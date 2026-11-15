import { useEffect, useRef, useState } from 'react';
import { analiticasService, analysisError } from '../services/analiticasService';
import { PatientResults } from '../components/folderView/PatientResults';
import { PriorityInbox } from '../components/folderView/PriorityInbox';
import { PatientQuickNav } from '../components/folderView/PatientQuickNav';
import { IncompletePatientDetail } from '../components/folderView/IncompletePatientDetail';
import { PatientEvolutionChart } from '../components/charts/PatientEvolutionChart';
import { UploadPatientPage } from './UploadPatientPage';
import { patientDisplayName } from '../services/patientDisplayName';

function attachHistory(patient, sources) {
  const source = sources.find((item) => item.archivo === patient.paciente_id);
  const visits = patient.historial_visitas.length ? patient.historial_visitas : [{
    nombre_archivo: patient.analitica_evaluada,
    fecha_analitica: patient.datos_entrada.fecha_analitica,
    ...patient.datos_entrada,
  }];
  return {
    ...patient,
    analiticas: visits.map((visit) => ({
      nombre_archivo: visit.nombre_archivo,
      fecha_analitica: visit.fecha_analitica,
      datos_resumen: {
        ...source?.analiticas?.find((item) => item.nombre_archivo === visit.nombre_archivo)?.datos_resumen,
        ...visit,
      },
    })),
  };
}

export function DashboardPage() {
  const [sources, setSources] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [busy, setBusy] = useState('load');
  const [error, setError] = useState('');
  const [failedAction, setFailedAction] = useState('');
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [upload, setUpload] = useState(false);
  const [sourceStatus, setSourceStatus] = useState('');
  const requestId = useRef(0);
  const lastOpened = useRef(null);
  const detailHeading = useRef(null);
  const initialAnalysisStarted = useRef(false);
  const analyzedVersion = useRef(null);

  async function loadSources() {
    const id = ++requestId.current;
    setBusy('load');
    setError('');
    setFailedAction('');
    try {
      const response = await analiticasService.getArchivosAnaliticas();
      if (id === requestId.current) setSources(response.archivos);
    } catch (err) {
      if (id === requestId.current) {
        setError(analysisError(err));
        setFailedAction('load');
      }
    } finally {
      if (id === requestId.current) setBusy('');
    }
  }

  useEffect(() => {
    if (initialAnalysisStarted.current) return;
    initialAnalysisStarted.current = true;
    analyzeCupo();
  }, []);

  useEffect(() => {
    if (!analyzedAt) return;
    let cancelled = false;
    async function checkSources() {
      try {
        const version = await analiticasService.getVersionFuentes();
        if (!cancelled) setSourceStatus(version === analyzedVersion.current ? '' : 'changed');
      } catch {
        if (!cancelled) setSourceStatus('unknown');
      }
    }
    window.addEventListener('focus', checkSources);
    const timer = window.setInterval(checkSources, 60000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', checkSources);
      window.clearInterval(timer);
    };
  }, [analyzedAt]);

  useEffect(() => {
    if (selected) detailHeading.current?.focus();
    else if (!upload && lastOpened.current) {
      document.getElementById(`review-${lastOpened.current}`)?.focus();
    }
  }, [selected, upload]);

  async function analyzeCupo() {
    const id = ++requestId.current;
    setBusy('analyze');
    setError('');
    setFailedAction('');
    setSelected(null);
    setSourceStatus('');
    lastOpened.current = null;
    try {
      const before = await analiticasService.getVersionFuentes();
      const inventory = await analiticasService.getArchivosAnaliticas();
      if (id !== requestId.current) return;
      setSources(inventory.archivos);
      if (inventory.archivos.length === 0) {
        setPatients([]);
        setAnalyzedAt(null);
        return;
      }
      const analysis = await analiticasService.analizarCarpeta('B');
      const after = await analiticasService.getVersionFuentes();
      if (id !== requestId.current) return;
      analyzedVersion.current = before;
      setSourceStatus(before === after ? '' : 'changed');
      setPatients(analysis.pacientes.map((patient) => attachHistory(patient, inventory.archivos)));
      setAnalyzedAt(new Date());
    } catch (err) {
      if (id === requestId.current) {
        setPatients([]);
        setAnalyzedAt(null);
        analyzedVersion.current = null;
        setError(analysisError(err));
        setFailedAction('analyze');
      }
    } finally {
      if (id === requestId.current) setBusy('');
    }
  }

  function selectPatient(patient) {
    lastOpened.current = patient.id;
    setSelected(patient);
  }

  if (upload) return <>
    <div className="consultation-back"><button className="button secondary" onClick={() => setUpload(false)}>Volver al cupo</button></div>
    <UploadPatientPage />
  </>;

  if (selected) return (
    <div className="workspace">
      {sourceStatus && <p role="status" className="consultation-demo">
        {sourceStatus === 'changed' ? 'Hay cambios en las analíticas. Vuelve a la lista y revisa de nuevo.' : 'No se pudo comprobar si las analíticas han cambiado.'}
      </p>}
      <div className="page-heading patient-page-heading">
        <div>
          <p className="eyebrow">Revisión individual</p>
          <h1 ref={detailHeading} tabIndex={-1}>{patientDisplayName(selected)}</h1>
          <p>Evaluado {analyzedAt.toLocaleString('es-ES')}</p>
        </div>
        <button className="button secondary detail-back" onClick={() => setSelected(null)}>Volver a la lista de pacientes</button>
      </div>
      <div className="patient-detail-layout">
        <PatientQuickNav patients={patients} selected={selected} onSelect={selectPatient} />
        <div className="patient-detail-content">
          {selected.estado === 'EVALUADA' ? <>
            <section className="surface results-panel" aria-label="Resultado del paciente">
              <PatientResults patient={selected} busy={busy} showHistory={false} showPatientHeading={false} />
            </section>
            <details className="patient-history-disclosure">
              <summary>Ver evolución · {selected.historial_visitas.length || 1} analíticas</summary>
              <PatientEvolutionChart key={selected.id} patient={{ ...selected, nombre: patientDisplayName(selected) }} />
            </details>
          </> : <IncompletePatientDetail patient={selected} />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Atención Primaria · <span>Prototipo experimental</span></p>
          <h1>Pacientes por revisar</h1>
        </div>
        <div className="inbox-actions">
          <button className="button primary" disabled={!!busy || (!sources.length && !analyzedAt) || !!failedAction}
            onClick={analyzeCupo}>
            {busy === 'analyze' ? 'Revisando analíticas…' : 'Revisar de nuevo'}
          </button>
          <details className="review-tools">
            <summary>Más opciones</summary>
            <div className="review-tools-content">
              <p>Revisa las analíticas de un paciente que no está en la lista.</p>
              <button className="button secondary" disabled={!!busy} onClick={() => setUpload(true)}>Cargar archivos externos</button>
            </div>
          </details>
        </div>
      </div>

      {sourceStatus && <p role="status" className="consultation-demo">
        {sourceStatus === 'changed' ? 'Hay cambios en las analíticas. Revisa el cupo de nuevo.' : 'No se pudo comprobar si las analíticas han cambiado.'}
      </p>}

      {error && <div role="alert" className="error-notice upload-error">
        <div>
          <p>{error}</p>
          <button className="button secondary" onClick={failedAction === 'load' ? loadSources : analyzeCupo}>
            {failedAction === 'load' ? 'Reintentar carga' : 'Reintentar análisis'}
          </button>
        </div>
      </div>}

      {busy && analyzedAt && <p role="status" aria-live="polite" className="consultation-demo">
        Actualizando la lista. Los resultados visibles corresponden a la revisión anterior.
      </p>}
      {busy && !analyzedAt ? <section className="surface empty-state" role="status" aria-live="polite">
        <h2>{busy === 'analyze' ? 'Revisando las analíticas' : 'Cargando fuentes de analíticas'}</h2>
        <p>{busy === 'analyze'
          ? 'Buscando datos que ayuden a ordenar el cupo. Puede tardar unos instantes.'
          : 'Consultando los archivos disponibles en el servidor.'}</p>
      </section> : analyzedAt ? <PriorityInbox
        patients={patients} analyzedAt={analyzedAt} search={search} priority={priority}
        onSearch={setSearch} onPriority={setPriority} onSelect={selectPatient} busy={!!busy}
      /> : !error && <section className="surface empty-state">
        <h2>{sources.length ? 'El cupo está pendiente de análisis' : 'La carpeta del servidor está vacía'}</h2>
        <p>{sources.length
          ? `${sources.length} fuentes de analíticas disponibles.`
          : 'No hay fuentes de analíticas disponibles en la carpeta del servidor.'}</p>
        <p>La carga externa permite revisar un paciente por separado; no lo incorpora al cupo del servidor.</p>
        <button className="button secondary" onClick={loadSources}>Actualizar fuentes</button>
      </section>}
    </div>
  );
}
