
import React from 'react';
import { AxonometricProps, FileData } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

export const AxonometricTool: React.FC<AxonometricProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
  const { floorPlan, cornerPhotos, isLoading, resultImage, analysisText, error } = state;
  const COST = 20; // Phí cao hơn vì sử dụng quy trình 2 bước AI

  const handleAddCornerPhoto = (fileData: FileData) => {
    if (cornerPhotos.length >= 4) return alert("Tối đa 4 ảnh góc hiện trạng.");
    onStateChange({ cornerPhotos: [...cornerPhotos, fileData] });
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...cornerPhotos];
    newPhotos.splice(index, 1);
    onStateChange({ cornerPhotos: newPhotos });
  };

  const handleGenerate = async () => {
    if (!floorPlan) return alert("Vui lòng tải lên ảnh Mặt Bằng.");
    if (cornerPhotos.length === 0) return alert("Vui lòng tải ít nhất 1 ảnh Không Gian để AI phân tích.");
    
    if (onDeductCredits && userCredits < COST) {
      return onStateChange({ error: `Bạn cần ${COST} credits để thực hiện tính năng này.` });
    }

    onStateChange({ isLoading: true, error: null, resultImage: null, analysisText: null });
    
    try {
      if (onDeductCredits) await onDeductCredits(COST, "Auto-Analyze 3D Axonometric");

      const response = await geminiService.autoGenerateAxonometric(floorPlan, cornerPhotos);
      
      onStateChange({ 
          resultImage: response.resultImage, 
          analysisText: response.analysisText 
      });
    } catch (e) {
      onStateChange({ error: "Lỗi xử lý AI: " + (e as Error).message });
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* LEFT: INPUTS */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-theme-surface rounded-2xl p-6 border border-theme-gold/20 shadow-lg">
          <h2 className="text-xl font-serif text-theme-gold mb-6">Đầu vào Dữ liệu</h2>
          
          {/* Mặt bằng */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-theme-text-main block mb-3 flex justify-between">
              <span>1. Bản vẽ Mặt bằng <span className="text-red-400">*</span></span>
            </label>
            <ImageUpload 
               onFileSelect={(f) => onStateChange({ floorPlan: f })} 
               previewUrl={floorPlan?.objectURL || null} 
            />
          </div>

          {/* Ảnh hiện trạng */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-theme-text-main block mb-3">
              2. Ảnh Không gian (Tối đa 4) <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {cornerPhotos.map((photo, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-theme-gold/30">
                  <img src={photo.objectURL} alt={`Góc ${idx + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {cornerPhotos.length < 4 && (
                <div className="aspect-square">
                   <ImageUpload 
                     onFileSelect={handleAddCornerPhoto} 
                     previewUrl={null} 
                   />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !floorPlan || cornerPhotos.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all transform shadow-lg flex items-center justify-center gap-2
              ${isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-theme-gold to-yellow-600 hover:scale-[1.02]'}`}
          >
            {isLoading ? <Spinner /> : '✨ PHÂN TÍCH & TẠO 3D'}
          </button>
          
          {error && <p className="text-red-400 text-sm mt-3 text-center bg-red-900/20 p-2 rounded-lg">{error}</p>}
        </div>

        {/* Khung hiển thị AI Analysis */}
        {analysisText && (
          <div className="bg-theme-surface border-l-4 border-theme-gold rounded-r-xl p-5 shadow-md">
            <h3 className="text-theme-gold font-bold text-sm mb-2 flex items-center gap-2">
              <span>🧠</span> AI Phân Tích:
            </h3>
            <p className="text-sm text-theme-text-sub leading-relaxed italic">"{analysisText}"</p>
          </div>
        )}
      </div>

      {/* RIGHT: RESULT */}
      <div className="w-full lg:w-2/3 bg-black/40 rounded-2xl flex items-center justify-center border border-theme-gold/10 relative overflow-hidden">
        {resultImage ? (
           <img src={resultImage} alt="3D Axonometric Result" className="max-h-full max-w-full object-contain p-4 drop-shadow-2xl" />
        ) : (
           <div className="text-center flex flex-col items-center opacity-40">
               <svg className="w-20 h-20 text-theme-text-sub mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
               <h3 className="text-xl font-serif text-theme-text-main mb-2">Toàn Cảnh 3D</h3>
               <p className="text-sm text-theme-text-sub max-w-sm">
                 Tải lên 1 ảnh mặt bằng và các ảnh góc phòng. AI sẽ tự động phân tích không gian và đề xuất ý tưởng diễn họa hộp cắt 3D.
               </p>
           </div>
        )}
      </div>
    </div>
  );
};
