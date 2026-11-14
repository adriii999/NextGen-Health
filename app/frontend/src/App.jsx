// src/App.jsx
import React, { useState } from 'react';
import {
  Activity,
  LayoutDashboard,
  Sliders,
  FolderOpen,
  ShieldAlert,
  HeartPulse,
} from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { IngestPage } from './pages/IngestPage';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo y Nombre del Proyecto */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xs">
                <HeartPulse className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-slate-900">
                    NextGen Health
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Grupo 33
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  CDSS Atención Primaria • Reto 1 Boehringer Ingelheim
                </p>
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard de Cupo</span>
              </button>

              <button
                onClick={() => setActiveTab('simulator')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Simulador Clínico</span>
              </button>

              <button
                onClick={() => setActiveTab('ingest')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ingest'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Buzón de Analíticas</span>
              </button>
            </nav>

          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'simulator' && <SimulatorPage />}
        {activeTab === 'ingest' && <IngestPage />}
      </main>

      {/* Pie de Página */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p>
            <strong>NextGen Health</strong> — Sistema de Soporte a la Decisión Clínica (CDSS) para Detección Precoz del Riesgo Cardiovascular y Renal Silente.
          </p>
          <p className="font-mono text-[11px]">
            8ª Edición Hackathon Boehringer Ingelheim • 2026
          </p>
        </div>
      </footer>

    </div>
  );
}

export default App;
