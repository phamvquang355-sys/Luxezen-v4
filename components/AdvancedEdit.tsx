import React, { useState, useRef, useEffect } from 'react';
import { FileData, AdvancedEditProps, EditMode, ClickPoint } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { AnnotationCanvas } from './AnnotationCanvas';
import { PointSelectorModal } from './PointSelectorModal'; 

const AI_EDIT_COST = 35; 
const DETECTION_COST = 5; 

const AdvancedEdit: React.FC<AdvancedEditProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
    const { sourceImage, editMode, refObject, annotatedBase64, clickPoint, detectedPoints, resultImage, isLoading, error, isAnnotating, additionalPrompt } = state;
    const [isPointSelectionModalOpen, setIsPointSelectionModalOpen] = useState(false); 

    const handleFileSelect = (data: FileData) => {
        onStateChange({ sourceImage: data, annotatedBase64: null, resultImage: null, error: null, clickPoint: null, refObject: null, isAnnotating: false, detectedPoints: [] });
    };

    const handleRefObjectSelect = (data: FileData) => {
        onStateChange({ refObject: data, resultImage: null, error: null });
    };

    const handleSetEditMode = (mode: EditMode) => {
        onStateChange({ editMode: mode, annotatedBase64: null, clickPoint: null, resultImage: null, error: null, refObject: null, detectedPoints: [] });
        setIsPointSelectionModalOpen(false); 
    };

    const handleStartAnnotation = () => {
        if (!sourceImage) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên trước." });
            return;
        }
        onStateChange({ isAnnotating: true, error: null });
    };

    const handleSaveAnnotation = (b64: string) => {
        onStateChange({ annotatedBase64: b64, isAnnotating: false });
    };

    const handleCancelAnnotation = () => {
        onStateChange({ isAnnotating: false });
    };

    const handleSavePointSelection = (point: ClickPoint, newDetectedPoints: ClickPoint[]) => {
        onStateChange({ 
            clickPoint: point, 
            detectedPoints: newDetectedPoints, 
            resultImage: null, 
            error: null 
        });
        setIsPointSelectionModalOpen(false);
    };

    const handleGenerate = async () => {
        if (!sourceImage) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên." });
            return;
        }

        if (editMode === 'NOTE' && !annotatedBase64) {
            onStateChange({ error: "Vui lòng hoàn tất chú thích trước." });
            return;
        }

        if (editMode === 'SWAP' && (!refObject || !clickPoint)) {
            onStateChange({ error: "Vui lòng tải ảnh mẫu và chọn điểm thay thế." });
            return;
        }

        if (userCredits < AI_EDIT_COST) {
            onStateChange({ error: `Bạn cần ${AI_EDIT_COST} Credits để thực hiện.` });
            return;
        }

        onStateChange({ isLoading: true, error: null });

        try {
            await onDeductCredits?.(AI_EDIT_COST, `Advanced Edit (${editMode})`);

            let result = '';
            if (editMode === 'NOTE' && annotatedBase64) {
                result = await geminiService.generateAdvancedEdit(
                    sourceImage.base64,
                    sourceImage.mimeType,
                    'NOTE',
                    { base64: annotatedBase64, mimeType: 'image/jpeg' }, 
                    undefined,
                    additionalPrompt
                );
            } else if (editMode === 'SWAP' && refObject && clickPoint) {
                const targetPointsForSwap = detectedPoints.length > 0 ? detectedPoints : [clickPoint];
                
                result = await geminiService.generateAdvancedEdit(
                    sourceImage.base64,
                    sourceImage.mimeType,
                    'SWAP',
                    { base64: refObject.base64, mimeType: refObject.mimeType },
                    targetPointsForSwap 
                );
            }
            onStateChange({ resultImage: result });
        } catch (err: any) {
            onStateChange({ error: "Quá trình chỉnh sửa gặp sự cố. Vui lòng thử lại sau." });
            console.error("Advanced Edit Error:", err);
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const resetCurrentTab = () => {
        onReset();
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-theme-surface rounded-2xl shadow-2xl border border-theme-gold/10">
            {/* H2 Panel Title: text-lg font-normal */}
            <h2 className="text-lg font-normal text-theme-text-main mb-4 border-b border-theme-gold/10 pb-4">
                Chỉnh Sửa Nâng Cao AI
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* PANEL ĐIỀU KHIỂN */}
                <div className="lg:col-span-4 space-y-6 bg-theme-base p-6 rounded-2xl shadow-xl border border-theme-gold/10">
                    {/* H3 Section Title: text-base font-normal */}
                    <h3 className="text-base font-normal text-theme-text-main mb-4 uppercase tracking-wider">Đầu Vào & Cài Đặt</h3>

                    {/* 1. Tải ảnh gốc */}
                    <div className="space-y-2">
                        {/* Label: text-xs font-normal */}
                        <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                            1. Tải Ảnh Gốc (Cảnh Chính)
                        </label>
                        <ImageUpload 
                            onFileSelect={handleFileSelect} 
                            previewUrl={sourceImage?.objectURL || null}
                            maxWidth={1280} 
                            quality={0.9}
                            compact
                        />
                    </div>
                    
                    {sourceImage && (
                        <div className="mt-6 space-y-4">
                            <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                                2. Chọn Kiểu Chỉnh Sửa
                            </label>
                            <div className="flex gap-2 p-1 bg-theme-surface rounded-xl border border-theme-gold/10">
                                {/* Button Toggle: Compact padding py-2 font-normal */}
                                <button 
                                    onClick={() => handleSetEditMode('NOTE')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-normal transition-all ${editMode === 'NOTE' ? 'bg-theme-gold text-theme-base shadow-lg' : 'bg-transparent text-theme-text-sub hover:text-theme-text-main'}`}
                                >
                                    VẼ GHI CHÚ ✍️
                                </button>
                                <button 
                                    onClick={() => handleSetEditMode('SWAP')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-normal transition-all ${editMode === 'SWAP' ? 'bg-theme-gold text-theme-base shadow-lg' : 'bg-transparent text-theme-text-sub hover:text-theme-text-main'}`}
                                >
                                    THAY THẾ VẬT THỂ 🪑
                                </button>
                            </div>
                        </div>
                    )}

                    {editMode === 'NOTE' && sourceImage && (
                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 space-y-4">
                            <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                                3. Ghi chú trực quan & Văn bản
                            </label>
                            
                            {!annotatedBase64 && !isAnnotating && (
                                <button
                                    onClick={handleStartAnnotation}
                                    /* Primary Action: text-sm, py-2.5 font-normal */
                                    className="w-full py-2.5 bg-theme-surface2 border border-theme-gold text-theme-gold rounded-xl text-sm font-normal hover:bg-theme-gold hover:text-theme-base transition-colors shadow-lg"
                                >
                                    BẮT ĐẦU CHÚ THÍCH
                                </button>
                            )}

                            {(annotatedBase64 || isAnnotating) && (
                                <button
                                    onClick={handleStartAnnotation}
                                    className={`w-full py-2.5 rounded-xl text-sm font-normal transition-all shadow-md flex items-center justify-center gap-2 ${annotatedBase64 ? 'bg-green-700/80 text-white border border-green-500' : 'bg-blue-600 text-white'}`}
                                >
                                    {annotatedBase64 ? '✅ ĐÃ VẼ GHI CHÚ' : '✍️ ĐANG VẼ...'}
                                </button>
                            )}

                             {/* Textarea: text-sm font-normal */}
                            <div className="space-y-2 mt-4">
                                <label className="text-[10px] font-normal text-theme-text-sub uppercase tracking-widest">Mô tả chi tiết yêu cầu</label>
                                <textarea
                                    value={additionalPrompt || ''}
                                    onChange={(e) => onStateChange({ additionalPrompt: e.target.value })}
                                    placeholder="Ví dụ: Thay bình hoa cũ bằng bình hoa pha lê, thêm ánh sáng vàng ấm..."
                                    className="w-full p-3 bg-theme-surface border border-theme-gold/20 rounded-xl focus:ring-1 focus:ring-theme-gold outline-none text-theme-text-main placeholder-theme-text-sub/50 text-sm h-24 resize-none"
                                />
                            </div>
                        </div>
                    )}
                    
                    {editMode === 'SWAP' && sourceImage && (
                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 space-y-4">
                            <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                                3. Tải Mẫu Vật Thể Mới
                            </label>
                            <ImageUpload 
                                onFileSelect={handleRefObjectSelect} 
                                previewUrl={refObject?.objectURL || null}
                                maxWidth={512} 
                                quality={0.8}
                                compact
                            />
                            
                            <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest mt-4">
                                4. Chọn Vị Trí Thay Thế Trên Ảnh Gốc
                            </label>
                            <button
                                onClick={() => setIsPointSelectionModalOpen(true)}
                                className="w-full py-2.5 bg-theme-surface2 text-theme-gold border border-theme-gold/50 rounded-xl text-sm font-normal hover:bg-theme-gold hover:text-theme-base transition-colors shadow-md"
                                disabled={isLoading}
                            >
                                {clickPoint ? "Thay Đổi Vị Trí Đã Chọn" : "Chọn Vị Trí Thay Thế"}
                                {clickPoint && <span className="ml-2 opacity-80">({Math.round(clickPoint.x)}%, {Math.round(clickPoint.y)}%)</span>}
                            </button>
                            {clickPoint && (
                                <p className="text-xs text-theme-text-sub mt-2 text-center">
                                    Đã chọn điểm. {detectedPoints.length > 0 ? `Đã tìm thấy ${detectedPoints.length} vật thể tương tự.` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-theme-surface rounded-xl border border-theme-gold/20 mt-6">
                        <span className="text-sm text-theme-text-main">Phí chỉnh sửa: <b className="text-theme-gold">{AI_EDIT_COST} Credits</b></span>
                        <span className="text-sm text-theme-text-sub">Số dư: {userCredits}</span>
                    </div>

                    {/* MAIN GENERATE BUTTON: Primary (text-sm, py-3, font-normal) */}
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceImage || (editMode === 'NOTE' && !annotatedBase64) || (editMode === 'SWAP' && (!refObject || !clickPoint))}
                        className={`w-full py-3 px-6 rounded-xl font-normal text-theme-base tracking-widest shadow-lg transition-all transform hover:-translate-y-1 text-sm
                            ${isLoading || !sourceImage || (editMode === 'NOTE' && !annotatedBase64) || (editMode === 'SWAP' && (!refObject || !clickPoint))
                                ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10' 
                                : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'
                            }
                        `}
                    >
                        {isLoading ? <Spinner /> : "BẮT ĐẦU CHỈNH SỬA ✨"}
                    </button>
                    {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
                    
                    {resultImage && (
                        <div className="flex justify-center gap-3 py-2 mt-4">
                            {/* Secondary Buttons: text-xs, py-2, font-normal */}
                            <a 
                                href={resultImage} 
                                download="ai-edited-image.png"
                                className="px-5 py-2 bg-theme-gold text-theme-base rounded-full text-xs font-normal hover:bg-white transition-colors shadow-md flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Tải Ảnh
                            </a>
                            <button 
                                onClick={resetCurrentTab}
                                className="px-5 py-2 bg-theme-surface2 text-theme-gold border border-theme-gold/20 rounded-full text-xs font-normal hover:bg-theme-gold hover:text-theme-base transition-colors"
                            >
                                Làm Mới
                            </button>
                        </div>
                    )}
                </div>

                {/* KHU VỰC HIỂN THỊ CHÍNH */}
                <div className="lg:col-span-8 h-full min-h-[600px] bg-theme-base rounded-2xl shadow-xl border border-theme-gold/10 p-2 relative overflow-hidden">
                    {!sourceImage && (
                        <div className="flex flex-col items-center justify-center h-full text-theme-text-sub bg-theme-surface/20">
                            <div className="text-5xl mb-4 opacity-50">✨</div>
                            <p className="text-lg italic text-theme-text-main">Đang đợi ảnh thiết kế của bạn...</p>
                        </div>
                    )}

                    {sourceImage && !resultImage && (
                        <div className="relative w-full h-full">
                            {editMode === 'NOTE' && (annotatedBase64 || !isAnnotating) && ( 
                                <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden backdrop-blur-sm">
                                    <img src={annotatedBase64 ? `data:image/jpeg;base64,${annotatedBase64}` : sourceImage.objectURL} alt="Nguồn để chú thích" className="max-w-full max-h-[600px] object-contain shadow-2xl" />
                                </div>
                            )}
                            {editMode === 'SWAP' && (
                                <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden backdrop-blur-sm">
                                    <img 
                                        src={sourceImage.objectURL} 
                                        alt="Nguồn để thay thế"
                                        className="max-w-full max-h-[600px] object-contain shadow-2xl"
                                    />
                                    {clickPoint && (
                                        <div className="absolute w-6 h-6 bg-theme-gold/50 border-2 border-white rounded-full animate-pulse shadow-[0_0_10px_rgba(217,197,180,0.8)]"
                                             style={{ left: `${clickPoint.x}%`, top: `${clickPoint.y}%`, transform: 'translate(-50%, -50%)' }} />
                                    )}
                                    {detectedPoints.map((point, index) => (
                                        <div 
                                            key={`detected-${index}`}
                                            className="absolute w-4 h-4 bg-red-500/50 border-1 border-white rounded-full shadow-md"
                                            style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {resultImage && sourceImage && (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 min-h-0 bg-black/40 rounded-xl overflow-hidden">
                                <ImageComparator originalImage={sourceImage.objectURL || ''} generatedImage={resultImage} />
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 z-20 bg-theme-base/80 backdrop-blur-md flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32">
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold/20 rounded-full animate-ping opacity-50"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <h3 className="mt-8 text-xl font-normal text-theme-gold tracking-widest">AI ĐANG CHỈNH SỬA...</h3>
                            <p className="text-theme-text-sub mt-2 text-sm">Đang áp dụng các thay đổi được đánh dấu.</p>
                        </div>
                    )}
                </div>
            </div>
            {isAnnotating && sourceImage && (
                <AnnotationCanvas 
                    image={sourceImage.objectURL || ''} 
                    onSave={handleSaveAnnotation} 
                    onCancel={handleCancelAnnotation} 
                    originalImageWidth={sourceImage.width || 1} 
                    originalImageHeight={sourceImage.height || 1} 
                />
            )}
            {isPointSelectionModalOpen && sourceImage && (
                <PointSelectorModal
                    isOpen={isPointSelectionModalOpen}
                    onClose={() => setIsPointSelectionModalOpen(false)}
                    imageSrc={sourceImage.objectURL || ''}
                    base64Image={sourceImage.base64}
                    mimeType={sourceImage.mimeType}
                    onSavePointAndDetections={handleSavePointSelection}
                    onDeductCredits={onDeductCredits}
                    userCredits={userCredits}
                    originalImageWidth={sourceImage.width || 1} 
                    originalImageHeight={sourceImage.height || 1} 
                />
            )}
        </div>
    );
};

export default AdvancedEdit;