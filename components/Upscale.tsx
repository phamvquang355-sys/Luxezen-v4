import React from 'react';
import { FileData, UpscaleState, UpscaleProps } from '../types';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator'; 
import { ResolutionSelector } from './common/ResolutionSelector'; 
import * as geminiService from '../services/geminiService'; 

// --- MAIN COMPONENT ---
const Upscale: React.FC<UpscaleProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits, onReset }) => {
    const { sourceImage, isLoading, error, upscaledImages, resolution } = state;

    const handleUpscale = async () => {
        const cost = resolution === '4K' ? 30 : 20; 
        if (userCredits < cost) {
            onStateChange({ error: `Bạn cần thêm ${cost - userCredits} Credits.` });
            return;
        }

        if (!sourceImage || !sourceImage.base64 || !sourceImage.mimeType) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên để nâng cấp." });
            return;
        }
        onStateChange({ isLoading: true, error: null });

        try {
            await onDeductCredits?.(cost, `Strict Upscale ${resolution}`);

            const strictPrompt = `
                TASK: HIGH-FIDELITY PHOTOREALISTIC UPSCALING.
                ENHANCE the provided image to a hyper-realistic, high-definition 8k render.
                STRICTLY preserve ALL existing structural elements, details, colors, textures, and lighting.
                Focus on refining surface realism, adding subtle nuances to materials like fabrics, metals, and florals, and deepening volumetric lighting effects without altering the original composition or aesthetic.
                The goal is to elevate visual fidelity, not to re-interpret or hallucinate new elements for the design.
                Output Style: 8k photorealistic, cinematic quality.
            `;

            const result = await geminiService.generateHighQualityImage(
                strictPrompt, 
                resolution, 
                { 
                  mimeType: sourceImage.mimeType, 
                  base64: sourceImage.base64,
                  width: sourceImage.width,
                  height: sourceImage.height
                }
            );

            onStateChange({ upscaledImages: [result[0]] });
        } catch (err: any) {
            onStateChange({ error: "Quá trình nâng cấp gặp sự cố. Vui lòng thử lại sau." });
            console.error(err);
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-theme-surface rounded-2xl shadow-2xl border border-theme-gold/10">
            {/* Heading H2 -> text-lg font-normal */}
            <h2 className="text-lg font-normal text-theme-text-main mb-4 border-b border-theme-gold/10 pb-4">
                Nâng Cấp Hình Ảnh AI
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel Điều khiển */}
                <div className="lg:col-span-4 space-y-6 bg-theme-base p-6 rounded-2xl shadow-xl border border-theme-gold/10">
                    <ImageUpload 
                        onFileSelect={(data) => onStateChange({ sourceImage: data, upscaledImages: [] })} 
                        previewUrl={sourceImage?.objectURL || null} 
                        maxWidth={1280} 
                        quality={0.9} 
                    />
                    
                    <div className="space-y-4">
                        <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                          Độ phân giải đầu ra
                        </label>
                        <ResolutionSelector value={resolution} onChange={(val) => onStateChange({ resolution: val })} />
                    </div>

                    <div className="flex justify-between items-center p-3 bg-theme-surface rounded-xl border border-theme-gold/20">
                        <span className="text-sm text-theme-text-main">Phí: <b className="text-theme-gold">{resolution === '4K' ? 30 : 20} Credits</b></span>
                        <span className="text-sm text-theme-text-sub">Số dư: {userCredits}</span>
                    </div>

                    <button 
                        onClick={handleUpscale}
                        disabled={isLoading || !sourceImage}
                        className={`w-full py-4 px-6 rounded-xl font-normal text-theme-base tracking-widest shadow-lg transition-all transform hover:-translate-y-1
                            ${isLoading || !sourceImage 
                                ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10' 
                                : 'bg-theme-gold hover:bg-white hover:shadow-theme-gold/40'
                              }
                        `}
                    >
                        {isLoading ? <Spinner /> : `NÂNG CẤP ( -${resolution === '4K' ? 30 : 20} CREDITS )`}
                    </button>
                    {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
                </div>

                {/* Khu vực Hiển thị Kết quả */}
                <div className="lg:col-span-8 h-[600px] bg-theme-base rounded-2xl shadow-xl border border-theme-gold/10 p-2 relative overflow-hidden">
                    {upscaledImages.length > 0 && sourceImage ? (
                        <div className="h-full flex flex-col gap-4">
                            <div className="flex-1 min-h-0 bg-black/40 rounded-xl overflow-hidden">
                                <ImageComparator 
                                    originalImage={sourceImage.objectURL || ''} 
                                    generatedImage={upscaledImages[0]} 
                                />
                            </div>
                            <div className="flex justify-center gap-4 py-2">
                                <a 
                                    href={upscaledImages[0]} 
                                    download={`upscaled-image-${resolution}.png`}
                                    className="px-8 py-2.5 bg-theme-gold text-theme-base rounded-full text-sm font-normal hover:bg-white transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Tải Ảnh
                                </a>
                                <button 
                                    onClick={onReset}
                                    className="px-6 py-2.5 bg-theme-surface text-theme-gold border border-theme-gold/30 rounded-full text-sm font-normal hover:bg-theme-gold hover:text-theme-base transition-colors"
                                >
                                    Làm Mới
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full border-2 border-dashed border-theme-gold/10 rounded-xl flex flex-col items-center justify-center text-theme-text-sub bg-theme-surface/30">
                            {isLoading ? <Spinner /> : (
                                <>
                                    <div className="text-5xl mb-4 opacity-30 text-theme-gold">✨</div>
                                    <p className="text-lg italic text-theme-text-main">Kết quả so sánh sẽ hiển thị tại đây</p>
                                    <p className="text-sm opacity-60">Tăng cường hình ảnh của bạn với chất lượng AI.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Upscale;