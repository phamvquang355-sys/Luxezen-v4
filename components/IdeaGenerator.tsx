import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

// Icons
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const LayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const RotateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>;
const SwapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4m14 0h2m-2 0 2 2m-2-2-2 2"/><path d="M3 12v5h16a2 2 0 0 1 0 4m-14 0H3m0 0-2-2m2 2 2 2"/></svg>;

const getRenderedImageRect = (img: HTMLImageElement) => {
  const ratio = img.naturalWidth / img.naturalHeight;
  const width = img.width;   
  const height = img.height; 
  let renderedWidth, renderedHeight, left, top;

  if (width / height > ratio) {
    renderedHeight = height;
    renderedWidth = height * ratio;
  } else {
    renderedWidth = width;
    renderedHeight = width / ratio;
  }

  left = (width - renderedWidth) / 2;
  top = (height - renderedHeight) / 2;

  return { left, top, width: renderedWidth, height: renderedHeight };
};

// --- HELPER: Composite Image Generator ---
const createCompositeImage = async (
  structureImageSrc: string, 
  assets: IdeaAsset[]
): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
    }

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = structureImageSrc;
    
    bgImg.onload = async () => {
      // 1. Set Canvas size to match the high-res background
      canvas.width = bgImg.naturalWidth;
      canvas.height = bgImg.naturalHeight;
      
      // 2. Draw Background
      ctx.drawImage(bgImg, 0, 0);

      // 3. Draw Assets
      // Assets coordinates (x, y, width, height) are in percentages (0-100) relative to the container.
      // We map these percentages to the actual canvas pixel dimensions.
      const assetPromises = assets.map(asset => {
        return new Promise<void>((resolveAsset) => {
          if (!asset.image || !asset.image.objectURL) {
              resolveAsset();
              return;
          }

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = asset.image.objectURL;
          
          img.onload = () => {
            ctx.save();
            
            // Calculate absolute pixels from percentages
            const trueX = (asset.x / 100) * canvas.width;
            const trueY = (asset.y / 100) * canvas.height;
            const trueW = (asset.width / 100) * canvas.width;
            const trueH = (asset.height / 100) * canvas.height;

            // Handle Rotation
            // Translate to center of the object to rotate, then draw centered
            const centerX = trueX + trueW / 2;
            const centerY = trueY + trueH / 2;

            ctx.translate(centerX, centerY);
            if (asset.rotation) {
                ctx.rotate((asset.rotation * Math.PI) / 180);
            }
            
            // Draw image centered at (0,0) relative to the translation
            ctx.drawImage(img, -trueW / 2, -trueH / 2, trueW, trueH);
            
            ctx.restore();
            resolveAsset();
          };
          
          img.onerror = () => resolveAsset(); // Skip error assets but continue
        });
      });

      await Promise.all(assetPromises);
      
      // 4. Export as Base64
      // Use standard JPEG format for Gemini API
      const dataURL = canvas.toDataURL('image/jpeg', 0.95);
      const base64 = dataURL.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    bgImg.onerror = (e) => reject(e);
  });
};

