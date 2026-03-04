
import React, { useRef, useState } from 'react';
import { CornerPhotoWithLocation, FileData } from '../types';

interface FloorPlanMapperProps {
  floorPlan: FileData;
  photos: CornerPhotoWithLocation[];
  onUpdatePin: (index: number, updates: Partial<CornerPhotoWithLocation>) => void;
  onRemovePin: (index: number) => void;
}

export const FloorPlanMapper: React.FC<FloorPlanMapperProps> = ({ floorPlan, photos, onUpdatePin, onRemovePin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIdx === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newX = ((e.clientX - rect.left) / rect.width) * 100;
    let newY = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Giới hạn Pin không vượt ra ngoài khung bản đồ
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    onUpdatePin(draggingIdx, { x: newX, y: newY });
  };

  const handleMouseUp = () => setDraggingIdx(null);

  const handleRotate = (index: number, currentRot: number, delta: number) => {
    let newRot = (currentRot + delta) % 360;
    if (newRot < 0) newRot += 360;
    onUpdatePin(index, { rotation: newRot });
  };

  return (
    <div className="flex flex-col gap-3">
        <div 
            className="relative w-full aspect-square bg-theme-surface2 border border-theme-gold/20 rounded-xl overflow-hidden shadow-inner cursor-crosshair" 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Ảnh Mặt Bằng Lót Nền */}
            <img src={floorPlan.objectURL} className="w-full h-full object-contain opacity-50 pointer-events-none" alt="Floor Plan" />

            {/* Các Điểm Ghim Camera */}
            {photos.map((photo, idx) => (
                <div 
                    key={idx}
                    className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-move group z-10"
                    style={{ left: `${photo.x}%`, top: `${photo.y}%` }}
                    onMouseDown={(e) => { e.preventDefault(); setDraggingIdx(idx); }}
                >
                    {/* Hình Nón - Hướng Nhìn (Field of View) */}
                    <div 
                        className="absolute origin-bottom opacity-40 bg-gradient-to-t from-theme-gold to-transparent pointer-events-none transition-transform"
                        style={{ 
                            width: '60px', height: '80px', bottom: '50%',
                            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                            transform: `rotate(${photo.rotation}deg)`,
                            transformOrigin: 'bottom center'
                        }}
                    />

                    {/* Nút Tròn Hiển Thị Số Thứ Tự */}
                    <div className="relative w-6 h-6 bg-theme-gold rounded-full shadow-lg border-2 border-theme-base flex items-center justify-center text-xs font-bold text-theme-base z-10 hover:scale-110 transition-transform">
                        {idx + 1}
                    </div>

                    {/* Bảng Điều Khiển Nổi (Xoay & Xóa) */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-theme-base border border-theme-gold/20 rounded-lg p-1 flex gap-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        <button onClick={() => handleRotate(idx, photo.rotation, -15)} className="p-1 hover:bg-theme-surface rounded text-theme-gold" title="Xoay Trái"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                        <button onClick={() => handleRotate(idx, photo.rotation, 15)} className="p-1 hover:bg-theme-surface rounded text-theme-gold" title="Xoay Phải"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg></button>
                        <button onClick={() => onRemovePin(idx)} className="p-1 hover:bg-red-500/20 text-red-400 rounded" title="Xóa"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-[10px] text-theme-text-sub text-center italic">* Kéo thả điểm để dời vị trí. Rê chuột vào điểm để Xoay hướng hoặc Xóa.</p>
    </div>
  );
};
