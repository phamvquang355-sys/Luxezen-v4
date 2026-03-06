import React, { useState, useRef } from 'react';
import { Plus, Trash2, Film, PlayCircle, Loader2, CheckCircle, AlertCircle, Combine, Download } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { VideoScene } from '../types';
import { generateVideoFromImage } from '../services/externalVideoService'; 
import { WEDDING_CAMERA_SHOTS } from '../constants/videoShots';

export const VideoSequenceGenerator: React.FC = () => {
  const [scenes, setScenes] = useState<VideoScene[]>([
    { id: '1', image: null, prompt: '', shotType: WEDDING_CAMERA_SHOTS[0].id, status: 'idle' }
  ]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [globalProgress, setGlobalProgress] = useState({ current: 0, total: 0 });

  // THÊM STATE CHO VIỆC GHÉP VIDEO
  const [isMerging, setIsMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  
  // Khởi tạo FFmpeg
  const ffmpegRef = useRef(new FFmpeg());

  // Kiểm tra xem tất cả các cảnh đã render thành công chưa
  const isAllScenesSuccess = scenes.length > 0 && scenes.every(scene => scene.status === 'success' && scene.videoUrl);

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

  // HÀM MỚI: XỬ LÝ GHÉP VIDEO BẰNG FFMPEG
  const handleMergeVideos = async () => {
    try {
      setIsMerging(true);
      const ffmpeg = ffmpegRef.current;
      
      // Load FFmpeg nếu chưa load
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }

      // 1. Tải các video thành công vào bộ nhớ giả lập của FFmpeg
      const successScenes = scenes.filter(s => s.status === 'success' && s.videoUrl);
      let listFileContent = '';

      for (let i = 0; i < successScenes.length; i++) {
        const videoName = `vid${i}.mp4`;
        // Tải video từ URL (Blob/Base64)
        if (successScenes[i].videoUrl) {
            await ffmpeg.writeFile(videoName, await fetchFile(successScenes[i].videoUrl!));
            // Ghi tên file vào danh sách để FFmpeg biết cần ghép những gì
            listFileContent += `file '${videoName}'\n`;
        }
      }

      // Tạo một file .txt chứa danh sách các video cần ghép
      await ffmpeg.writeFile('list.txt', listFileContent);

      // 2. Chạy lệnh ghép video (Concatenate)
      // Lệnh này nối các video lại mà không cần encode lại từ đầu (copy), nên cực kỳ nhanh
      await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4']);

      // 3. Đọc file kết quả và tạo URL cho người dùng tải xuống
      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' }));
      
      setMergedVideoUrl(url);
    } catch (error) {
      console.error("Lỗi khi ghép video:", error);
      alert("Có lỗi xảy ra khi ghép video. Vui lòng thử lại!");
    } finally {
      setIsMerging(false);
    }
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

      {/* KHU VỰC ĐIỀU KHIỂN BÊN DƯỚI */}
      <div className="flex flex-col gap-4 pt-4 border-t border-theme-gold/10">
        <div className="flex justify-between items-center">
          <button 
            onClick={handleAddScene} 
            disabled={isProcessingBatch || isMerging}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface2 hover:bg-theme-gold/20 text-theme-text-main rounded-lg border border-theme-gold/20 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Thêm cảnh quay
          </button>

          <div className="flex gap-3">
            {/* Nút Render Từng Cảnh (Cũ) */}
            <button 
              onClick={handleGenerateSequence} 
              disabled={isProcessingBatch || !scenes.some(s => s.image) || isMerging}
              className="flex items-center gap-2 px-6 py-2 bg-theme-gold hover:bg-white text-theme-base font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-theme-gold/40"
            >
              {isProcessingBatch ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Đang render...</>
              ) : (
                <><PlayCircle className="w-5 h-5" /> Render các cảnh</>
              )}
            </button>

            {/* NÚT MỚI: XUẤT HIỆN KHI ĐÃ RENDER XONG TẤT CẢ */}
            {isAllScenesSuccess && (
              <button 
                onClick={handleMergeVideos} 
                disabled={isMerging}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {isMerging ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Đang ghép nối phim...</>
                ) : (
                  <><Combine className="w-5 h-5" /> Ghép thành 1 Phim</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* KẾT QUẢ VIDEO CUỐI CÙNG SAU KHI GHÉP */}
        {mergedVideoUrl && (
          <div className="mt-4 p-4 bg-theme-base rounded-xl border-2 border-emerald-500/50 flex flex-col items-center gap-4">
            <h3 className="text-lg font-bold text-emerald-400">🎉 Phim Toàn Cảnh Của Bạn Đã Sẵn Sàng!</h3>
            <video 
              src={mergedVideoUrl} 
              controls 
              className="w-full max-w-2xl rounded-lg shadow-2xl"
            />
            <a 
              href={mergedVideoUrl} 
              download="Wedding_Full_Tour.mp4"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <Download className="w-5 h-5" /> Tải Phim Về Máy
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
