import React, { useState } from 'react';
import { Plus, Trash2, Film, PlayCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { VideoScene } from '../types';
import { generateVideoFromImage } from '../services/externalVideoService'; 
import { WEDDING_CAMERA_SHOTS } from '../constants/videoShots';

export const VideoSequenceGenerator: React.FC = () => {
  const [scenes, setScenes] = useState<VideoScene[]>([
    { id: '1', image: null, prompt: '', shotType: WEDDING_CAMERA_SHOTS[0].id, status: 'idle' }
  ]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [globalProgress, setGlobalProgress] = useState({ current: 0, total: 0 });

  // Thêm phân cảnh mới
  const handleAddScene = () => {
    const newScene: VideoScene = {
      id: Math.random().toString(36).substr(2, 9),
      image: null,
      prompt: '',
      shotType: WEDDING_CAMERA_SHOTS[0].id,
      status: 'idle'
    };
    setScenes([...scenes, newScene]);
  };

  // Xóa phân cảnh
  const handleRemoveScene = (id: string) => {
    if (scenes.length === 1) return;
    setScenes(scenes.filter(scene => scene.id !== id));
  };

  // Cập nhật dữ liệu phân cảnh
  const updateScene = (id: string, field: keyof VideoScene, value: any) => {
    setScenes(scenes.map(scene => scene.id === id ? { ...scene, [field]: value } : scene));
  };

  // Xử lý upload ảnh cho từng phân cảnh
  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScene(id, 'image', reader.result as string);
        updateScene(id, 'status', 'idle'); // Reset trạng thái nếu đổi ảnh
      };
      reader.readAsDataURL(file);
    }
  };

  // HÀNG ĐỢI XỬ LÝ VIDEO (Quan trọng)
  const handleGenerateSequence = async () => {
    const validScenes = scenes.filter(s => s.image);
    if (validScenes.length === 0) {
      alert("Vui lòng tải lên ít nhất 1 hình ảnh!");
      return;
    }

    setIsProcessingBatch(true);
    setGlobalProgress({ current: 0, total: validScenes.length });

    // Tạo bản sao để quản lý state an toàn
    let currentScenes = [...scenes];

    // Chạy vòng lặp tuần tự (Queue) để tránh dội API
    for (let i = 0; i < currentScenes.length; i++) {
      const scene = currentScenes[i];
      if (!scene.image || scene.status === 'success') continue;

      setGlobalProgress(prev => ({ ...prev, current: prev.current + 1 }));
      
      // Cập nhật UI: Đang load cảnh hiện tại
      currentScenes[i] = { ...scene, status: 'loading' };
      setScenes([...currentScenes]);

      try {
        // Gọi API Veo 3
        const shot = WEDDING_CAMERA_SHOTS.find(s => s.id === scene.shotType);
        const fullPrompt = `${shot?.promptInstruction || ''} ${scene.prompt}`;
        const videoUrl = await generateVideoFromImage(scene.image, fullPrompt, { aspectRatio: "9:16" });
        
        if (videoUrl) {
            currentScenes[i] = { ...currentScenes[i], status: 'success', videoUrl };
        } else {
            throw new Error("Không nhận được URL video");
        }
      } catch (error: any) {
        console.error(`Lỗi render cảnh ${i + 1}:`, error);
        currentScenes[i] = { ...currentScenes[i], status: 'error', error: error.message || 'Lỗi tạo video' };
      }

      // Cập nhật UI sau khi xong 1 cảnh
      setScenes([...currentScenes]);
    }

    setIsProcessingBatch(false);
  };

  return (
    <div className="space-y-6 text-theme-text-main bg-theme-surface p-6 rounded-xl border border-theme-gold/10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-normal flex items-center gap-2 text-theme-text-main">
            <Film className="w-6 h-6 text-theme-gold" />
            Đạo diễn Chuỗi Video (Storyboard)
          </h2>
          <p className="text-theme-text-sub text-sm mt-1">Tạo nhiều góc máy khác nhau và xuất thành danh sách video</p>
        </div>
        
        {isProcessingBatch && (
          <div className="bg-theme-gold/20 text-theme-gold px-4 py-2 rounded-lg flex items-center gap-3 border border-theme-gold/30">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang xử lý: {globalProgress.current} / {globalProgress.total} cảnh</span>
          </div>
        )}
      </div>

      {/* Danh sách các phân cảnh */}
      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className={`bg-theme-base p-4 rounded-xl border border-theme-gold/20 transition-all ${scene.status === 'loading' ? 'ring-1 ring-theme-gold shadow-lg shadow-theme-gold/10' : ''}`}>
            <div className="flex items-start gap-4">
              
              {/* Cột 1: Thumbnail & Upload */}
              <div className="w-48 flex-shrink-0">
                <div className="relative aspect-video bg-theme-surface2 rounded-lg overflow-hidden border border-theme-gold/20 flex items-center justify-center group hover:bg-theme-gold/10 transition-colors cursor-pointer">
                  {scene.image ? (
                    <img src={scene.image} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Plus className="w-6 h-6 text-theme-text-sub mx-auto mb-1" />
                      <span className="text-xs text-theme-text-sub">Tải ảnh lên</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(scene.id, e)} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isProcessingBatch} />
                </div>
              </div>

              {/* Cột 2: Settings */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-theme-text-main">Phân cảnh {index + 1}</h4>
                  <div className="flex items-center gap-2">
                    {/* Status Indicators */}
                    {scene.status === 'loading' && <Loader2 className="w-4 h-4 text-theme-gold animate-spin" />}
                    {scene.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {scene.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" title={scene.error} />}
                    
                    <button onClick={() => handleRemoveScene(scene.id)} disabled={isProcessingBatch || scenes.length === 1} className="p-1 text-theme-text-sub hover:text-red-400 disabled:opacity-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select 
                    value={scene.shotType} 
                    onChange={(e) => updateScene(scene.id, 'shotType', e.target.value)}
                    disabled={isProcessingBatch || scene.status === 'success'}
                    className="bg-theme-surface border border-theme-gold/20 text-theme-text-main rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-theme-gold focus:border-theme-gold outline-none"
                  >
                    {WEDDING_CAMERA_SHOTS.map(shot => (
                      <option key={shot.id} value={shot.id}>{shot.label}</option>
                    ))}
                  </select>

                  <input 
                    type="text" 
                    placeholder="Mô tả bổ sung (Prompt)..." 
                    value={scene.prompt}
                    onChange={(e) => updateScene(scene.id, 'prompt', e.target.value)}
                    disabled={isProcessingBatch || scene.status === 'success'}
                    className="bg-theme-surface border border-theme-gold/20 text-theme-text-main rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-theme-gold focus:border-theme-gold outline-none placeholder-theme-text-sub/50"
                  />
                </div>

                {/* Video Result Preview */}
                {scene.status === 'success' && scene.videoUrl && (
                  <div className="mt-2 flex items-center gap-3 bg-emerald-900/20 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-900/50">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Video đã sẵn sàng</span>
                    <a href={scene.videoUrl} target="_blank" rel="noreferrer" download className="ml-auto bg-emerald-600 text-white text-xs px-3 py-1 rounded hover:bg-emerald-500 transition-colors shadow-sm">
                      Xem / Tải xuống
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nút điều khiển */}
      <div className="flex justify-between items-center pt-4 border-t border-theme-gold/10">
        <button 
          onClick={handleAddScene} 
          disabled={isProcessingBatch || scenes.length >= 10} // Giới hạn 10 cảnh để an toàn
          className="flex items-center gap-2 px-4 py-2 bg-theme-surface2 hover:bg-theme-gold/20 text-theme-text-main rounded-lg border border-theme-gold/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Thêm cảnh quay
        </button>

        <button 
          onClick={handleGenerateSequence} 
          disabled={isProcessingBatch || !scenes.some(s => s.image)}
          className="flex items-center gap-2 px-6 py-3 bg-theme-gold hover:bg-white text-theme-base font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-theme-gold/40"
        >
          {isProcessingBatch ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Đang render chuỗi video...</>
          ) : (
            <><PlayCircle className="w-5 h-5" /> Render toàn bộ</>
          )}
        </button>
      </div>
    </div>
  );
};
