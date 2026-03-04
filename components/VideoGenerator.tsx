import React, { useState } from 'react';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import { generateVideoFromImage } from '../services/externalVideoService'; // Service gọi API Video (Luma/Runway)
import { WEDDING_CAMERA_SHOTS, VideoShotOption } from '../constants/videoShots';
import { VideoGeneratorProps, FileData } from '../types';

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
  const { originalImage, videoResult, selectedShotId, userPrompt, isLoading, error } = state;
  
  // Helper to find selected shot
  const selectedShot = WEDDING_CAMERA_SHOTS.find(s => s.id === selectedShotId) || WEDDING_CAMERA_SHOTS[0];

  const handleImageUpload = (fileData: FileData) => {
    onStateChange({ originalImage: fileData, videoResult: null, error: null });
  };

  const handleGenerateVideo = async () => {
    if (!originalImage) {
      onStateChange({ error: 'Vui lòng tải lên một hình ảnh render sảnh tiệc.' });
      return;
    }

    // Check for API Key selection
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
            if (window.aistudio.openSelectKey) {
                await window.aistudio.openSelectKey();
            } else {
                onStateChange({ error: 'Không tìm thấy chức năng chọn API Key. Vui lòng liên hệ hỗ trợ.' });
                return;
            }
        } catch (e) {
            console.error("Error opening key selection dialog:", e);
            onStateChange({ error: 'Lỗi khi mở hộp thoại chọn API Key.' });
            return;
        }
      }
    }

    onStateChange({ isLoading: true, error: null });

    try {
      // 1. Ghép nối Prompt: [Ý đồ Camera] + [Mô tả thêm của User]
      const finalPrompt = `
        ${selectedShot.promptInstruction}
        ${userPrompt ? `Additional details: ${userPrompt}` : ''}
        High quality, 4k resolution, highly detailed event photography style.
      `.trim();

      // 2. Gọi Service API (Runway Gen-2, Luma, hoặc Kling tùy hệ thống bạn dùng)
      // Note: originalImage.objectURL might be a blob URL, we need base64. 
      // Assuming originalImage has base64 based on FileData type.
      // But wait, generateVideoFromImage expects base64 string.
      // Let's check FileData type in types.ts. It has base64.
      
      const resultUrl = await generateVideoFromImage(
        `data:${originalImage.mimeType};base64,${originalImage.base64}`, 
        finalPrompt
      );
      
      if (resultUrl) {
        onStateChange({ videoResult: resultUrl });
      } else {
        onStateChange({ error: 'Không thể tạo video. Vui lòng thử lại sau.' });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("403") || err.message.includes("PERMISSION_DENIED") || err.message.includes("The caller does not have permission"))) {
         onStateChange({ error: 'Lỗi quyền truy cập (403). Vui lòng đảm bảo bạn đã chọn một dự án Google Cloud có bật thanh toán (Billing Enabled) để sử dụng Veo.' });
         if (window.aistudio && window.aistudio.openSelectKey) {
             try {
                await window.aistudio.openSelectKey();
             } catch(e) { /* ignore */ }
         }
      } else {
         onStateChange({ error: `Lỗi: ${err.message || 'Đã xảy ra lỗi kết nối với máy chủ Render Video.'}` });
      }
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  const handleClear = () => {
    onStateChange({
      originalImage: null,
      videoResult: null,
      userPrompt: '',
      error: null
    });
  };

  return (
    <div className="flex flex-col h-full bg-theme-base overflow-hidden">
      {/* Header */}
      <div className="bg-theme-surface border-b border-theme-gold/10 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-normal text-theme-text-main">Đạo diễn Video (Cinematic)</h1>
          <p className="text-sm text-theme-text-sub">
            Biến ảnh Render 3D tĩnh thành Video điện ảnh với các góc máy chuyên nghiệp.
          </p>
        </div>
        {(originalImage || videoResult) && (
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
          <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-5 overflow-y-auto pr-2 pb-20 custom-scrollbar">
            
            {/* 1. Tải ảnh gốc */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-3">
                1. Hình ảnh Render (Khung hình đầu tiên)
              </label>
              <div className="aspect-video w-full bg-theme-base rounded-lg overflow-hidden border border-theme-gold/20">
                <ImageUpload
                  onFileSelect={handleImageUpload}
                  previewUrl={originalImage?.objectURL || null}
                  placeholder="Kéo thả ảnh Render sảnh tiệc vào đây"
                />
              </div>
            </div>

            {/* 2. Chọn Góc máy điện ảnh (Grid List) */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-3">
                2. Kịch bản Góc máy (Camera Shot)
              </label>
              
              <div className="relative">
                <select
                  value={selectedShotId}
                  onChange={(e) => onStateChange({ selectedShotId: e.target.value })}
                  className="w-full p-3 pr-10 border border-theme-gold/20 rounded-lg focus:ring-1 focus:ring-theme-gold focus:border-theme-gold appearance-none bg-theme-base text-theme-text-main font-normal text-sm outline-none"
                >
                  {WEDDING_CAMERA_SHOTS.map((shot) => (
                    <option key={shot.id} value={shot.id}>
                      {shot.label}
                    </option>
                  ))}
                </select>
                
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-theme-text-sub">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Box Gợi ý mô tả */}
              <div className="mt-3 p-3 bg-theme-base rounded-lg border border-theme-gold/20">
                <p className="text-xs text-theme-text-sub">
                  <span className="font-normal text-theme-gold block mb-1">Mô tả cảnh quay:</span> 
                  {selectedShot.description}
                </p>
              </div>
            </div>

            {/* 3. Ghi chú thêm */}
            <div className="bg-theme-surface p-5 rounded-xl shadow-lg border border-theme-gold/10">
              <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mb-2">
                3. Hiệu ứng môi trường (Tùy chọn)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => onStateChange({ userPrompt: e.target.value })}
                placeholder="Ví dụ: Thêm cánh hoa rơi, ánh sáng đèn pha lê lấp lánh mạnh hơn..."
                className="w-full h-24 p-3 bg-theme-base border border-theme-gold/20 rounded-lg focus:ring-1 focus:ring-theme-gold focus:border-theme-gold resize-none text-sm text-theme-text-main placeholder-theme-text-sub/50 outline-none"
              />
            </div>

            {/* Nút Action */}
            <div className="sticky bottom-0 bg-theme-base pt-2 pb-4">
              <button
                onClick={handleGenerateVideo}
                disabled={isLoading || !originalImage}
                className={`w-full py-4 px-6 rounded-xl font-normal text-theme-base shadow-lg transition-all ${
                  isLoading || !originalImage
                    ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10'
                    : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Spinner size="sm" color="theme-base" />
                    <span>Đang Render Video (Khoảng 1-3 phút)...</span>
                  </div>
                ) : (
                  'Bắt đầu Quay Video'
                )}
              </button>
              
              {error && (
                <div className="mt-3 p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-500/30">
                  <p>{error}</p>
                  {error.includes("403") && (
                    <button
                      onClick={async () => {
                        if (window.aistudio?.openSelectKey) {
                          try {
                            await window.aistudio.openSelectKey();
                            // Clear error after selection attempt
                            onStateChange({ error: null });
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 text-xs rounded border border-red-500/30 transition-colors"
                    >
                      Chọn lại API Key (Dự án có Billing)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Preview Video */}
          <div className="flex-1 bg-theme-surface rounded-xl shadow-lg border border-theme-gold/10 overflow-hidden flex flex-col relative">
            
            <div className="px-5 py-3 border-b border-theme-gold/10 bg-theme-base/30 flex justify-between items-center">
              <span className="text-sm font-normal text-theme-text-sub">Trình xem trước Điện ảnh</span>
              {videoResult && (
                <a 
                  href={videoResult} 
                  download={`luxzen-cinematic-${selectedShot.id}-${Date.now()}.mp4`}
                  className="flex items-center gap-1 text-sm text-theme-gold hover:text-white font-normal transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải Video
                </a>
              )}
            </div>

            <div className="flex-1 bg-black/40 p-6 flex items-center justify-center overflow-auto relative">
              {!originalImage ? (
                <div className="text-center text-theme-text-sub/50">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Hãy tải lên một hình ảnh để bắt đầu</p>
                </div>
              ) : !videoResult ? (
                <div className="relative w-full max-w-5xl rounded-lg overflow-hidden shadow-2xl border border-theme-gold/10 bg-theme-base">
                  {/* Hiển thị ảnh gốc khi chưa có video */}
                  <img src={originalImage.objectURL} alt="Reference" className="w-full h-auto object-contain opacity-80" />
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                      <Spinner size="lg" color="white" />
                      <p className="text-white mt-4 font-medium animate-pulse">AI đang dựng hình ảnh 3D và chuyển động máy quay...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-5xl rounded-lg overflow-hidden shadow-2xl border border-theme-gold/10 bg-black animate-fade-in">
                  {/* Hiển thị Video kết quả */}
                  <video 
                    src={videoResult} 
                    className="w-full h-auto" 
                    controls 
                    autoPlay 
                    loop 
                    playsInline
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
