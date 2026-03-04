import React, { useState } from 'react';
import { SketchConverterProps } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { OptionSelector } from './OptionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';

const styleOptions = [
    { value: 'pencil', label: 'Bút chì (Classic)' },
    { value: 'architectural', label: 'Kiến trúc (Line Art)' },
    { value: 'charcoal', label: 'Than củi (Artistic)' },
    { value: 'watercolor', label: 'Màu nước (Luxury)' },
];

export const SketchConverter: React.FC<SketchConverterProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, isLoading, error, resultImage, sketchStyle } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const FLASH_COST = 10;

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < FLASH_COST) {
             onStateChange({ error: `Số dư không đủ. Cần ${FLASH_COST} Credits để sử dụng Gemini 2.5 Flash.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh phối cảnh hoặc ảnh chụp không gian.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImage: null });
        setStatusMessage('Gemini 2.5 Flash đang phân tích...');

        try {
            if (onDeductCredits) {
                await onDeductCredits(FLASH_COST, `Sketch Converter (Gemini 2.5 Flash) - Style: ${sketchStyle}`);
            }

            const resultUrl = await geminiService.generateSketch(
                sourceImage.base64,
                sourceImage.mimeType,
                sketchStyle,
                '1K'
            );

            onStateChange({ resultImage: resultUrl });
            
        } catch (err: any) {
            onStateChange({ error: "Không thể tạo bản phác thảo. Vui lòng thử lại sau." });
            console.error(err);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = async () => {
        if (!resultImage) return;
        setIsDownloading(true);
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `sketch-flash-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloading(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            
            <div className="flex flex-col">
                {/* Heading H2 -> text-lg font-normal */}
                <h2 className="text-lg font-normal text-theme-text-main">Sketch Converter Pro</h2>
                <p className="text-theme-text-sub italic mt-1 text-sm">Powered by Gemini 2.5 Image Flash • Hiệu suất cao • Kết quả tức thì</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel Điều khiển */}
                <div className="lg:col-span-4 space-y-6 bg-theme-surface p-6 rounded-2xl shadow-xl border border-theme-gold/10">
                    <ImageUpload 
                        onFileSelect={(f) => onStateChange({ sourceImage: f, resultImage: null })} 
                        previewUrl={sourceImage?.objectURL || null} 
                    />
                    
                    <OptionSelector 
                        id="style" 
                        label="Phong cách Sketch" 
                        options={styleOptions} 
                        value={sketchStyle} 
                        onChange={(v) => onStateChange({ sketchStyle: v as any })} 
                        variant="grid"
                    />

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !sourceImage || userCredits < FLASH_COST} 
                        className={`w-full py-4 rounded-xl font-normal text-theme-base transition-all shadow-lg transform active:scale-95 ${
                            isLoading ? 'bg-theme-surface2 text-theme-text-sub border border-theme-gold/10' : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'
                        }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Spinner /> {statusMessage}
                            </div>
                        ) : `Bắt đầu Render 3D Realism (10 Credits)`}
                    </button>
                    
                    {error && <div className="p-3 bg-red-900/20 text-red-400 rounded-lg text-xs border border-red-900/30 text-center">{error}</div>}
                </div>

                {/* Panel Hiển thị */}
                <div className="lg:col-span-8 bg-theme-base rounded-2xl border-2 border-dashed border-theme-gold/10 overflow-hidden relative min-h-[500px]">
                    {resultImage && sourceImage ? (
                        <div className="h-full flex flex-col p-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-normal uppercase tracking-wider text-theme-base bg-theme-gold px-3 py-1 rounded-full shadow-sm">Kết quả Flash</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewImage(resultImage)} className="p-2 bg-theme-surface rounded-full shadow-sm hover:bg-theme-gold hover:text-theme-base text-theme-gold transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                    </button>
                                    <button 
                                        onClick={handleDownload} 
                                        disabled={isDownloading}
                                        className="px-4 py-2 bg-theme-gold text-theme-base rounded-lg text-sm font-normal flex items-center gap-2 hover:bg-white transition-colors"
                                    >
                                        {isDownloading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                        Tải ảnh
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 rounded-xl overflow-hidden bg-black shadow-2xl border border-theme-gold/5">
                                <ImageComparator originalImage={sourceImage.objectURL || ''} generatedImage={resultImage} />
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-gold-dim">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full blur-xl bg-theme-gold/20 animate-pulse"></div>
                                        <Spinner />
                                    </div>
                                    <p className="font-normal text-theme-gold animate-pulse tracking-wide">{statusMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-5xl mb-4 opacity-30 text-theme-gold">✨</div>
                                    <p className="italic text-lg text-theme-gold">Chọn ảnh phối cảnh để bắt đầu trải nghiệm Flash</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};