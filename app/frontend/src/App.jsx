// src/App.jsx
import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { IngestPage } from './pages/IngestPage';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#0E1621] flex flex-col font-sans antialiased">
      
      {/* Cabecera Clínica Institucional de Alta Precisión (Sobria, limpia, sin atajos complejos) */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E3E6EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
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
                    className={`h-full border-b-2 text-[13px] font-medium transition-colors px-1 flex items-center relative cursor-pointer ${
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

            {/* 3. Perfil del Facultativo en Atención Primaria con Estado Operativo */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-7 h-7 rounded-full bg-[#E8EEF7] border border-[#CBD0D8] text-[#1D3B6B] flex items-center justify-center font-mono text-[11px] font-bold">
                AP
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-[#0E1621]">
                  Consulta Médica
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A55]" title="Sistema operativo" />
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

      {/* Pie de Página Institucional Sobrio */}
      <footer className="border-t border-[#E3E6EB] bg-white py-3">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5A6573] gap-2">
          <span>
            NextGen Health — Sistema de Apoyo a la Decisión Clínica en Atención Primaria. Detección precoz del deterioro silente cardiorrenal.
          </span>
          <span className="font-mono">
            Grupo 33 • 8ª Edición Hackathon Boehringer Ingelheim
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
