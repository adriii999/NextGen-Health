// src/pages/IngestPage.jsx
import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="space-y-5">
      
      {/* Cabecera */}
      <div className="bg-white p-4 rounded-[6px] border border-[#E3E6EB]">
        <h2 className="text-[14px] font-semibold text-[#0E1621] flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-[#1D3B6B]" />
          <span>Ingesta y Monitorización de Analíticas de Cupo</span>
        </h2>
        <p className="text-[12px] text-[#5A6573] mt-0.5">
          Buzón de entrada automatizado: detecta archivos <span className="font-mono text-[#0E1621]">.json</span> y <span className="font-mono text-[#0E1621]">.csv</span> en la carpeta clínica <span className="font-mono text-[#0E1621]">data/analiticas/</span> para su análisis en lote.
        </p>
      </div>

      {/* Zona de Carga / Drag & Drop */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-6">
        <div className="border border-dashed border-[#CBD0D8] hover:border-[#1D3B6B] rounded-[6px] p-8 text-center transition-colors bg-[#F6F7F9]">
          <UploadCloud className="w-10 h-10 mx-auto text-[#1D3B6B] mb-2 stroke-[1.6]" />
          <h3 className="text-[13px] font-semibold text-[#0E1621]">
            Arrastra informes de laboratorio o lotes CSV aquí
          </h3>
          <p className="text-[12px] text-[#5A6573] mt-1 max-w-md mx-auto">
            Soporta formatos estándar de Atención Primaria (analíticas bioquímicas completas con perfiles renal, lipídico y constantes de tensión).
          </p>
          <div className="mt-4">
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-3.5 py-1.5 bg-[#1D3B6B] hover:bg-[#162E54] text-white rounded-[5px] text-[12px] font-medium transition-colors shadow-xs">
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
          <div className="mt-4 p-3 bg-[#E6F4EC] border border-[#BDDFC9] text-[#16563C] rounded-[5px] text-[12px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1F7A55] shrink-0" />
            <span>Archivo recibido correctamente. Listo para procesar en el Dashboard de Cupo.</span>
          </div>
        )}
      </div>

      {/* Listado de Archivos en Disco */}
      <div className="bg-white rounded-[6px] border border-[#E3E6EB] p-4">
        <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-3 mb-3">
          <div>
            <h3 className="text-[13px] font-semibold text-[#0E1621]">
              Archivos Detectados en Carpeta ({archivos.length})
            </h3>
            <p className="text-[11px] text-[#5A6573]">
              Sincronizados en tiempo real con el almacenamiento local de analíticas
            </p>
          </div>
          <button
            onClick={loadFiles}
            disabled={loading}
            className="px-3 py-1.5 rounded-[4px] border border-[#CBD0D8] hover:bg-[#F0F2F5] text-[#5A6573] text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="divide-y divide-[#E3E6EB]">
          {archivos.map((file, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-[4px] bg-[#F0F2F5] border border-[#E3E6EB] flex items-center justify-center text-[#5A6573] font-mono text-[11px]">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#0E1621] font-mono">{file.archivo}</div>
                  <div className="text-[11px] text-[#5A6573] flex items-center gap-2">
                    <span>Tamaño: {(file.tamano_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(file.fecha_modificacion).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E6F4EC] text-[#16563C] border border-[#BDDFC9] font-medium">
                Listo para procesar
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default IngestPage;
