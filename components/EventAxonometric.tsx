import React from 'react';
import { EventAxonometricProps } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';

export const EventAxonometric: React.FC<EventAxonometricProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
    const { sourceImage, eventDescription, resultImage, isLoading, error } = state;
    const COST = 15;

    const handleGenerate = async () => {
        if (!sourceImage) return onStateChange({ error: 'Vui lòng tải lên ảnh hiện trạng.' });
        if (!eventDescription) return onStateChange({ error: 'Vui lòng nhập mô tả ý tưởng sự kiện.' });
        
        if (onDeductCredits && userCredits < COST) {
            return onStateChange({ error: `Cần ${COST} credits để thực hiện.` });
        }

        onStateChange({ isLoading: true, error: null, resultImage: null });

        try {
            if (onDeductCredits) await onDeductCredits(COST, 'Axonometric Event View');

            const result = await geminiService.generateAxonometricView(
                sourceImage.base64,
                sourceImage.mimeType,
                eventDescription
            );

            onStateChange({ resultImage: result });
        } catch (err) {
            onStateChange({ error: 'Có lỗi xảy ra khi tạo ảnh.' });
            console.error(err);
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-8 p-4 md:p-8">
            {/* LEFT: Controls */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-theme-surface rounded-2xl p-6 border border-theme-gold/10 shadow-lg">
                    <h2 className="text-lg font-normal text-theme-text-main mb-4 border-b border-theme-gold/10 pb-4">Toàn Cảnh 3D (Axonometric)</h2>
                    
                    <div className="space-y-2 mb-6">
                        <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                            1. Ảnh Hiện Trạng
                        </label>
                        <ImageUpload 
                            onFileSelect={(file) => onStateChange({ sourceImage: file, resultImage: null })} 
                            previewUrl={sourceImage?.objectURL || null}
                            placeholder="Tải ảnh mặt bằng/hiện trạng"
                        />
                    </div>
                    
                    <div className="space-y-2 mb-6">
                        <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                            2. Mô tả Concept Sự Kiện
                        </label>
                        <textarea
                            className="w-full bg-theme-base border border-theme-gold/20 rounded-xl p-3 text-sm text-theme-text-main placeholder-theme-text-sub/50 focus:ring-1 focus:ring-theme-gold outline-none h-32 resize-none"
                            placeholder="VD: Tiệc cưới sang trọng, tone trắng và vàng đồng, nhiều hoa hồng trắng, bàn tiệc tròn, đèn chùm pha lê..."
                            value={eventDescription}
                            onChange={(e) => onStateChange({ eventDescription: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceImage}
                        className={`w-full py-3 rounded-xl font-normal text-theme-base tracking-widest shadow-lg transition-all transform hover:-translate-y-1 text-sm
                            ${isLoading || !sourceImage 
                                ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10' 
                                : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'}`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Spinner />
                                <span>ĐANG TẠO BẢN VẼ...</span>
                            </div>
                        ) : 'TẠO BẢN VẼ 3D'}
                    </button>
                    {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
                </div>
            </div>

            {/* RIGHT: Result */}
            <div className="w-full lg:w-2/3 bg-theme-surface rounded-2xl border border-theme-gold/10 p-2 relative overflow-hidden min-h-[500px]">
                {resultImage && sourceImage ? (
                   <div className="h-full flex flex-col gap-4">
                        <div className="flex-1 min-h-0 bg-black/20 rounded-xl overflow-hidden border border-theme-gold/10">
                             <ImageComparator 
                                originalImage={sourceImage.objectURL || ''} 
                                generatedImage={resultImage} 
                            />
                        </div>
                        <div className="flex justify-center gap-4 py-2">
                            <a 
                                href={resultImage} 
                                download="axonometric-view.png"
                                className="px-6 py-2 bg-theme-gold text-theme-base rounded-full text-sm font-normal hover:bg-white transition-colors shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Tải Bản Vẽ
                            </a>
                        </div>
                   </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-theme-text-sub bg-theme-base/30 rounded-xl">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <div className="relative w-20 h-20 mb-4">
                                  <div className="absolute inset-0 border-4 border-theme-gold/20 rounded-full animate-ping"></div>
                                  <div className="absolute inset-0 border-4 border-theme-gold rounded-full animate-spin border-t-transparent"></div>
                                </div>
                                <p className="text-theme-gold animate-pulse tracking-wide">AI đang dựng hình 3D...</p>
                            </div>
                        ) : (
                             <>
                                <svg className="w-20 h-20 mb-4 opacity-30 text-theme-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-lg italic text-theme-text-main">Kết quả bản vẽ 3D Axonometric sẽ hiển thị tại đây</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
