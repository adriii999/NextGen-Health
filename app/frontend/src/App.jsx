// src/App.jsx
import React, { useState } from 'react';
import { Activity, Search, Command } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { IngestPage } from './pages/IngestPage';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-menu'));
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#0E1621] flex flex-col font-sans antialiased">
      
      {/* Cabecera Clínica Institucional de Alta Precisión */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E3E6EB]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            
            {/* 1. Logotipo y Denominación Clínica */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-7 h-7 rounded-[5px] bg-[#1D3B6B] text-white flex items-center justify-center shadow-xs">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-[#0E1621]">
                  NextGen Health
                </span>
                <span className="text-[#CBD0D8] font-light">|</span>
                <span className="text-[12px] text-[#5A6573] font-medium hidden sm:inline">
                  CDSS Atención Primaria
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-[4px] bg-[#F0F2F5] text-[#5A6573] border border-[#E3E6EB] hidden md:inline">
                  Boehringer Ingelheim • Reto 1
                </span>
              </div>
            </div>

            {/* 2. Pestañas de Navegación Subrayadas y Equilibradas */}
            <nav className="flex items-center h-full gap-7" role="tablist">
              {[
                { id: 'dashboard', label: 'Dashboard de Cupo' },
                { id: 'simulator', label: 'Simulador Clínico' },
                { id: 'ingest', label: 'Buzón de Analíticas' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-full border-b-2 text-[13px] font-medium transition-colors px-1 flex items-center relative ${
                      isActive
                        ? 'border-[#1D3B6B] text-[#1D3B6B] font-semibold'
                        : 'border-transparent text-[#5A6573] hover:text-[#0E1621] hover:border-[#CBD0D8]'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* 3. Acceso Rápido de Búsqueda y Perfil Clínico */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Botón de Búsqueda Universal tipo Linear / Stripe */}
              <button
                onClick={handleOpenSearch}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] bg-[#F6F7F9] hover:bg-[#F0F2F5] border border-[#E3E6EB] hover:border-[#CBD0D8] text-[12px] text-[#5A6573] transition-colors"
                title="Buscar paciente o acción clínica (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-[#8A94A3]" />
                <span className="hidden sm:inline">Buscar paciente...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[#8A94A3] bg-white px-1.5 py-0.5 rounded border border-[#E3E6EB]">
                  <Command className="w-2.5 h-2.5" /> K
                </kbd>
              </button>

              {/* Perfil del Facultativo */}
              <div className="flex items-center gap-2 pl-1 border-l border-[#E3E6EB]">
                <div className="w-6 h-6 rounded-full bg-[#E8EEF7] border border-[#CBD0D8] text-[#1D3B6B] flex items-center justify-center font-mono text-[10px] font-bold">
                  AP
                </div>
                <span className="text-[12px] font-medium text-[#0E1621] hidden lg:inline">
                  Consulta Médica
                </span>
              </div>
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
      <footer className="border-t border-[#E3E6EB] bg-white py-3 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5A6573] gap-2">
          <p>
            <strong>NextGen Health</strong> — Sistema de Apoyo a la Decisión Clínica en Atención Primaria. Detección precoz del deterioro silente cardiorrenal.
          </p>
          <p className="font-mono">
            Grupo 33 • 8ª Edición Hackathon Boehringer Ingelheim
          </p>
        </div>
      </footer>

    </div>
  );
}

export default App;
