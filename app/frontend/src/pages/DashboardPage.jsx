// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { KpiCard } from '../components/common/KpiCard';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { PatientTable } from '../components/folderView/PatientTable';
import { PatientDrawer } from '../components/drawer/PatientDrawer';
import { AnalyzeFolderButton } from '../components/common/AnalyzeFolderButton';
import { analiticasService } from '../services/analiticasService';
import { MOCK_PATIENTS } from '../mock/patientsData';

export const DashboardPage = () => {
  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Análisis en 1 Clic con simulación de progreso
  const handleAnalyzeFolder = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await analiticasService.analizarCarpeta();
      if (res.success && res.pacientes?.length > 0) {
        setPatients(res.pacientes);
        setNotification({
          type: res.isDemo ? 'info' : 'success',
          text: res.isDemo
            ? `Análisis de cupo completado: ${res.pacientes.length} analíticas evaluadas con motor CDSS de referencia.`
            : `Evaluación en tiempo real completada: ${res.pacientes.length} pacientes estratificados vía FastAPI.`,
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Error al contactar con el servicio de análisis de analíticas.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Contadores para KPIs
  const total = patients.length;
  const ocultos = patients.filter((p) => p.categoria === 'OCULTO').length;
  const altos = patients.filter((p) => p.categoria === 'ALTO').length;
  const controlados = patients.filter((p) => p.categoria === 'CONTROLADO').length;

  return (
    <div className="space-y-5">
      {/* Barra de Acciones Principales de Consulta */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[6px] border border-[#E3E6EB]">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0E1621]">
            Cupo de Atención Primaria • Detección Precoz del Riesgo Silente
          </h2>
          <p className="text-[12px] text-[#5A6573] mt-0.5">
            Cruce de analíticas actuales con historial interanual de 12 meses (Modo B)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAnalyzeFolder()}
            className="px-3 py-1.5 rounded-[6px] border border-[#E3E6EB] hover:bg-[#F6F7F9] text-[#5A6573] text-[12px] font-medium transition-colors inline-flex items-center gap-1.5"
            title="Refrescar lista de analíticas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar</span>
          </button>
          <AnalyzeFolderButton onAnalyze={handleAnalyzeFolder} loading={loading} />
        </div>
      </div>

      {notification && (
        <div
          className={`px-3.5 py-2.5 rounded-[6px] text-[12px] flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-[#E6F4EC] border-[#BDDFC9] text-[#16563C]'
              : notification.type === 'info'
              ? 'bg-[#E8EEF7] border-[#CBD0D8] text-[#1D3B6B]'
              : 'bg-[#FBEAE9] border-[#F5C2C0] text-[#8C1D18]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#1F7A55] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#1D3B6B] shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] underline ml-3 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Fila de Métricas KPIs (Exactamente 4 según la especificación clínica) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1 & 2: Riesgo Oculto Silencioso (Hero, 2 columnas) */}
        <KpiCard
          label="Riesgo Oculto Silencioso Detectado"
          value={ocultos}
          context={`${total > 0 ? Math.round((ocultos / total) * 100) : 0}% del cupo monitorizado. Creatinina estándar en rango normal, pero caída acelerada del filtrado glomerular y microalbuminuria.`}
          isHero={true}
          colSpan="sm:col-span-2"
        />

        {/* KPI 3: Alto Riesgo Evidente */}
        <KpiCard
          label="Alto Riesgo Evidente"
          value={altos}
          context="Dislipidemia severa y cifras tensionales descompensadas que superan los umbrales clínicos de alerta ASCVD."
          isHero={false}
          colSpan="col-span-1"
        />

        {/* KPI 4: Pacientes Evaluados */}
        <KpiCard
          label="Pacientes en Cupo"
          value={total}
          context={`${controlados} pacientes con función cardiorrenal bajo control óptimo y parámetros estables.`}
          isHero={false}
          colSpan="col-span-1"
        />
      </div>

      {/* Tabla de Pacientes con Skeletons durante la carga */}
      {loading ? (
        <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4">
          <div className="text-[12px] font-semibold text-[#1D3B6B] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1D3B6B] animate-pulse" />
            <span>Procesando analíticas y extrayendo trayectorias temporales...</span>
          </div>
          <TableSkeleton rows={5} />
        </div>
      ) : (
        <PatientTable
          patients={patients}
          onSelectPatient={(p) => setSelectedPatient(p)}
        />
      )}

      {/* Drawer Lateral Deslizante para Detalle Clínico */}
      {selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
