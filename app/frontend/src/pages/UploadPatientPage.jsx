import { useState } from 'react';
import { analiticasService, analysisError } from '../services/analiticasService';
import { readPatientFiles } from '../services/patientUpload';
import { PatientResults } from '../components/folderView/PatientResults';

const fields = [
  ['edad', 'Edad (años)'], ['sexo', 'Sexo (1 mujer, 2 hombre)'],
  ['bmi', 'IMC (kg/m²)'], ['ap_hi', 'Sistólica (mmHg)'],
  ['ap_lo', 'Diastólica (mmHg)'], ['colesterol_total', 'Colesterol (mg/dL)'],
  ['fuma', 'Fuma (0 no, 1 sí)'], ['diabetes', 'Diabetes (0 no, 1 sí)'],
  ['egfr', 'Filtrado del riñón (mL/min)'], ['uacr', 'Albúmina en orina (mg/g)'],
];

export const UploadPatientPage = () => {
  const [visits, setVisits] = useState([]);
  const [preview, setPreview] = useState(null);
  const [patient, setPatient] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('B');
  const [selectedFile, setSelectedFile] = useState('');
  const [inputKey, setInputKey] = useState(0);

  function reset() {
    setVisits([]);
    setPreview(null);
    setPatient(null);
    setError('');
    setSelectedFile('');
    setMode('B');
    setInputKey((key) => key + 1);
  }

  async function load(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    setBusy('load');
    setError('');
    setPatient(null);
    setPreview(null);
    setVisits([]);
    try {
      const loaded = await readPatientFiles(files);
      const data = await analiticasService.validarCarga({ visitas: loaded, modo: 'B' });
      setVisits(loaded);
      setPreview(data);
      setSelectedFile(data.analitica_evaluada);
      setMode(data.num_analiticas > 1 ? 'B' : 'A');
    } catch (err) {
      setError(analysisError(err));
    } finally {
      setBusy('');
      setInputKey((key) => key + 1);
    }
  }

  async function evaluate(options = {}) {
    const nextMode = options.modo || mode;
    const filename = options.analitica_archivo || selectedFile;
    setBusy('evaluate');
    setError('');
    setPatient(null);
    try {
      const result = await analiticasService.evaluarCarga({
        visitas: visits, modo: nextMode,
        analitica_archivo: nextMode === 'A' ? filename : null,
      });
      setPatient(result);
      setMode(nextMode);
      setSelectedFile(result.analitica_evaluada);
    } catch (err) {
      setError(analysisError(err));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <h1>Revisar un paciente</h1>
          <p>Carga sus analíticas y consulta los riesgos, la evolución y los factores que explican la valoración.</p>
        </div>
        {preview && <button className="button secondary" disabled={!!busy} onClick={reset}>Revisar otro paciente</button>}
      </div>

      {error && <div className="error-notice upload-error" role="alert"><p>{error}</p></div>}

      <section className="surface upload-panel" aria-labelledby="upload-title" aria-busy={!!busy}>
        <div className="section-heading">
          <div>
            <h2 id="upload-title">Analíticas del paciente</h2>
            <p>Selecciona uno o varios JSON del mismo paciente, un archivo por visita.</p>
          </div>
        </div>
        <label htmlFor="patient-files">Cargar analíticas desde tu ordenador</label>
        <input key={inputKey} id="patient-files" type="file" accept=".json,application/json" multiple
          disabled={!!busy} onChange={load} aria-describedby="upload-help" />
        <p id="upload-help" className="upload-help">
          Hasta 50 archivos de 1 MB. Se envían al servidor para validarlos y evaluarlos, sin guardarlos en disco.
          Una nueva selección sustituye a la anterior.
        </p>
        <details className="upload-format">
          <summary>¿Qué debe contener cada JSON?</summary>
          <p>Incluye nombre, fecha_analitica (AAAA-MM-DD) y los diez campos siguientes.
            Usa el mismo nombre e identificador, si existe, en todas las visitas.</p>
          <dl className="upload-fields">
            {fields.map(([key, label]) => <div key={key}><dt><code>{key}</code></dt><dd>{label}</dd></div>)}
          </dl>
          <p>Con varias visitas calculamos la evolución entre las dos últimas fechas.
            Con una sola evaluamos los valores actuales. No se admiten PDF ni imágenes.</p>
        </details>
      </section>

      <p className="upload-status" role="status" aria-live="polite">
        {busy === 'load' ? 'Leyendo y validando las analíticas…'
          : busy === 'evaluate' ? 'Evaluando al paciente. Espera a que termine el modelo…'
          : preview ? `${preview.num_analiticas} analíticas validadas de ${preview.nombre}.`
          : 'Todavía no has cargado analíticas.'}
      </p>

      {preview && (
        <section className="surface upload-panel" aria-labelledby="preview-title">
          <div className="section-heading">
            <div><h2 id="preview-title">{preview.nombre}</h2><p>Revisa los valores antes de evaluar.</p></div>
          </div>
          <div className="visits-table-wrap" tabIndex={0} role="region" aria-label="Datos de las analíticas cargadas">
            <table className="visits-table">
              <thead><tr><th>Fecha / archivo</th>{fields.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
              <tbody>{preview.historial_visitas.map((visit) => (
                <tr key={visit.nombre_archivo}>
                  <td>{visit.fecha_analitica}<small className="visit-filename">{visit.nombre_archivo}</small></td>
                  {fields.map(([key]) => <td key={key}>{visit[key]}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="upload-controls">
            <div>
              <label htmlFor="evaluation-mode">Tipo de evaluación</label>
              <select id="evaluation-mode" value={mode} disabled={!!busy} onChange={(event) => {
                setMode(event.target.value); setPatient(null);
              }}>
                <option value="A">Una analítica aislada</option>
                {preview.num_analiticas > 1 && <option value="B">Seguimiento con evolución</option>}
              </select>
            </div>
            {mode === 'A' && <div>
              <label htmlFor="selected-visit">Analítica a evaluar</label>
              <select id="selected-visit" value={selectedFile} disabled={!!busy} onChange={(event) => {
                setSelectedFile(event.target.value); setPatient(null);
              }}>
                {preview.historial_visitas.map((visit) => <option key={visit.nombre_archivo} value={visit.nombre_archivo}>
                  {visit.fecha_analitica} · {visit.nombre_archivo}
                </option>)}
              </select>
            </div>}
            <button className="button primary" disabled={!!busy} onClick={() => evaluate()}>
              {busy === 'evaluate' ? 'Evaluando paciente…' : 'Evaluar paciente'}
            </button>
          </div>
        </section>
      )}

      {patient && (
        <section className="surface results-panel upload-results" aria-label="Resultado del paciente">
          <PatientResults
            key={`${patient.id}-${patient.modo_evaluacion}-${patient.analitica_evaluada}`}
            patient={patient}
            busy={busy}
            onEvaluateMode={evaluate}
          />
        </section>
      )}
    </div>
  );
};
