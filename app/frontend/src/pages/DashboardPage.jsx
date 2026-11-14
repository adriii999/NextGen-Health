// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Activity,
  FolderOpen,
  Sparkles,
  Users,
  AlertTriangle,
  EyeOff,
  HeartPulse,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { AnaliticasTable } from '../components/folderView/AnaliticasTable';
import { PatientDetailModal } from '../components/folderView/PatientDetailModal';
import { analiticasService } from '../services/analiticasService';
import { MOCK_PATIENTS, MOCK_KPIS } from '../mock/patientsData';

export const DashboardPage = () => {
  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, modelo_cargado: false });
  const [statusMessage, setStatusMessage] = useState(null);

  // Comprobar estado de la API al montar
  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    const status = await analiticasService.checkHealth();
    setBackendStatus(status);
  };

  // Botón Principal en 1 Clic: Analizar Carpeta
  const handleAnalyzeFolder = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await analiticasService.analizarCarpeta();
      if (res.success && res.pacientes?.length > 0) {
        setPatients(res.pacientes);
        if (res.isDemo) {
          setStatusMessage({
            type: 'info',
            text: res.motivoDemo || 'Ejecutando con motor de evaluación clínica integrado.',
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `Análisis completado: ${res.pacientes.length} analíticas evaluadas en tiempo real.`,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Error en la conexión con el servicio de análisis.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Métricas dinámicas calculadas sobre el dataset actual
  const total = patients.length;
  const ocultos = patients.filter((p) => p.categoria === 'OCULTO').length;
  const altos = patients.filter((p) => p.categoria === 'ALTO').length;
  const moderados = patients.filter((p) => p.categoria === 'MEDIO').length;
  const controlados = patients.filter((p) => p.categoria === 'CONTROLADO').length;

  return (
    <div className="space-y-6">
      
      {/* Barra de Estado del Backend y Notificaciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full ${
              backendStatus.online ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400 ring-4 ring-amber-100'
            }`}
          />
          <span className="text-xs font-semibold text-slate-700">
            Backend FastAPI:{' '}
            <span className={backendStatus.online ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
              {backendStatus.online ? 'Conectado (Puerto 8000)' : 'Modo Autónomo Local'}
            </span>
          </span>
          {backendStatus.online && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Modelo ML: {backendStatus.modelo_cargado ? 'Activo (XGBoost)' : 'Pendiente Artefacto'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={checkBackend}
          >
            Sincronizar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            loading={loading}
            onClick={handleAnalyzeFolder}
          >
            Analizar Carpeta en 1 Clic
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Fila de KPIs Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Pacientes */}
        <Card padding="p-4" className="hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pacientes Evaluados
            </span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{total}</span>
            <span className="text-xs font-semibold text-slate-400">en cupo activo</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Control óptimo: <strong>{controlados}</strong></span>
            <span>Moderados: <strong>{moderados}</strong></span>
          </div>
        </Card>

        {/* KPI 2: Riesgo Oculto Silente (Destacado Principal) */}
        <div className="bg-rose-50/80 rounded-xl border-2 border-rose-300/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
              Riesgo Oculto Silente
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-800 animate-pulse">
              Prioridad AP
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-700 tabular-nums">{ocultos}</span>
            <span className="text-xs font-bold text-rose-600">
              ({total > 0 ? Math.round((ocultos / total) * 100) : 0}% del cupo)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-rose-900 leading-snug font-medium">
            Analítica normal en rango estándar, pero con deterioro renal/vascular silencioso en trayectoria.
          </p>
        </div>

        {/* KPI 3: Alto Riesgo Evidente */}
        <Card padding="p-4" className="hover:border-red-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Alto Riesgo Evidente
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{altos}</span>
            <span className="text-xs font-semibold text-red-600">acción farmacológica</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Dislipidemia severa y/o HTA descompensada manifiesta.
          </div>
        </Card>

        {/* KPI 4: Ahorro Operativo en AP */}
        <Card padding="p-4" className="hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Eficiencia de Cribado
            </span>
            <HeartPulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">1 Clic</span>
            <span className="text-xs font-semibold text-slate-400">vs 6 min/paciente</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Ahorro estimado: <strong>~4.8 horas semanales</strong> en revisión manual de analíticas.
          </div>
        </Card>

      </div>

      {/* Banner de Contexto Clínico */}
      <div className="bg-linear-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
              Enfoque Preventivo • Reto 1 Boehringer Ingelheim
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold">
            Detección Precoz del Deterioro Silente en Atención Primaria
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            El sistema cruza valores aislados con su trayectoria interanual (Modo B). Pacientes como Manuel S. R.
            tienen creatinina en rango normal (1.10 mg/dL), pero han perdido un 21% de filtrado glomerular en 12 meses.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="success"
            size="md"
            icon={FileSpreadsheet}
            onClick={() => setSelectedPatient(patients.find((p) => p.categoria === 'OCULTO') || patients[0])}
          >
            Ver Caso Clínico Silente
          </Button>
        </div>
      </div>

      {/* Tabla Principal */}
      <AnaliticasTable
        patients={patients}
        onSelectPatient={(patient) => setSelectedPatient(patient)}
      />

      {/* Modal de Detalle */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

    </div>
  );
};

export default DashboardPage;
