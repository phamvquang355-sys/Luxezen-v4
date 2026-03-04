import React from 'react';
import { ViewSyncProps, FileData, ViewOption } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { Spinner } from './Spinner';
import { generateViewSync } from '../services/geminiService';
import { VIEW_ANGLES } from '../constants';

export const ViewSyncTool: React.FC<ViewSyncProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
  const { sourceImage, resultImage, selectedViewId, userPrompt, isLoading, error } = state;
  const COST = 20;

  // Helper to find selected angle
  const selectedAngle = VIEW_ANGLES.find(a => a.id === selectedViewId) || VIEW_ANGLES[0];

  const handleSourceUpload = (fileData: FileData) => {
    onStateChange({ sourceImage: fileData, resultImage: null, error: null });
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      onStateChange({ error: 'Vui lòng tải lên hình ảnh hiện trạng hoặc phác thảo.' });
      return;
    }

    if (onDeductCredits && userCredits < COST) {
        onStateChange({ error: `Bạn cần ${COST} credits để thực hiện tính năng này.` });
        return;
    }

    onStateChange({ isLoading: true, error: null, resultImage: null });

    try {
      if (onDeductCredits) await onDeductCredits(COST, "View Sync Generation");

      let structuralConstraint = "";
      
      if (selectedAngle.id === 'top-down') {
        structuralConstraint = `
          CRITICAL INSTRUCTION: REMOVE THE CEILING/ROOF. 
          Generate a cutaway view looking directly down into the space.
          Show the floor layout, tables, and stage clearly.
          Ignore the original ceiling structure.
        `;
      } else {
        structuralConstraint = `
          CRITICAL INSTRUCTION: PRESERVE THE ROOM GEOMETRY.
          Do NOT change the walls, columns, windows, or floor material.
          Only move the camera position to '${selectedAngle.label}'.
          Keep the exact spatial context of the uploaded image.
        `;
      }

      const finalPrompt = `
        Role: Professional Architectural Visualizer.
        Task: Re-render the uploaded event space from a new camera angle.
        
        [INPUT IMAGE ANALYSIS]
        Analyze the uploaded image's architectural style and dimensions.

        [TARGET VIEW]
        ${selectedAngle.prompt_suffix}

        [CONSTRAINTS]
        ${structuralConstraint}

        [USER DECORATION REQUEST]
        ${userPrompt || "Keep current decoration style"}
        
        Output: Photorealistic 8K render.
      `.trim();

      const result = await generateViewSync(sourceImage, finalPrompt);
      
      if (result) {
        onStateChange({ resultImage: result });
      } else {
        onStateChange({ error: 'Không thể tạo ảnh. Vui lòng thử lại.' });
      }
    } catch (err) {
      console.error(err);
      onStateChange({ error: 'Đã xảy ra lỗi kết nối với AI.' });
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  const handleClear = () => {
    onStateChange({
      sourceImage: null,
      resultImage: null,
      userPrompt: '',
      error: null
    });
  };

  return (
    <div className="flex flex-col h-full bg-theme-base overflow-hidden">
      {/* Header khu vực làm việc */}
      <div className="bg-theme-surface border-b border-theme-gold/10 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-normal text-theme-text-main">Đồng bộ View</h1>
          <p className="text-sm text-theme-text-sub">
            Chuyển đổi góc nhìn từ ảnh hiện trạng/phác thảo thành không gian 3D.
          </p>
        </div>
        {(sourceImage || resultImage) && (
          <button 
            onClick={handleClear}
            className="px-4 py-2 text-sm font-normal text-theme-text-sub bg-theme-surface2 hover:bg-theme-gold/20 rounded-lg transition-colors border border-theme-gold/10"
          >
            Làm mới
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row max-w-[1600px] mx-auto p-4 gap-6">
          
          {/* CỘT TRÁI: Công cụ */}
          <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-5 overflow-y-auto pr-2 pb-20 custom-scrollbar">
            
            {/* 1. Tải ảnh gốc */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-3">
                1. Hình ảnh tham chiếu
              </label>
              <div className="aspect-[4/3] w-full bg-theme-base rounded-lg overflow-hidden border border-theme-gold/20">
                <ImageUpload
                  onFileSelect={handleSourceUpload}
                  previewUrl={sourceImage?.objectURL || null}
                  placeholder="Kéo thả hoặc nhấp để tải ảnh lên"
                />
              </div>
            </div>

            {/* 2. Chọn Góc nhìn */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-3">
                2. Góc nhìn mong muốn
              </label>
              
              <div className="relative">
                <select
                  value={selectedAngle.id}
                  onChange={(e) => onStateChange({ selectedViewId: e.target.value })}
                  className="w-full p-3 pr-10 border border-theme-gold/20 rounded-lg focus:ring-1 focus:ring-theme-gold focus:border-theme-gold appearance-none bg-theme-base text-theme-text-main font-normal text-sm outline-none"
                >
                  {VIEW_ANGLES.map((angle) => (
                    <option key={angle.id} value={angle.id}>
                      {angle.label}
                    </option>
                  ))}
                </select>
                
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-theme-text-sub">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Box Gợi ý mô tả - Đã bỏ phần đặc điểm góc máy theo yêu cầu */}
              {selectedAngle.id === 'top-down' && (
                <div className="mt-3 p-3 bg-theme-base rounded-lg border border-theme-gold/20">
                  <p className="text-xs text-theme-gold mt-2 font-normal flex items-start gap-1">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Hệ thống sẽ bóc mái/trần để quan sát mặt bằng.</span>
                  </p>
                </div>
              )}
            </div>

            {/* 3. Nhập mô tả */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-2">
                3. Ghi chú ý tưởng (Tùy chọn)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => onStateChange({ userPrompt: e.target.value })}
                placeholder="Ví dụ: Đổi tone màu tiệc cưới thành trắng & xanh lá, sử dụng hoa cẩm tú cầu..."
                className="w-full h-28 p-3 bg-theme-base border border-theme-gold/20 rounded-lg focus:ring-1 focus:ring-theme-gold focus:border-theme-gold resize-none text-sm text-theme-text-main placeholder-theme-text-sub/50 outline-none"
              />
            </div>

            {/* Nút Action */}
            <div className="sticky bottom-0 bg-theme-base pt-2 pb-4">
              <button
                onClick={handleGenerate}
                disabled={isLoading || !sourceImage}
                className={`w-full py-4 px-6 rounded-xl font-normal text-theme-base shadow-lg transition-all ${
                  isLoading || !sourceImage
                    ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10'
                    : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Spinner size="sm" color="theme-base" />
                    <span>Đang đồng bộ góc nhìn...</span>
                  </div>
                ) : (
                  'Tạo Phối Cảnh Mới'
                )}
              </button>
              
              {error && (
                <div className="mt-3 p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-500/30 flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Canvas & Kết quả */}
          <div className="flex-1 bg-theme-surface rounded-xl shadow-lg border border-theme-gold/10 overflow-hidden flex flex-col relative">
            
            {/* Header nhỏ của Canvas */}
            <div className="px-5 py-3 border-b border-theme-gold/10 bg-theme-base/30 flex justify-between items-center">
              <span className="text-sm font-normal text-theme-text-sub">Trình xem Kết quả</span>
              {resultImage && (
                <a 
                  href={resultImage} 
                  download={`luxzen-view-${selectedAngle.id}-${Date.now()}.png`}
                  className="flex items-center gap-1 text-sm text-theme-gold hover:text-white font-normal transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải xuống
                </a>
              )}
            </div>

            {/* Vùng Canvas hiển thị chính */}
            <div className="flex-1 bg-black/40 p-6 flex items-center justify-center overflow-auto">
              {!sourceImage ? (
                <div className="text-center text-theme-text-sub/50">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Hãy tải lên một hình ảnh tham chiếu để bắt đầu</p>
                </div>
              ) : !resultImage ? (
                // Chỉ có ảnh gốc, chưa ấn Generate
                <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-theme-gold/10 bg-theme-base">
                  <img src={sourceImage.objectURL} alt="Original" className="w-full h-auto object-contain" />
                </div>
              ) : (
                // Đã có kết quả, hiển thị thanh trượt so sánh
                <div className="w-full h-full min-h-[500px] flex items-center justify-center animate-fade-in">
                  <div className="w-full max-w-5xl bg-theme-surface p-2 rounded-xl shadow-2xl border border-theme-gold/10">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                      <ImageComparator
                        image1={sourceImage.objectURL || ''} // Before
                        image2={resultImage} // After
                        label1="Góc hiện trạng"
                        label2={`Góc ${selectedAngle.label}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
