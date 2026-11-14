import { useState } from 'react';
import { FolderOpen, RefreshCw, Search, FileText, ArrowLeft, Activity, Check, AlertCircle } from 'lucide-react';
import { analiticasService, analysisError } from '../services/analiticasService';
import { PatientResults } from '../components/folderView/PatientResults';
import { DEMO_FILES, DEMO_PATIENTS } from '../mock/frontendDemoData';

export const DashboardPage = () => {
  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  const [files, setFiles] = useState(demoMode ? DEMO_FILES : null);
  const [patients, setPatients] = useState(demoMode ? DEMO_PATIENTS : null);
  const [selected, setSelected] = useState(demoMode ? DEMO_PATIENTS[0].id : null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');

  async function loadFiles() {
    setBusy('files'); setError('');
    setPatients(null); setSelected(null); setFiles(null);
    if (demoMode) {
      setFiles(DEMO_FILES);
      setHealth({ online: false, modelo_cargado: false });
      setBusy('');
      return;
    }
    try {
      const [response, status] = await Promise.all([analiticasService.getArchivosAnaliticas(), analiticasService.checkHealth()]);
      setFiles(response.archivos); setHealth(status);
    } catch (err) { setError(analysisError(err)); }
    finally { setBusy(''); }
  }

  async function analyze() {
    setBusy('analysis'); setError(''); setPatients(null); setSelected(null);
    if (demoMode) {
      setPatients(DEMO_PATIENTS);
      setBusy('');
      return;
    }
    try {
      const response = await analiticasService.analizarCarpeta();
      setPatients(response.pacientes);
    } catch (err) { setError(analysisError(err)); }
    finally { setBusy(''); }
  }

  const filtered = (patients || []).filter((p) =>
    `${p.nombre} ${p.archivo}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
    (!priority || p.nivel_prioridad === priority));
  const patient = patients?.find((p) => p.id === selected);

  return (
    <div className="workspace">
      <div className="page-heading">
        <div><p className="eyebrow">Consulta · Revisión individual</p><h1>Revisar un paciente</h1><p>Consulta sus riesgos, entiende el resultado y revisa los datos de la analítica.</p></div>
        <details className="review-tools">
          <summary>{demoMode ? 'Opciones de prueba' : 'Opciones de analíticas'}</summary>
          <div className="review-tools-content">
          <p>{demoMode ? 'Vuelve al inicio del flujo para probar la carga y el análisis con datos ficticios.' : 'Carga los archivos del servicio para preparar un nuevo lote de resultados.'}</p>
          <button className="button secondary" onClick={(event) => { event.currentTarget.closest('details').open = false; loadFiles(); }} disabled={!!busy}>
          {files ? <RefreshCw size={18} aria-hidden="true" /> : <FolderOpen size={18} aria-hidden="true" />}
          {busy === 'files' ? 'Cargando analíticas…' : files ? 'Actualizar archivos' : 'Cargar analíticas'}
        </button>
          </div>
        </details>
      </div>

      {demoMode && <div className="demo-banner" role="note"><strong>Modo demo, datos completamente ficticios.</strong><span>No son pacientes ni predicciones reales. No se consulta ni se envía información al backend.</span></div>}

      {!patients && <ol className="workflow" aria-label="Proceso de revisión">
        <li className={files ? 'complete' : 'current'}><span>{files ? <Check size={16} /> : '1'}</span><div><strong>Cargar analíticas</strong><small>Archivos disponibles</small></div></li>
        <li className={patients ? 'complete' : files?.length ? 'current' : ''}><span>{patients ? <Check size={16} /> : '2'}</span><div><strong>Analizar el lote</strong><small>Evaluación del modelo</small></div></li>
        <li className={patients ? 'current' : ''}><span>3</span><div><strong>Revisar un paciente</strong><small>Resultados y explicación</small></div></li>
      </ol>}

      {error && <div className="error-notice" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>No se ha completado la operación</strong><p>{error}</p></div></div>}
      <div role="status" aria-live="polite" className="sr-only">{busy === 'analysis' ? 'Analizando las analíticas. Espera a que termine el proceso.' : patients ? `${patients.length} resultados disponibles.` : ''}</div>

      {!patients && (
        <section className="surface intake" aria-busy={!!busy}>
          <div className="section-heading"><div><h2>Analíticas disponibles</h2><p>Archivos JSON y CSV de la carpeta del servicio.</p></div>{files && <span className="count-label">{files.length} archivos</span>}</div>
          {files === null ? <div className="empty-state"><FolderOpen size={40} strokeWidth={1.4} aria-hidden="true" /><h3>{busy ? 'Cargando archivos…' : 'Empieza por cargar las analíticas'}</h3><p>Consulta los archivos disponibles antes de enviarlos al modelo.</p></div>
            : files.length === 0 ? <div className="empty-state"><h3>No hay analíticas disponibles</h3><p>Añade archivos a data/analiticas/ en el servidor y actualiza la lista.</p></div>
            : <><ul className="file-list">{files.map((file) => <li key={file.archivo}><FileText size={22} aria-hidden="true" /><div><strong>{file.archivo}</strong><small>Modificado: {file.fecha_modificacion || 'No disponible'} · {Number.isFinite(file.tamano_bytes) ? `${(file.tamano_bytes / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} KB` : 'Tamaño no disponible'}</small></div><span className="file-context">{file.tiene_progresion ? 'Con evolución' : 'Analítica aislada'}</span></li>)}</ul>
            <div className="intake-action"><div><strong>Analiza todos los archivos disponibles</strong><p>{health?.modelo_cargado ? 'Modelo disponible. El resultado se mostrará por paciente.' : 'La disponibilidad del modelo se comprobará al analizar.'} Un CSV puede contener varios pacientes.</p></div><button className="button primary" onClick={analyze} disabled={!!busy}><Activity size={18} aria-hidden="true" />{busy === 'analysis' ? 'Analizando lote…' : 'Analizar lote'}</button></div></>}
        </section>
      )}

      {patients && <div className={`review-layout ${patient ? 'has-selection' : ''}`}>
        <aside className="surface patient-sidebar" aria-label="Seleccionar paciente">
          <div className="section-heading"><div><h2>Pacientes</h2><p>{patients.length} resultados del lote</p></div><button className="icon-button" onClick={() => { setPatients(null); setSelected(null); }} aria-label="Volver a los archivos"><ArrowLeft size={20} /></button></div>
          <div className="patient-filters"><label htmlFor="patient-search">Buscar paciente o archivo</label><div className="search-field"><Search size={18} aria-hidden="true" /><input id="patient-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o archivo" /></div><label htmlFor="priority">Prioridad de revisión</label><select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas las prioridades</option><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></div>
          <ul className="patient-list">{filtered.map((p) => <li key={p.id}><button className={selected === p.id ? 'selected' : ''} aria-pressed={selected === p.id} onClick={() => setSelected(p.id)}><span className="patient-row"><strong>{p.nombre}</strong><span className={`priority priority-${p.nivel_prioridad}`}>{p.nivel_prioridad || 'Sin prioridad'}</span></span><span className="patient-meta">{p.edad !== null ? `${p.edad} años · ` : ''}{p.tiene_progresion ? 'Con evolución' : 'Sin evolución disponible'}</span><span className="patient-reason">{p.disparador_principal || 'Consulta la evaluación del modelo.'}</span></button></li>)}</ul>
          {!filtered.length && <p className="list-empty">{patients.length ? 'No hay resultados con estos filtros.' : 'El servicio no devolvió pacientes evaluables.'}</p>}
        </aside>
        <section className="surface results-panel" aria-label="Resultado del paciente">
          {patient ? <><button className="button secondary mobile-back" onClick={() => setSelected(null)}><ArrowLeft size={18} />Volver a pacientes</button><PatientResults key={patient.id} patient={patient} /></>
            : <div className="empty-state selection-empty"><Activity size={42} strokeWidth={1.3} aria-hidden="true" /><h2>Selecciona un paciente</h2><p>Verás su valoración, los parámetros de la analítica y los factores que explican el resultado.</p><span className="quiet-label">Cada resultado pertenece a una analítica del lote.</span></div>}
        </section>
      </div>}
    </div>
  );
};