type IdeaStep = 'UPLOAD' | 'STRUCTURE_RESULT' | 'DECOR_SETUP' | 'FINAL_RESULT';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange, onDeductCredits, userCredits }) => {
  // Global State from App
  const [sketchImage, setSketchImage] = useState<FileData | null>(state.sourceSketch || null);
  const [styleImage, setStyleImage] = useState<FileData | null>(state.referenceStyle || null);
  const [assets, setAssets] = useState<IdeaAsset[]>(state.assets || []); 
  
  // Local UI State
  const [step, setStep] = useState<IdeaStep>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  
  const [structureImages, setStructureImages] = useState<string[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [finalImages, setFinalImages] = useState<string[]>([]);
  
  // Canvas Refs & Metrics
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageMetrics, setImageMetrics] = useState({ left: 0, top: 0, width: 0, height: 0 }); 
  
  // Interaction Logic (Move, Resize, Rotate)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // DRAG STATE
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [initialAssetPos, setInitialAssetPos] = useState<{ x: number, y: number } | null>(null);

  // RESIZE STATE
  const [resizingState, setResizingState] = useState<{
      assetId: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      initialRect: { x: number, y: number, w: number, h: number }; 
  } | null>(null);

  // ROTATE STATE
  const [rotatingState, setRotatingState] = useState<{
      assetId: string;
      startAngle: number;
      initialRotation: number;
      centerX: number;
      centerY: number;
  } | null>(null);

  // UPLOAD REFS
  const hiddenNewDecorInputRef = useRef<HTMLInputElement>(null);
  const hiddenReplaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);

  // --- RESIZE METRICS HANDLER ---
  const updateMetrics = useCallback(() => {
      if (!imgRef.current || !containerRef.current) return;
      
      const img = imgRef.current;
      const container = containerRef.current;
      
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const imgElemLeft = imgRect.left - containerRect.left;
      const imgElemTop = imgRect.top - containerRect.top;
      
      const rendered = getRenderedImageRect(img);
      
      setImageMetrics({
          left: imgElemLeft + rendered.left,
          top: imgElemTop + rendered.top,
          width: rendered.width,
          height: rendered.height
      });
  }, [step, selectedStructure]);

  useEffect(() => {
      window.addEventListener('resize', updateMetrics);
      return () => window.removeEventListener('resize', updateMetrics);
  }, [updateMetrics]);

  // --- ADD NEW DECOR HANDLER (SMART SCALING) ---
  const handleAddNewDecorClick = () => {
    hiddenNewDecorInputRef.current?.click();
  };

  const handleNewDecorFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsProcessing(true); // Reuse existing loading state
        // Resize ảnh để tối ưu hiệu năng upload
        const { base64, mimeType, width, height } = await geminiService.resizeAndCompressImage(file, 512, 0.8);
        const objectURL = URL.createObjectURL(file);
        
        // --- LOGIC MỚI: SMART SCALING ---
        const assetAspectRatio = width / height;
        
        // Fallback dimensions if metrics aren't ready (e.g. 800x600 ratio)
        const containerW = imageMetrics.width || 800;
        const containerH = imageMetrics.height || 600;
        const containerAspectRatio = containerW / containerH;

        let targetWidthPercent, targetHeightPercent;

        // Nếu ảnh decor là hình ngang (Landscape) hoặc vuông
        if (assetAspectRatio >= 1) { 
            targetWidthPercent = 25; // Chiếm 25% chiều rộng canvas
            // Tính chiều cao tương ứng để giữ đúng tỉ lệ ảnh
            targetHeightPercent = (targetWidthPercent * containerAspectRatio) / assetAspectRatio;
        } 
        // Nếu ảnh decor là hình dọc (Portrait) - ví dụ: đèn cây, cột
        else {
            targetHeightPercent = 35; // Chiếm 35% chiều cao canvas (đủ lớn để nhìn rõ)
            // Tính chiều rộng tương ứng
            targetWidthPercent = (targetHeightPercent * assetAspectRatio) / containerAspectRatio;
        }

        // Đặt vật thể vào chính giữa màn hình (Center)
        const centerX = 50 - (targetWidthPercent / 2);
        const centerY = 50 - (targetHeightPercent / 2);

        const newAsset: IdeaAsset = {
          id: Date.now().toString(),
          x: centerX,
          y: centerY,
          width: targetWidthPercent,
          height: targetHeightPercent,
          rotation: 0,
          aspectRatio: assetAspectRatio,
          image: { file, objectURL, base64, mimeType, width, height },
          label: file.name.split('.')[0].substring(0, 15) // Lấy tên file làm nhãn
        };

        const newAssets = [...assets, newAsset];
        setAssets(newAssets);
        setSelectedAssetId(newAsset.id);
        onStateChange({ assets: newAssets });
      } catch (error) {
        console.error("Error processing decor file:", error);
        alert("Không thể xử lý ảnh này.");
      } finally {
        setIsProcessing(false);
        // Reset input value để cho phép chọn lại cùng 1 file nếu cần
        if (e.target) e.target.value = '';
      }
    }
  };

  // --- REPLACE DECOR HANDLER ---
  const handleTriggerReplace = (id: string) => {
    setReplacingAssetId(id);
    hiddenReplaceInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && replacingAssetId) {
        const file = e.target.files[0];
        try {
            const { base64, mimeType, width, height } = await geminiService.resizeAndCompressImage(file, 512, 0.8);
            const objectURL = URL.createObjectURL(file);
            const aspectRatio = width / height;

            const newAssets = assets.map(a => {
                if (a.id === replacingAssetId) {
                     // Keep position and width, adjust height based on new aspect ratio
                    const newHeight = a.width / aspectRatio; 
                    return {
                        ...a,
                        aspectRatio,
                        height: newHeight, // Adjust height to keep proportion
                        image: { file, objectURL, base64, mimeType, width, height },
                        label: file.name.split('.')[0].substring(0, 15)
                    };
                }
                return a;
            });

            setAssets(newAssets);
            onStateChange({ assets: newAssets });
        } catch (error) {
            console.error("Lỗi thay ảnh decor:", error);
            alert("Không thể xử lý ảnh này.");
        } finally {
            if (hiddenReplaceInputRef.current) hiddenReplaceInputRef.current.value = '';
            setReplacingAssetId(null);
        }
    }
  };


  // --- INTERACTION HANDLERS ---
  const handleAssetMouseDown = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation(); // Stop propagation to avoid triggering container's onMouseDown (deselect)
    e.preventDefault();
    if (resizingState || rotatingState) return;

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setSelectedAssetId(assetId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialAssetPos({ x: asset.x, y: asset.y });
  };

  const handleResizeStart = (e: React.MouseEvent, assetId: string, handle: ResizeHandle) => {
      e.stopPropagation(); 
      e.preventDefault();
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;
      setResizingState({
          assetId,
          handle,
          startX: e.clientX,
          startY: e.clientY,
          initialRect: { x: asset.x, y: asset.y, w: asset.width, h: asset.height }
      });
  };

  const handleRotateStart = (e: React.MouseEvent, assetId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const asset = assets.find(a => a.id === assetId);
      if (!asset || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const assetPixelX = rect.left + imageMetrics.left + (asset.x / 100) * imageMetrics.width;
      const assetPixelY = rect.top + imageMetrics.top + (asset.y / 100) * imageMetrics.height;
      const centerX = assetPixelX + (asset.width / 100 * imageMetrics.width) / 2;
      const centerY = assetPixelY + (asset.height / 100 * imageMetrics.height) / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      setRotatingState({
          assetId,
          startAngle,
          initialRotation: asset.rotation || 0,
          centerX,
          centerY
      });
  };

  const handleGlobalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rotatingState) {
        e.preventDefault();
        const currentAngle = Math.atan2(e.clientY - rotatingState.centerY, e.clientX - rotatingState.centerX) * (180 / Math.PI);
        const deltaAngle = currentAngle - rotatingState.startAngle;
        const newRotation = (rotatingState.initialRotation + deltaAngle) % 360;
        const newAssets = assets.map(a => a.id === rotatingState.assetId ? { ...a, rotation: newRotation } : a);
        setAssets(newAssets);
        return;
    }
    if (resizingState) {
        e.preventDefault();
        const deltaXPixels = e.clientX - resizingState.startX;
        let deltaXPercent = (deltaXPixels / imageMetrics.width) * 100;
        if (resizingState.handle.includes('w')) {
            deltaXPercent = -deltaXPercent;
        }
        const { initialRect, assetId } = resizingState;
        const asset = assets.find(a => a.id === assetId);
        const ratio = asset?.aspectRatio || 1;
        let newW = Math.max(2, initialRect.w + deltaXPercent); 
        const containerAspect = imageMetrics.width / imageMetrics.height;
        let newH = newW * containerAspect / ratio;
        let newX = initialRect.x;
        let newY = initialRect.y;
        if (resizingState.handle.includes('w')) newX = initialRect.x + (initialRect.w - newW);
        if (resizingState.handle.includes('n')) newY = initialRect.y + (initialRect.h - newH);
        
        // --- CLAMPING TO BOUNDARIES (0-100%) ---
        newW = Math.min(newW, 100);
        newH = Math.min(newH, 100);
        newX = Math.max(0, Math.min(newX, 100 - newW));
        newY = Math.max(0, Math.min(newY, 100 - newH));

        const newAssets = assets.map(a => a.id === resizingState.assetId ? { ...a, x: newX, y: newY, width: newW, height: newH } : a);
        setAssets(newAssets);
        return;
    }
    if (isDragging && dragStart && initialAssetPos && selectedAssetId) {
        e.preventDefault();
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const deltaXPercent = (deltaX / imageMetrics.width) * 100;
        const deltaYPercent = (deltaY / imageMetrics.height) * 100;
        
        let newX = initialAssetPos.x + deltaXPercent;
        let newY = initialAssetPos.y + deltaYPercent;

        const asset = assets.find(a => a.id === selectedAssetId);
        if (asset) {
             // --- CLAMPING TO BOUNDARIES (0-100%) ---
             newX = Math.max(0, Math.min(newX, 100 - asset.width));
             newY = Math.max(0, Math.min(newY, 100 - asset.height));
        }

        const newAssets = assets.map(a => a.id === selectedAssetId ? { ...a, x: newX, y: newY } : a);
        setAssets(newAssets);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isDragging || resizingState || rotatingState) {
        setIsDragging(false);
        setResizingState(null);
        setRotatingState(null);
        onStateChange({ assets }); 
    }
  };

  // --- BACKGROUND CLICK HANDLER (DESELECT) ---
  const handleBackgroundMouseDown = () => {
    // This only fires if the event bubbles up to the container.
    // Since assets stop propagation on mousedown, this only fires for background clicks.
    setSelectedAssetId(null);
  };

  // --- STEP 1 HANDLERS ---
  const handleSketchUpload = (file: FileData) => {
    setSketchImage(file);
    onStateChange({ sourceSketch: file });
  };
  const handleStyleUpload = (file: FileData) => {
    setStyleImage(file);
    onStateChange({ referenceStyle: file });
  };

  const handleRemoveAsset = (id: string) => {
      const newAssets = assets.filter(a => a.id !== id);
      setAssets(newAssets);
      onStateChange({ assets: newAssets });
      if (selectedAssetId === id) setSelectedAssetId(null);
  };

  // --- GENERATE HANDLERS ---
  const handleGenerateStructure = async () => {
    if (!sketchImage) return;
    setIsProcessing(true);
    setProcessStatus('Đang dựng khung sườn kiến trúc (Bước 1)...');
    try {
        if (onDeductCredits) await onDeductCredits(2 * numberOfImages, `Idea Structure x${numberOfImages}`);
        const images = await geminiService.generateIdeaStructure(sketchImage, styleImage || null, numberOfImages, (status) => setProcessStatus(status));
        setStructureImages(images);
        setStep('STRUCTURE_RESULT');
    } catch (error) { console.error(error); alert('Lỗi tạo khung sườn.'); } 
    finally { setIsProcessing(false); }
  };

  const handleSelectStructureForDecor = (imgSrc: string) => {
    setSelectedStructure(imgSrc);
    setAssets([]); 
    setSelectedAssetId(null);
    setStep('DECOR_SETUP');
  };

  const handleGenerateDecor = async () => {
    if (!selectedStructure || assets.length === 0) {
      alert("Vui lòng thêm ít nhất 1 decor.");
      return;
    }
    setIsProcessing(true);
    setProcessStatus('Đang xử lý ảnh ghép và render ánh sáng (Bước 2)...');
    
    try {
        if (onDeductCredits) await onDeductCredits(4 * numberOfImages, `Idea Decor (Composite) x${numberOfImages}`);
        
        // 1. Create a composite image (Flatten background + assets)
        setProcessStatus('Đang tạo ảnh composite từ layout...');
        const composite = await createCompositeImage(selectedStructure, assets);
        
        // 2. Send the flattened image to AI for "rendering" (blending, lighting, shadows)
        setProcessStatus('Đang render ánh sáng và bóng đổ...');
        const images = await geminiService.generateIdeaDecor(
            composite.base64, 
            composite.mimeType, 
            numberOfImages, 
            (status) => setProcessStatus(status)
        );
        
        setFinalImages(images);
        setStep('FINAL_RESULT');
    } catch (error) { console.error(error); alert('Lỗi ghép đồ.'); } 
    finally { setIsProcessing(false); }
  };

  const renderProgressBar = () => (
     <div className="flex items-center justify-between px-10 mb-6 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-theme-surface2 -z-10"></div>
        {['Dữ Liệu', 'Khung Sườn', 'Ghép Đồ', 'Kết Quả'].map((label, idx) => {
            const stepNames = ['UPLOAD', 'STRUCTURE_RESULT', 'DECOR_SETUP', 'FINAL_RESULT'];
            const isActive = stepNames.indexOf(step) >= idx;
            const isCurrent = stepNames.indexOf(step) === idx;
            return (
                <div key={idx} className={`flex flex-col items-center z-10 ${isActive ? 'text-theme-gold' : 'text-theme-text-sub opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'border-theme-gold bg-theme-gold text-theme-base' : isActive ? 'border-theme-gold bg-theme-surface' : 'border-theme-gold bg-theme-surface'}`}>{idx + 1}</div>
                    <span className="text-xs mt-1 bg-theme-base px-1">{label}</span>
                </div>
            );
        })}
     </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full min-h-[calc(100vh-150px)]">
      <input type="file" ref={hiddenNewDecorInputRef} className="hidden" accept="image/*" onChange={handleNewDecorFileChange} />
      <input type="file" ref={hiddenReplaceInputRef} className="hidden" accept="image/*" onChange={handleReplaceFileChange} />
      
      {renderProgressBar()}

      {isProcessing && (
        <div className="w-full bg-theme-surface2 text-theme-gold p-4 rounded-xl flex items-center justify-center animate-pulse border border-theme-gold/20">
          <Spinner />
          <span className="font-normal ml-2 tracking-wide uppercase text-sm">{processStatus}</span>
        </div>
      )}

      {step === 'UPLOAD' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            <div className="bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10 flex flex-col gap-4">
                <h3 className="text-base font-normal text-theme-text-main uppercase tracking-widest">1. Ảnh Phác Thảo (Sketch)</h3>
                <ImageUpload onFileSelect={handleSketchUpload} previewUrl={sketchImage?.objectURL || null} placeholder="Tải ảnh phác thảo..." />
            </div>
            <div className="bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10 flex flex-col gap-4">
                <h3 className="text-base font-normal text-theme-text-main uppercase tracking-widest">2. Ảnh Style (Moodboard)</h3>
                <ImageUpload onFileSelect={handleStyleUpload} previewUrl={styleImage?.objectURL || null} placeholder="Tải ảnh tham khảo..." />
            </div>
            <div className="md:col-span-2 bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10 flex flex-col gap-4 items-center">
                 <div className="w-full max-w-md">
                    <label className="block text-xs font-normal text-theme-text-sub mb-2 uppercase tracking-widest">Số lượng phương án</label>
                    <div className="flex bg-theme-base rounded-xl p-1 border border-theme-gold/10 mb-4">
                        {[1, 2, 3, 4].map(num => (
                            <button key={num} onClick={() => setNumberOfImages(num)} className={`flex-1 py-2 text-sm font-normal rounded-lg transition-all ${numberOfImages === num ? 'bg-theme-gold text-theme-base shadow-lg' : 'text-theme-text-sub hover:text-theme-gold'}`}>{num}</button>
                        ))}
                    </div>
                    <button onClick={handleGenerateStructure} disabled={!sketchImage || isProcessing} className={`w-full py-4 text-sm font-normal rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${!sketchImage || isProcessing ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed' : 'bg-theme-gold text-theme-base hover:bg-white'}`}>TẠO PHƯƠNG ÁN (BƯỚC 1)</button>
                 </div>
            </div>
         </div>
      )}

      {step === 'STRUCTURE_RESULT' && (
          <div className="bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-normal text-theme-gold">Kết quả Khung Sườn ({structureImages.length})</h3>
                  <button onClick={() => setStep('UPLOAD')} className="text-sm text-theme-text-sub underline hover:text-white">Quay lại</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {structureImages.map((imgSrc, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden shadow-2xl bg-black border border-theme-gold/10">
                          <img src={imgSrc} alt={`Structure ${idx + 1}`} className="w-full h-auto object-cover" />
                          <div className="absolute inset-0 bg-theme-base/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                               <button onClick={() => handleSelectStructureForDecor(imgSrc)} className="px-6 py-3 bg-theme-gold text-theme-base font-normal rounded-full hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
                                  <LayoutIcon /> DECOR TRÊN NỀN NÀY
                               </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {step === 'DECOR_SETUP' && selectedStructure && (
        <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
            {/* LEFT: ASSET LIST */}
            <div className="w-full lg:w-[30%] flex flex-col gap-4 h-full min-w-[300px]">
                 <div className="bg-theme-surface p-4 rounded-2xl shadow-xl border border-theme-gold/10 flex-1 flex flex-col">
                    <h3 className="text-base font-normal text-theme-text-main mb-3 uppercase tracking-widest flex justify-between items-center">
                        <span>Danh sách Decor ({assets.length})</span>
                        <button onClick={() => setStep('STRUCTURE_RESULT')} className="text-xs text-theme-text-sub underline">Đổi nền</button>
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 border border-theme-gold/10 rounded-xl bg-theme-base/50">
                        {assets.length === 0 ? (
                             <div className="text-center text-theme-text-sub text-xs mt-10 p-4 border border-dashed border-theme-gold/20 rounded-lg">
                                <p>Chưa có đồ trang trí.</p>
                                <p className="mt-2 text-[10px] opacity-70">Nhấn "Thêm Decor" bên dưới để tải ảnh lên.</p>
                             </div>
                        ) : (
                            assets.map((asset, idx) => (
                                <div key={asset.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${selectedAssetId === asset.id ? 'bg-theme-gold/10 border-theme-gold' : 'bg-theme-base border-theme-gold/10'}`}
                                     onClick={() => setSelectedAssetId(asset.id)}>
                                    
                                    {/* Thumbnail Compact */}
                                    <div className="w-8 h-8 bg-theme-surface rounded-md border border-theme-gold/20 overflow-hidden flex-shrink-0">
                                        {asset.image && <img src={asset.image.objectURL} className="w-full h-full object-cover" alt="" />}
                                    </div>
                                    
                                    {/* Input Name */}
                                    <input type="text" value={asset.label} onChange={(e) => { const newAssets = assets.map(a => a.id === asset.id ? { ...a, label: e.target.value } : a); setAssets(newAssets); }}
                                        className="flex-1 bg-transparent border-none text-xs text-theme-text-main focus:ring-0 p-0 min-w-0" placeholder="Tên..." />
                                    
                                    {/* Actions */}
                                    <div className="flex gap-1">
                                        <button 
                                            title="Thay ảnh"
                                            onClick={(e) => { e.stopPropagation(); handleTriggerReplace(asset.id); }} 
                                            className="p-1.5 text-theme-text-sub hover:text-theme-gold hover:bg-theme-surface rounded-md transition-colors"
                                        >
                                            <SwapIcon />
                                        </button>
                                        <button 
                                            title="Xóa"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveAsset(asset.id); }} 
                                            className="p-1.5 text-theme-text-sub hover:text-red-500 hover:bg-theme-surface rounded-md transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <button onClick={handleAddNewDecorClick} className="mt-2 w-full py-2 bg-theme-surface2 text-theme-gold border border-theme-gold/50 border-dashed rounded-xl text-xs hover:bg-theme-gold hover:text-theme-base transition-all flex items-center justify-center gap-2">
                        <PlusIcon /> THÊM DECOR
                    </button>

                    <div className="mt-4 pt-4 border-t border-theme-gold/10">
                         <div className="flex bg-theme-base rounded-xl p-1 border border-theme-gold/10 mb-4">
                            {[1, 2, 3].map(num => (
                                <button key={num} onClick={() => setNumberOfImages(num)} className={`flex-1 py-1.5 text-xs rounded-lg ${numberOfImages === num ? 'bg-theme-gold text-theme-base' : 'text-theme-text-sub'}`}>{num}</button>
                            ))}
                         </div>
                         <button onClick={handleGenerateDecor} disabled={assets.length === 0 || isProcessing} className={`w-full py-3 text-sm font-normal rounded-xl shadow-lg transition-all ${assets.length === 0 || isProcessing ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed' : 'bg-theme-gold text-theme-base hover:bg-white'}`}>TẠO PHƯƠNG ÁN (BƯỚC 2)</button>
                    </div>
                 </div>
            </div>

            {/* RIGHT: INTERACTIVE CANVAS */}
            <div className="w-full lg:w-[70%] h-full bg-theme-surface p-4 rounded-2xl shadow-xl border border-theme-gold/10 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-normal text-theme-text-main uppercase tracking-widest">Sắp đặt Decor</h3>
                    <p className="text-xs text-theme-text-sub">Hãy di chuyển, co kéo, xoay tại các vị trí mong muốn</p>
                </div>
                
                <div 
                    ref={containerRef}
                    className="flex-1 relative bg-black/60 rounded-xl overflow-hidden border border-dashed border-theme-gold/20 flex items-center justify-center select-none cursor-default backdrop-blur-sm"
                    onMouseMove={handleGlobalMouseMove}
                    onMouseUp={handleGlobalMouseUp}
                    onMouseLeave={handleGlobalMouseUp}
                    onMouseDown={handleBackgroundMouseDown} // Changed from onClick to onMouseDown
                >
                    <img ref={imgRef} src={selectedStructure} onLoad={updateMetrics} alt="Background" className="max-w-full max-h-full object-contain pointer-events-none" draggable={false} />
                    
                    {assets.map((asset, idx) => {
                        const leftPx = imageMetrics.left + (asset.x / 100) * imageMetrics.width;
                        const topPx = imageMetrics.top + (asset.y / 100) * imageMetrics.height;
                        const widthPx = (asset.width / 100) * imageMetrics.width;
                        const heightPx = (asset.height / 100) * imageMetrics.height;
                        const isSelected = selectedAssetId === asset.id;

                        return (
                            <div 
                                key={asset.id}
                                className={`absolute group/asset cursor-move ${isSelected ? 'z-50' : 'z-40'}`}
                                style={{ 
                                    left: leftPx, top: topPx, width: widthPx, height: heightPx,
                                    transform: `rotate(${asset.rotation || 0}deg)`,
                                    transformOrigin: 'center center'
                                }}
                                onMouseDown={(e) => handleAssetMouseDown(e, asset.id)}
                            >
                                {/* Asset Image with Opacity */}
                                <div className={`w-full h-full relative ${isSelected ? 'ring-2 ring-theme-gold ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-theme-gold/50'}`}>
                                    {asset.image ? (
                                        <img 
                                            src={asset.image.objectURL} 
                                            className="w-full h-full object-cover pointer-events-none opacity-70" 
                                            draggable={false} 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/20 opacity-70" />
                                    )}
                                    
                                    {/* CONTROLS (Only visible when selected) */}
                                    {isSelected && (
                                        <>
                                            {/* Resize Handles (Corners) */}
                                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-theme-gold cursor-nw-resize z-50" onMouseDown={(e) => handleResizeStart(e, asset.id, 'nw')} />
                                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-theme-gold cursor-ne-resize z-50" onMouseDown={(e) => handleResizeStart(e, asset.id, 'ne')} />
                                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-theme-gold cursor-sw-resize z-50" onMouseDown={(e) => handleResizeStart(e, asset.id, 'sw')} />
                                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-theme-gold cursor-se-resize z-50" onMouseDown={(e) => handleResizeStart(e, asset.id, 'se')} />
                                            
                                            {/* Rotate Handle (Top Stick) */}
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-theme-gold rounded-full flex items-center justify-center cursor-alias shadow-md z-50"
                                                 onMouseDown={(e) => handleRotateStart(e, asset.id)}>
                                                <RotateIcon />
                                            </div>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-theme-gold -z-10" />

                                            {/* Size Indicator */}
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-theme-base text-theme-gold text-[9px] px-2 py-0.5 rounded border border-theme-gold/20 whitespace-nowrap z-50 shadow-md">
                                                {Math.round(asset.width)}% x {Math.round(asset.height)}%
                                            </div>
                                        </>
                                    )}
                                    <span className="absolute top-0 right-0 bg-theme-gold text-theme-base text-[9px] px-1 font-bold rounded-bl shadow-sm pointer-events-none">#{idx + 1}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {step === 'FINAL_RESULT' && (
           <div className="bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-normal text-theme-gold">Kết quả Ý Tưởng Hoàn Thiện ({finalImages.length})</h3>
                  <div className="flex gap-4">
                      <button onClick={() => setStep('DECOR_SETUP')} className="text-sm text-theme-text-sub underline hover:text-white">Sửa Decor</button>
                      <button onClick={() => setStep('UPLOAD')} className="text-sm text-theme-text-sub underline hover:text-white">Làm mới từ đầu</button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {finalImages.map((imgSrc, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden shadow-2xl bg-black border border-theme-gold/10">
                          <img src={imgSrc} alt={`Final ${idx + 1}`} className="w-full h-auto object-cover" />
                          <div className="absolute inset-0 bg-theme-base/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                               <a href={imgSrc} download={`final-idea-${idx+1}.png`} className="px-8 py-3 bg-theme-gold text-theme-base font-normal rounded-full hover:scale-105 transition-transform shadow-lg">Tải xuống</a>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};