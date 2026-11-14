import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, Search, FileText, ArrowLeft, Activity, Check, AlertCircle } from 'lucide-react';
import { analiticasService, analysisError } from '../services/analiticasService';
import { PatientResults } from '../components/folderView/PatientResults';

export const DashboardPage = () => {
  const [files, setFiles] = useState(null);
  const [patients, setPatients] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    setBusy('files');
    setError('');
    setPatients(null);
    setSelected(null);
    try {
      const [response, status] = await Promise.all([
        analiticasService.getArchivosAnaliticas(),
        analiticasService.checkHealth(),
      ]);
      setFiles(response.archivos);
      setHealth(status);
    } catch (err) {
      setError(analysisError(err));
    } finally {
      setBusy('');
    }
  }

  async function analyze(modo = 'B') {
    setBusy('analysis');
    setError('');
    setPatients(null);
    setSelected(null);
    try {
      const response = await analiticasService.analizarCarpeta(modo);
      setPatients(response.pacientes);
      if (response.pacientes.length > 0) {
        setSelected(response.pacientes[0].id);
      }
    } catch (err) {
      setError(analysisError(err));
    } finally {
      setBusy('');
    }
  }

  async function evaluateSingle({ paciente_id, modo = 'B', analitica_archivo = null }) {
    setBusy('single');
    setError('');
    try {
      const response = await analiticasService.evaluarSeguimientoOAnalitica({
        paciente_id,
        modo,
        analitica_archivo,
      });
      const evaluatedPatient = response.paciente;
      setPatients((prev) => {
        if (!prev || prev.length === 0) {
          return [evaluatedPatient];
        }
        const exists = prev.some((p) => p.paciente_id === evaluatedPatient.paciente_id);
        if (exists) {
          return prev.map((p) =>
            p.paciente_id === evaluatedPatient.paciente_id ? evaluatedPatient : p
          );
        }
        return [evaluatedPatient, ...prev];
      });
      setSelected(evaluatedPatient.id);
    } catch (err) {
      setError(analysisError(err));
    } finally {
      setBusy('');
    }
  }

  const filtered = (patients || []).filter(
    (p) =>
      `${p.nombre} ${p.archivo} ${p.paciente_id || ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (!priority || p.nivel_prioridad === priority)
  );
  const patient = patients?.find((p) => p.id === selected);

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Consulta · Revisión clínica y longitudinal</p>
          <h1>Seguimientos y analíticas de pacientes</h1>
          <p>
            Evalúa carpetas de seguimiento longitudinal completo (Modo B) o analíticas individuales aisladas (Modo A) conectadas en tiempo real con el modelo.
          </p>
        </div>
        <div className="heading-actions">
          {health && (
            <span className={`status-pill ${health.modelo_cargado ? 'ready' : 'pending'}`}>
              {health.modelo_cargado ? 'Modelo XGBoost + SHAP activo' : 'Modelo pendiente (501)'}
            </span>
          )}
          <details className="review-tools">
            <summary>Opciones de analíticas</summary>
            <div className="review-tools-content">
              <p>Sincroniza las carpetas de pacientes desde data/analiticas/ en el servidor.</p>
              <button
                className="button secondary"
                onClick={(event) => {
                  const details = event.currentTarget.closest('details');
                  if (details) details.open = false;
                  loadFiles();
                }}
                disabled={!!busy}
              >
                {files ? <RefreshCw size={18} aria-hidden="true" /> : <FolderOpen size={18} aria-hidden="true" />}
                {busy === 'files' ? 'Cargando analíticas…' : files ? 'Actualizar archivos' : 'Cargar analíticas'}
              </button>
            </div>
          </details>
        </div>
      </div>

      {!patients && (
        <ol className="workflow" aria-label="Proceso de revisión">
          <li className={files ? 'complete' : 'current'}>
            <span>{files ? <Check size={16} /> : '1'}</span>
            <div>
              <strong>Cargar carpetas de pacientes</strong>
              <small>Seguimientos en data/analiticas/</small>
            </div>
          </li>
          <li className={patients ? 'complete' : files?.length ? 'current' : ''}>
            <span>{patients ? <Check size={16} /> : '2'}</span>
            <div>
              <strong>Ejecutar Modo A o Modo B</strong>
              <small>Analítica aislada o seguimiento completo</small>
            </div>
          </li>
          <li className={patients ? 'current' : ''}>
            <span>3</span>
            <div>
              <strong>Revisar un paciente</strong>
              <small>Riesgos, KDIGO y explicación SHAP</small>
            </div>
          </li>
        </ol>
      )}

      {error && (
        <div className="error-notice" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>No se ha completado la operación</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {busy === 'analysis'
          ? 'Analizando las analíticas. Espera a que termine el proceso.'
          : patients
          ? `${patients.length} resultados disponibles.`
          : ''}
      </div>

      {!patients && (
        <section className="surface intake" aria-busy={!!busy}>
          <div className="section-heading">
            <div>
              <h2>Carpetas de pacientes en data/analiticas/</h2>
              <p>
                Cada carpeta agrupa las analíticas cronológicas de un paciente para permitir evaluar todo el seguimiento (Modo B) o una analítica sola (Modo A).
              </p>
            </div>
            {files && <span className="count-label">{files.length} carpetas / registros</span>}
          </div>

          {files === null ? (
            <div className="empty-state">
              <FolderOpen size={40} strokeWidth={1.4} aria-hidden="true" />
              <h3>{busy ? 'Cargando carpetas de pacientes…' : 'Empieza por cargar las analíticas'}</h3>
              <p>Consulta las carpetas de seguimiento disponibles antes de enviarlas al modelo.</p>
              {!busy && (
                <button className="button primary" onClick={loadFiles}>
                  <FolderOpen size={18} aria-hidden="true" />
                  Cargar analíticas
                </button>
              )}
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <h3>No hay analíticas disponibles</h3>
              <p>Añade carpetas de pacientes o archivos a data/analiticas/ en el servidor y actualiza la lista.</p>
            </div>
          ) : (
            <>
              <ul className="file-list">
                {files.map((file) => {
                  const visitas = Array.isArray(file.analiticas) ? file.analiticas : [];
                  return (
                    <li key={file.archivo} className="patient-folder-card">
                      <div className="folder-main-row">
                        <FolderOpen size={22} aria-hidden="true" />
                        <div className="folder-info">
                          <strong>{file.nombre || file.archivo}</strong>
                          <small>
                            Carpeta: <code>{file.archivo}</code> · {file.num_analiticas || visitas.length || 1}{' '}
                            {(file.num_analiticas || visitas.length || 1) === 1 ? 'analítica' : 'analíticas'} · Modificado:{' '}
                            {file.fecha_modificacion || 'No disponible'} ·{' '}
                            {Number.isFinite(file.tamano_bytes)
                              ? `${(file.tamano_bytes / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} KB`
                              : 'Tamaño no disponible'}
                          </small>
                        </div>
                        <span className="file-context">
                          {file.tiene_progresion ? 'Con evolución (Modo A y B)' : 'Analítica aislada (Modo A)'}
                        </span>
                        <div className="folder-actions">
                          {file.tiene_progresion && (
                            <button
                              type="button"
                              className="button primary small"
                              disabled={!!busy}
                              onClick={() =>
                                evaluateSingle({
                                  paciente_id: file.archivo,
                                  modo: 'B',
                                })
                              }
                            >
                              <Activity size={15} aria-hidden="true" />
                              Ejecutar seguimiento (Modo B)
                            </button>
                          )}
                          <button
                            type="button"
                            className="button secondary small"
                            disabled={!!busy}
                            onClick={() =>
                              evaluateSingle({
                                paciente_id: file.archivo,
                                modo: 'A',
                                analitica_archivo: visitas.at(-1)?.nombre_archivo || null,
                              })
                            }
                          >
                            Ejecutar última aislada (Modo A)
                          </button>
                        </div>
                      </div>

                      {visitas.length > 0 && (
                        <ul className="visit-sublist" aria-label={`Analíticas de ${file.nombre || file.archivo}`}>
                          {visitas.map((v) => (
                            <li key={v.archivo} className="visit-subitem">
                              <FileText size={16} aria-hidden="true" />
                              <div className="visit-subinfo">
                                <span>
                                  <strong>{v.fecha_analitica || v.nombre_archivo}</strong> ({v.nombre_archivo})
                                </span>
                                {v.datos_resumen && (
                                  <small>
                                    eGFR: {v.datos_resumen.egfr ?? '-'} mL/min · uACR: {v.datos_resumen.uacr ?? '-'} mg/g · TA:{' '}
                                    {v.datos_resumen.ap_hi ?? '-'}/{v.datos_resumen.ap_lo ?? '-'} mmHg · Col:{' '}
                                    {v.datos_resumen.colesterol_total ?? '-'} mg/dL
                                  </small>
                                )}
                              </div>
                              <button
                                type="button"
                                className="button secondary tiny"
                                disabled={!!busy}
                                onClick={() =>
                                  evaluateSingle({
                                    paciente_id: file.archivo,
                                    modo: 'A',
                                    analitica_archivo: v.nombre_archivo,
                                  })
                                }
                              >
                                Evaluar sola (Modo A)
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="intake-action">
                <div>
                  <strong>Analiza todas las carpetas de pacientes en lote</strong>
                  <p>
                    {health?.modelo_cargado
                      ? 'Modelo disponible. Puedes evaluar el lote completo con evolución interanual (Modo B) o como analíticas aisladas sin historial (Modo A).'
                      : 'La disponibilidad del modelo se comprobará al analizar.'}
                  </p>
                </div>
                <div className="batch-buttons">
                  <button className="button secondary" onClick={() => analyze('A')} disabled={!!busy}>
                    Analizar lote en Modo A (aisladas)
                  </button>
                  <button className="button primary" onClick={() => analyze('B')} disabled={!!busy}>
                    <Activity size={18} aria-hidden="true" />
                    {busy === 'analysis' ? 'Analizando lote…' : 'Analizar lote'}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {patients && (
        <div className={`review-layout ${patient ? 'has-selection' : ''}`}>
          <aside className="surface patient-sidebar" aria-label="Seleccionar paciente">
            <div className="section-heading">
              <div>
                <h2>Pacientes</h2>
                <p>{patients.length} resultados evaluados</p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setPatients(null);
                  setSelected(null);
                }}
                aria-label="Volver a los archivos"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            <div className="patient-filters">
              <label htmlFor="patient-search">Buscar paciente o archivo</label>
              <div className="search-field">
                <Search size={18} aria-hidden="true" />
                <input
                  id="patient-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre o carpeta"
                />
              </div>
              <label htmlFor="priority">Prioridad de revisión</label>
              <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="">Todas las prioridades</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <ul className="patient-list">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    className={selected === p.id ? 'selected' : ''}
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    <span className="patient-row">
                      <strong>{p.nombre}</strong>
                      <span className={`priority priority-${p.nivel_prioridad}`}>
                        {p.nivel_prioridad || 'Sin prioridad'}
                      </span>
                    </span>
                    <span className="patient-meta">
                      {p.edad !== null ? `${p.edad} años · ` : ''}
                      {p.modo_evaluacion === 'MODO_B'
                        ? `Modo B (Seguimiento · ${p.num_analiticas} analíticas)`
                        : 'Modo A (Analítica aislada)'}
                    </span>
                    <span className="patient-reason">
                      {p.disparador_principal || 'Consulta la evaluación del modelo.'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!filtered.length && (
              <p className="list-empty">
                {patients.length ? 'No hay resultados con estos filtros.' : 'El servicio no devolvió pacientes evaluables.'}
              </p>
            )}
          </aside>
          <section className="surface results-panel" aria-label="Resultado del paciente">
            {patient ? (
              <>
                <button className="button secondary mobile-back" onClick={() => setSelected(null)}>
                  <ArrowLeft size={18} />
                  Volver a pacientes
                </button>
                <PatientResults
                  key={patient.id}
                  patient={patient}
                  onEvaluateMode={evaluateSingle}
                  busy={busy}
                />
              </>
            ) : (
              <div className="empty-state selection-empty">
                <Activity size={42} strokeWidth={1.3} aria-hidden="true" />
                <h2>Selecciona un paciente</h2>
                <p>Verás su valoración, los parámetros de la analítica y los factores que explican el resultado.</p>
                <span className="quiet-label">Cada resultado pertenece a una analítica del lote.</span>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
