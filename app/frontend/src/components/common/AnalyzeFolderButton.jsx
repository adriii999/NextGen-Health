// src/components/common/AnalyzeFolderButton.jsx
import React, { useState } from 'react';
import { Play, Loader2, Check } from 'lucide-react';

export const AnalyzeFolderButton = ({ onAnalyze, loading = false }) => {
  const [stepText, setStepText] = useState('Analizar carpeta en 1 clic');

  const handleClick = async () => {
    if (loading) return;
    
    // Pasos visibles de progreso clínico según la especificación de diseño
    setStepText('1/3: Leyendo archivos de laboratorio...');
    const t1 = setTimeout(() => {
      setStepText('2/3: Cruzando trayectoria interanual (Modo B)...');
    }, 600);
    const t2 = setTimeout(() => {
      setStepText('3/3: Estratificando riesgo y factores SHAP...');
    }, 1200);

    try {
      await onAnalyze();
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setStepText('Analizar carpeta en 1 clic');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded-[6px] bg-[#1D3B6B] hover:bg-[#162E54] active:bg-[#0E1621] text-white text-[13px] font-medium transition-all shadow-xs disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
      ) : (
        <Play className="w-4 h-4 text-white fill-white shrink-0" />
      )}
      <span>{loading ? stepText : 'Analizar carpeta en 1 clic'}</span>
    </button>
  );
};

export default React.memo(AnalyzeFolderButton);
