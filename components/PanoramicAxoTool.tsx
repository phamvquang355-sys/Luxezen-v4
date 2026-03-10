import React from 'react';
import { PanoramicAxoProps, FileData } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';
import { FloorPlanMapper } from './FloorPlanMapper'; 

export const PanoramicAxoTool: React.FC<PanoramicAxoProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
  const { perspectivePhotos, floorPlan, isLoading, resultImage, aiReasoning, error } = state;
  const COST = 25; // Chi phí cao hơn do xử lý phức tạp (tái tạo không gian)

  const handleAddPhoto = (fileData: FileData) => {
    if (perspectivePhotos.length >= 4) return onStateChange({ error: 'Tối đa 4 ảnh góc nhìn.' });
    // Default to center (50, 50) when adding
    const newPhoto = { fileData, x: 50, y: 50, rotation: 0 }; 
    onStateChange({ perspectivePhotos: [...perspectivePhotos, newPhoto], error: null });
  };

  const handleUpdatePin = (index: number, updates: any) => {
    const newPhotos = [...perspectivePhotos];
    newPhotos[index] = { ...newPhotos[index], ...updates };
    onStateChange({ perspectivePhotos: newPhotos });
  };

  const handleRemovePin = (index: number) => {
    onStateChange({ perspectivePhotos: perspectivePhotos.filter((_, i) => i !== index) });
  };

  const handleGenerate = async () => {
    if (!floorPlan) return onStateChange({ error: 'Bắt buộc tải lên ảnh mặt bằng.' });
    if (perspectivePhotos.length === 0) return onStateChange({ error: "Vui lòng thêm ít nhất 1 ảnh góc nhìn." });
    
    if (onDeductCredits && userCredits < COST) {
      return onStateChange({ error: `Bạn cần ${COST} credits để thực hiện tính năng này.` });
    }

    onStateChange({ isLoading: true, error: null, resultImage: null, aiReasoning: null });
    
    try {
      if (onDeductCredits) await onDeductCredits(COST, "Generate Panoramic Axonometric");

      const response = await geminiService.generatePanoramicAxonometric(floorPlan, perspectivePhotos);
      
      onStateChange({ 
          resultImage: response.resultImage,
          aiReasoning: response.aiReasoning
      });
    } catch (e) {
      onStateChange({ error: "Lỗi xử lý AI: " + (e as Error).message });
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* LEFT PANEL: INPUTS */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-theme-surface rounded-2xl p-6 border border-theme-gold/20 shadow-lg">
          <h2 className="text-xl font-serif text-theme-gold mb-2">Thiết Lập Không Gian</h2>
          <p className="text-sm text-theme-text-sub mb-4">
            Tái tạo không gian 3D chính xác bằng cách kết hợp mặt bằng và các ảnh chụp thực tế.
          </p>

          {/* Bước 1: Mặt Bằng */}
          <div className="mb-6">
              <label className="block text-xs uppercase tracking-widest mb-2 text-theme-text-sub font-bold">1. Mặt Bằng Sảnh (Floor Plan)</label>
              {!floorPlan ? (
                   <ImageUpload onFileSelect={(file) => onStateChange({ floorPlan: file })} previewUrl={null} placeholder="Tải mặt bằng..." />
              ) : (
                  <div className="relative group rounded-xl overflow-hidden h-32 border border-theme-gold/20 bg-black/20">
                      <img src={floorPlan.objectURL} className="w-full h-full object-contain opacity-80" alt="Floor plan" />
                      <button onClick={() => onStateChange({ floorPlan: null, perspectivePhotos: [] })} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm transition-all text-red-300 font-bold backdrop-blur-sm">Thay đổi Mặt Bằng (Reset Ảnh Góc)</button>
                  </div>
              )}
          </div>

          {/* Bước 2: Bản đồ Tọa Độ (Chỉ hiện khi đã có Mặt bằng) */}
          {floorPlan && (
              <div className="mb-6">
                  <label className="block text-xs uppercase tracking-widest mb-2 text-theme-text-sub font-bold">2. Thêm Góc Nhìn & Định Vị (Tối đa 4)</label>
                  <FloorPlanMapper 
                      floorPlan={floorPlan} 
                      photos={perspectivePhotos} 
                      onUpdatePin={handleUpdatePin} 
                      onRemovePin={handleRemovePin}
                  />
                  {/* Thanh cuộn ngang hiển thị Thumbnail các ảnh Góc đã thêm */}
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2 items-center min-h-[80px]">
                      {perspectivePhotos.map((p, i) => (
                          <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg border-2 border-theme-gold/40 overflow-hidden">
                              <span className="absolute top-0 left-0 bg-theme-gold text-theme-base text-[10px] px-1 font-bold z-10">{i + 1}</span>
                              <img src={p.fileData.objectURL} className="w-full h-full object-cover" alt={`Angle ${i+1}`} />
                          </div>
                      ))}
                      {perspectivePhotos.length < 4 && (
                          <div className="w-16 h-16 shrink-0"><ImageUpload onFileSelect={handleAddPhoto} compact placeholder="+" previewUrl={null} /></div>
                      )}
                  </div>
              </div>
          )}

          {/* Nút Generate */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !floorPlan || perspectivePhotos.length === 0}
            className={`w-full py-4 mt-4 rounded-xl font-bold text-white transition-all transform shadow-lg flex items-center justify-center gap-2
              ${isLoading || !floorPlan || perspectivePhotos.length === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-theme-gold to-yellow-600 hover:scale-[1.02] hover:shadow-gold/30'}`}
          >
            {isLoading ? <Spinner /> : '🚀 TẠO PHỐI CẢNH 3D'}
          </button>
          
          {error && <p className="text-red-400 text-sm mt-3 text-center bg-red-900/20 p-2 rounded-lg animate-pulse">{error}</p>}
        </div>
      </div>

      {/* RIGHT PANEL: RESULT */}
      <div className="w-full lg:w-2/3 bg-black/50 rounded-2xl flex items-center justify-center border border-theme-gold/10 relative overflow-hidden p-4 backdrop-blur-md">
        {resultImage ? (
           // Hiển thị kết quả
           <div className="relative w-full h-full flex items-center justify-center group">
             <img src={resultImage} alt="Panoramic Axonometric Result" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]" />
             <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md pointer-events-none">
                 Mapped 3D Isometric View
             </div>
           </div>
        ) : (
           // Màn hình chờ
           <div className="text-center flex flex-col items-center opacity-40 transition-all">
               <svg className="w-24 h-24 text-theme-gold mb-6 animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
               <h3 className="text-2xl font-serif text-theme-text-main mb-3">Toàn Cảnh 3D</h3>
               <p className="text-base text-theme-text-sub max-w-md leading-relaxed">
                 Kết hợp Mặt bằng và Ảnh góc chụp để tái tạo không gian 3D chính xác.<br/>Sử dụng bản đồ nhiệt để định vị camera.
               </p>
           </div>
        )}
      </div>
    </div>
  );
};