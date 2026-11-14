// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { IngestPage } from './pages/IngestPage';
import { BackendStatusBadge } from './components/common/BackendStatusBadge';
import { analiticasService } from './services/analiticasService';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState({ online: false, modelo_cargado: false });

  // Comprobar estado de FastAPI al iniciar
  useEffect(() => {
    const check = async () => {
      const res = await analiticasService.checkHealth();
      setBackendStatus(res);
    };
    check();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#0E1621] flex flex-col font-sans antialiased">
      
      {/* Cabecera Clínica Sobria con Pestañas Subrayadas */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E3E6EB]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            
            {/* Logo y Nombre Institucional */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[4px] bg-[#1D3B6B] text-white flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-[15px] font-semibold tracking-tight text-[#0E1621]">
                  NextGen Health
                </h1>
                <span className="text-[11px] text-[#5A6573] font-mono">
                  CDSS Atención Primaria • Reto 1 Boehringer Ingelheim
                </span>
              </div>
            </div>

            {/* Navegación como Pestañas Subrayadas (según especificación) */}
            <nav className="flex items-center h-full gap-6">
              {[
                { id: 'dashboard', label: 'Dashboard de Cupo' },
                { id: 'simulator', label: 'Simulador Clínico' },
                { id: 'ingest', label: 'Buzón de Analíticas' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-full border-b-2 text-[13px] font-medium transition-colors px-1 flex items-center ${
                      isActive
                        ? 'border-[#1D3B6B] text-[#1D3B6B] font-semibold'
                        : 'border-transparent text-[#5A6573] hover:text-[#0E1621] hover:border-[#CBD0D8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Indicador Discreto del Backend */}
            <div className="flex items-center gap-2">
              <BackendStatusBadge
                online={backendStatus.online}
                modeloCargado={backendStatus.modelo_cargado}
              />
            </div>

          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-6">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'simulator' && <SimulatorPage />}
        {activeTab === 'ingest' && <IngestPage />}
      </main>

      {/* Pie de Página Clínico */}
      <footer className="border-t border-[#E3E6EB] bg-white py-3.5 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5A6573] gap-2">
          <p>
            <strong>NextGen Health</strong> — Sistema de Apoyo a la Decisión Clínica para la Detección Precoz del Deterioro Silente.
          </p>
          <p className="font-mono">
            8ª Edición Hackathon Boehringer Ingelheim • Grupo 33
          </p>
        </div>
      </footer>

    </div>
  );
}

export default App;
