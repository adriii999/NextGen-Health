// src/pages/IngestPage.jsx
import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { analiticasService } from '../services/analiticasService';

export const IngestPage = () => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    const res = await analiticasService.getArchivosAnaliticas();
    if (res.success) {
      setArchivos(res.archivos);
    }
    setLoading(false);
  };

  const handleSimulateUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-600" />
          Ingesta y Monitorización de Analíticas de Cupo
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Buzón de entrada automatizado: detecta archivos <span className="font-mono">.json</span> y <span className="font-mono">.csv</span> en la carpeta clínica <span className="font-mono">data/analiticas/</span> para su análisis en lote.
        </p>
      </div>

      {/* Zona de Carga / Drag & Drop */}
      <Card padding="p-8">
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
          <UploadCloud className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            Arrastra informes de laboratorio o lotes CSV aquí
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Soporta formatos estándar de Atención Primaria (analíticas bioquímicas completas con perfiles renal, lipídico y constantes de tensión).
          </p>
          <div className="mt-4">
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs">
                Seleccionar archivos del ordenador
              </span>
              <input
                type="file"
                multiple
                accept=".json,.csv"
                onChange={handleSimulateUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Archivo recibido correctamente. Listo para procesar en el Dashboard.</span>
          </div>
        )}
      </Card>

      {/* Listado de Archivos en Disco */}
      <Card
        title={`Archivos Detectados en Carpeta (${archivos.length})`}
        subtitle="Sincronizados en tiempo real con el backend de FastAPI"
        headerAction={
          <Button variant="outline" size="sm" icon={RefreshCw} loading={loading} onClick={loadFiles}>
            Actualizar
          </Button>
        }
      >
        <div className="divide-y divide-slate-100">
          {archivos.map((file, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-mono text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 font-mono">{file.archivo}</div>
                  <div className="text-[11px] text-slate-400">
                    {file.tiene_progresion ? 'Modo B (Historial 12m disponible)' : 'Modo A (Analítica aislada)'} • {Math.round(file.tamano_bytes / 1024 * 10) / 10} KB
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                file.tiene_progresion ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {file.tiene_progresion ? 'MODO B' : 'MODO A'}
              </span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default IngestPage;
