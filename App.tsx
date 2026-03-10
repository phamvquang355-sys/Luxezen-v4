
import React, { useState } from 'react';
import { AppState, FileData, RenderOptions, UpscaleState, Tool, Resolution, AdvancedEditState, EditMode, SketchConverterState, SketchStyle, IdeaGeneratorState, AxonometricState, PanoramicAxoState, ViewSyncState } from './types';
import { WEDDING_CATEGORIES, WEDDING_STYLES, COLOR_PALETTES, SURFACE_MATERIALS, TEXTILE_MATERIALS, TEXTILE_COLORS, PHOTOGRAPHY_PRESETS, VIEW_ANGLES } from './constants';
import { generateWeddingRender } from './services/geminiService';
import { OptionSelector } from './components/OptionSelector';
import { RenderImageUpload } from './components/RenderImageUpload';
import { ImageComparator } from './components/ImageComparator';
import Upscale from './components/Upscale';
import AdvancedEdit from './components/AdvancedEdit';
import { SketchConverter } from './components/SketchConverter';
import { IdeaGenerator } from './components/IdeaGenerator';
import { AxonometricTool } from './components/AxonometricTool';
import { PanoramicAxoTool } from './components/PanoramicAxoTool';
import { ViewSyncTool } from './components/ViewSyncTool';
import { VideoGenerator } from './components/VideoGenerator';
import { VideoSequenceGenerator } from './components/VideoSequenceGenerator';
import { WEDDING_CAMERA_SHOTS } from './constants/videoShots';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.RENDER);
  const [videoMode, setVideoMode] = useState<'single' | 'sequence'>('single');
  const [userCredits, setUserCredits] = useState<number>(100);

  // State for Render tab
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isPhotoSettingsOpen, setIsPhotoSettingsOpen] = useState<boolean>(false); // New State for Photo Toggle
  const [sourceImage, setSourceImage] = useState<FileData | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]); // Changed to array
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0); // New state for selected image
  const generatedImage = generatedImages.length > 0 ? generatedImages[selectedImageIndex] : null; // Derived state

  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    category: WEDDING_CATEGORIES[0].value,
    style: WEDDING_STYLES[0].value,
    colorPalette: COLOR_PALETTES[0].value,
    surfaceMaterial: SURFACE_MATERIALS[0].value,
    textileMaterial: TEXTILE_MATERIALS[0].value,
    textileColor1: TEXTILE_COLORS[0].value, 
    textileColor2: TEXTILE_COLORS[0].value,
    additionalPrompt: '',
    hiddenAIContext: '',
    isAutoFocus: true,
    cameraPreset: 'CINEMATIC',
    imageCount: 1 // Default image count
  });

  // State for Upscale tab
  const [upscaleState, setUpscaleState] = useState<UpscaleState>({
    sourceImage: null,
    isLoading: false,
    error: null,
    upscaledImages: [],
    resolution: '1K' as Resolution,
  });

  // State for Advanced Edit tab
  const [advancedEditState, setAdvancedEditState] = useState<AdvancedEditState>({
    sourceImage: null,
    editMode: 'NOTE' as EditMode,
    refObject: null,
    annotatedBase64: null,
    clickPoint: null,
    detectedPoints: [],
    resultImage: null,
    isLoading: false,
    error: null,
    isAnnotating: false,
  });

  // State for Sketch Converter tab
  const [sketchState, setSketchState] = useState<SketchConverterState>({
    sourceImage: null,
    resultImage: null,
    isLoading: false,
    error: null,
    sketchStyle: 'pencil' as SketchStyle,
    resolution: '1K' as Resolution,
  });

  // State for Idea Generator tab
  const [ideaState, setIdeaState] = useState<IdeaGeneratorState>({
    sourceSketch: null,
    referenceStyle: null,
    baseImage: null,
    assets: [],
    isLoading: false,
    error: null,
    resultImages: [], 
    currentStep: 'UPLOAD',
  });

  // State for Axonometric Tool
  const [axoState, setAxoState] = useState<AxonometricState>({
    floorPlan: null,
    cornerPhotos: [],
    resultImage: null,
    analysisText: null,
    isLoading: false,
    error: null,
  });

  // State for Panoramic Axonometric Tool (New)
  const [panoramicState, setPanoramicState] = useState<PanoramicAxoState>({
    floorPlan: null,
    perspectivePhotos: [],
    resultImage: null,
    aiReasoning: null,
    isLoading: false,
    error: null,
  });

  // State for View Sync Tool (New)
  const [viewSyncState, setViewSyncState] = useState<ViewSyncState>({
    sourceImage: null,
    resultImage: null,
    selectedViewId: VIEW_ANGLES[0].id,
    userPrompt: '',
    isLoading: false,
    error: null,
  });

  // State for Video Generator Tool (New)
  const [videoGeneratorState, setVideoGeneratorState] = useState<VideoGeneratorState>({
    originalImage: null,
    videoResult: null,
    selectedShotId: WEDDING_CAMERA_SHOTS[0].id,
    userPrompt: '',
    isLoading: false,
    error: null,
  });

  const handleOptionChange = <K extends keyof RenderOptions>(key: K, value: RenderOptions[K]) => {
    setRenderOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const handleToggleCustomMode = () => {
    const nextState = !isCustomMode;
    setIsCustomMode(nextState);
    
    if (!nextState) {
        setRenderOptions(prev => ({
            ...prev,
            category: 'none',
            style: 'none',
            colorPalette: 'none',
            surfaceMaterial: 'none',
            textileMaterial: 'none',
            textileColor1: 'none',
            textileColor2: 'none'
        }));
    }
  };

  const handleAutoPrompt = (prompt: string) => {
    setRenderOptions(prev => ({ ...prev, hiddenAIContext: prompt }));
    console.log("Hidden AI Context updated silently.");
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;

    setAppState(AppState.GENERATING);
    try {
      const resultUrls = await generateWeddingRender(sourceImage, renderOptions);
      setGeneratedImages(resultUrls);
      setSelectedImageIndex(0);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra khóa API và thử lại.");
    }
  };

  const createFileDataFromDataURL = (dataUrl: string): FileData => {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].replace('data:', '');
    const base64 = parts[1];
    return {
      base64,
      mimeType,
      objectURL: dataUrl 
    };
  };

  const handleSourceImageUpload = (data: FileData) => {
    setSourceImage(data);
    setGeneratedImages([]); 
    setAppState(AppState.IDLE); 
  };

  const handleUpscaleStateChange = (newState: Partial<UpscaleState>) => {
    setUpscaleState(prev => ({ ...prev, ...newState }));
  };

  const resetUpscaleTab = () => {
    setUpscaleState({
      sourceImage: null,
      isLoading: false,
      error: null,
      upscaledImages: [],
      resolution: '1K' as Resolution,
    });
  };

  const handleAdvancedEditStateChange = (newState: Partial<AdvancedEditState>) => {
    setAdvancedEditState(prev => ({ ...prev, ...newState }));
  };

  const resetAdvancedEditTab = () => {
    setAdvancedEditState({
      sourceImage: null,
      editMode: 'NOTE',
      refObject: null,
      annotatedBase64: null,
      clickPoint: null,
      detectedPoints: [],
      resultImage: null,
      isLoading: false,
      error: null,
      isAnnotating: false,
    });
  };

  const handleSketchStateChange = (newState: Partial<SketchConverterState>) => {
    setSketchState(prev => ({ ...prev, ...newState }));
  };

  const resetSketchTab = () => {
    setSketchState({
      sourceImage: null,
      resultImage: null,
      isLoading: false,
      error: null,
      sketchStyle: 'pencil',
      resolution: '1K',
    });
  };

  const handleIdeaStateChange = (newState: Partial<IdeaGeneratorState>) => {
    setIdeaState(prev => ({ ...prev, ...newState }));
  };

  const resetIdeaTab = () => {
    setIdeaState({
      sourceSketch: null,
      referenceStyle: null,
      baseImage: null,
      assets: [],
      isLoading: false,
      error: null,
      resultImages: [], 
      currentStep: 'UPLOAD',
    });
  };

  const resetAxoTab = () => {
    setAxoState({
      floorPlan: null,
      cornerPhotos: [],
      resultImage: null,
      analysisText: null,
      isLoading: false,
      error: null,
    });
  };

  const resetPanoramicTab = () => {
    setPanoramicState({
      floorPlan: null,
      perspectivePhotos: [],
      resultImage: null,
      aiReasoning: null,
      isLoading: false,
      error: null,
    });
  };

  const resetViewSyncTab = () => {
    setViewSyncState({
      sourceImage: null,
      resultImage: null,
      selectedViewId: VIEW_ANGLES[0].id,
      userPrompt: '',
      isLoading: false,
      error: null,
    });
  };

  const resetVideoGeneratorTab = () => {
    setVideoGeneratorState({
      originalImage: null,
      videoResult: null,
      selectedShotId: WEDDING_CAMERA_SHOTS[0].id,
      userPrompt: '',
      isLoading: false,
      error: null,
    });
  };

  const handleDeductCredits = async (cost: number, description: string) => {
    setUserCredits(prev => prev - cost);
    console.log(`Credits deducted: ${cost}. Remaining: ${userCredits - cost}. Action: ${description}`);
  };

  const handleTransferToUpscale = () => {
    if (generatedImage) {
      setActiveTool(Tool.UPSCALE);
      setUpscaleState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        upscaledImages: [], 
        error: null,
        isLoading: false,
      }));
    }
  };

  const handleTransferToAdvancedEdit = () => {
    if (generatedImage) {
      setActiveTool(Tool.ADVANCED_EDIT);
      setAdvancedEditState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        resultImage: null, 
        error: null,
        isLoading: false,
        editMode: 'NOTE', 
        refObject: null,
        annotatedBase64: null,
        clickPoint: null,
        detectedPoints: [],
        isAnnotating: false,
      }));
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-theme-base text-theme-text-main font-sans selection:bg-theme-gold selection:text-theme-base">
      
      {/* HEADER 1: BRANDING & CREDITS */}
      <header className="bg-theme-base border-b border-theme-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* LOGO MỚI */}
            <div className="w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 drop-shadow-md" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F5E6D8" />
                            <stop offset="50%" stopColor="#D9C5B4" />
                            <stop offset="100%" stopColor="#A69588" />
                        </linearGradient>
                    </defs>
                    <path d="M25 15 H 75 C 90 15 95 25 90 50 V 60" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M75 85 H 25 C 10 85 5 75 10 50 V 40" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M35 32 H 65 L 35 68 H 65" stroke="url(#logoGradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-theme-text-main">
              Luxe<span className="font-light opacity-80 text-theme-text-sub">Render</span>
            </h1>
          </div>
          
          {/* Credits Display */}
          <div className="flex items-center">
             <span className="text-sm font-normal text-theme-gold whitespace-nowrap bg-theme-surface px-4 py-2 rounded-lg border border-theme-gold/20 shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-theme-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Credits: {userCredits}
             </span>
          </div>
        </div>
      </header>

      {/* HEADER 2: NAVIGATION TABS (STICKY) */}
      <div className="sticky top-0 z-50 bg-theme-base/95 backdrop-blur-md border-b border-theme-gold/20 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide justify-start md:justify-center">
                {[
                    { 
                        id: Tool.RENDER, 
                        label: 'Render 3D', 
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    },
                    {
                        id: Tool.PANORAMIC_AXO, 
                        label: 'Toàn Cảnh 3D',
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    },
                    {
                        id: Tool.VIEW_SYNC, // New Tool
                        label: 'Đồng Bộ View',
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    },
                    {
                        id: Tool.VIDEO_GENERATOR, // New Tool
                        label: 'Tạo Phim',
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    },
                    { 
                        id: Tool.IDEA_GENERATOR, 
                        label: 'Ý Tưởng', 
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    },
                    { 
                        id: Tool.UPSCALE, 
                        label: 'Nâng Cấp', 
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    },
                    { 
                        id: Tool.ADVANCED_EDIT, 
                        label: 'Chỉnh Sửa', 
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    },
                    { 
                        id: Tool.SKETCH_CONVERTER, 
                        label: 'Phác Thảo', 
                        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    },
                ].map(tool => (
                    <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as Tool)}
                    className={`px-5 py-2 rounded-full text-sm font-normal transition-all whitespace-nowrap border flex items-center
                        ${activeTool === tool.id 
                        ? 'bg-theme-gold text-theme-base border-theme-gold shadow-[0_0_15px_rgba(217,197,180,0.3)]' 
                        : 'bg-transparent text-theme-text-sub border-transparent hover:bg-theme-surface hover:text-theme-gold hover:border-theme-gold/30'}
                    `}
                    >
                    {tool.icon && <span className="mr-2">{tool.icon}</span>}
                    {tool.label}
                    </button>
                ))}
            </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTool === Tool.RENDER && (
          <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
            
            {/* LEFT: Controls */}
            <div className="w-full lg:w-1/3 space-y-8 bg-theme-surface p-6 md:p-8 rounded-2xl shadow-2xl border border-theme-gold/10">
              <div>
                {/* Heading H2 -> text-lg font-normal */}
                <h2 className="text-lg font-normal text-theme-text-main mb-6 border-b border-theme-gold/10 pb-4">Thông Số Thiết Kế</h2>
                <div className="space-y-6">
                  
                  {/* 1. Upload */}
                  <div className="space-y-2">
                      {/* Label -> text-xs font-normal */}
                      <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                        Ảnh Gốc
                      </label>
                      <RenderImageUpload 
                        onImageUpload={handleSourceImageUpload} 
                        currentImage={sourceImage}
                        onAutoPromptGenerated={handleAutoPrompt}
                      />
                  </div>
                  
                  {/* TOGGLE: Chế độ Tùy chỉnh */}
                  <div className="flex items-center justify-between bg-theme-base p-3 rounded-xl border border-theme-gold/20">
                      <div className="flex flex-col">
                          {/* Body Default -> text-sm font-normal */}
                          <span className="text-sm font-normal text-theme-text-main uppercase tracking-wide">Tùy Chỉnh</span>
                          {/* Micro/Meta -> text-[11px] font-normal */}
                          <span className="text-[11px] text-theme-text-sub font-normal">Bật để chọn Hạng mục, Màu sắc, Vật liệu...</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={isCustomMode}
                              onChange={handleToggleCustomMode}
                          />
                          <div className="w-11 h-6 bg-theme-surface2 border border-theme-gold/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-theme-base after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-text-sub after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-gold peer-checked:after:bg-theme-base"></div>
                      </label>
                  </div>

                  {/* 2. Options (Conditional) */}
                  {isCustomMode && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-l-2 border-theme-gold/20 pl-4">
                        <OptionSelector
                            label="Hạng Mục"
                            options={WEDDING_CATEGORIES}
                            value={renderOptions.category}
                            onChange={(v) => handleOptionChange('category', v)}
                        />

                        <OptionSelector
                            label="Phong Cách"
                            options={WEDDING_STYLES}
                            value={renderOptions.style}
                            onChange={(v) => handleOptionChange('style', v)}
                        />

                        <OptionSelector
                            label="Bảng Màu"
                            options={COLOR_PALETTES}
                            value={renderOptions.colorPalette}
                            onChange={(v) => handleOptionChange('colorPalette', v)}
                        />

                        <OptionSelector
                            label="Vật Liệu Bề Mặt"
                            options={SURFACE_MATERIALS}
                            value={renderOptions.surfaceMaterial}
                            onChange={(v) => handleOptionChange('surfaceMaterial', v)}
                        />

                        <OptionSelector
                            label="Vật Liệu Vải"
                            options={TEXTILE_MATERIALS}
                            value={renderOptions.textileMaterial}
                            onChange={(v) => handleOptionChange('textileMaterial', v)}
                        />

                        {/* New Conditional Textile Color Selectors */}
                        {renderOptions.textileMaterial !== 'none' && (
                            <>
                            <OptionSelector
                                label="Màu Sắc Chính (Vải)"
                                options={TEXTILE_COLORS}
                                value={renderOptions.textileColor1}
                                onChange={(v) => handleOptionChange('textileColor1', v)}
                            />
                            <OptionSelector
                                label="Màu Sắc Phụ (Vải)"
                                options={TEXTILE_COLORS}
                                value={renderOptions.textileColor2}
                                onChange={(v) => handleOptionChange('textileColor2', v)}
                            />
                            </>
                        )}
                      </div>
                  )}

                  {/* --- PHOTOGRAPHY CONTROLS TOGGLE --- */}
                  <div className="flex items-center justify-between bg-theme-base p-3 rounded-xl border border-theme-gold/20 mt-6">
                      <div className="flex flex-col">
                          <span className="text-sm font-normal text-theme-text-main uppercase tracking-wide">Nâng Cấp Nhiếp Ảnh</span>
                          <span className="text-[11px] text-theme-text-sub font-normal">Tiêu cự, lấy nét AI & ánh sáng</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={isPhotoSettingsOpen}
                              onChange={() => setIsPhotoSettingsOpen(!isPhotoSettingsOpen)}
                          />
                          <div className="w-11 h-6 bg-theme-surface2 border border-theme-gold/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-theme-base after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-text-sub after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-gold peer-checked:after:bg-theme-base"></div>
                      </label>
                  </div>

                  {/* --- PHOTOGRAPHY CONTROLS CONTENT --- */}
                  {isPhotoSettingsOpen && (
                    <div className="p-4 bg-theme-base rounded-xl border border-theme-gold/20 mt-2 animate-in fade-in slide-in-from-top-2">
                        {/* Toggle AI Auto-Focus */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                {/* Body Default -> text-sm font-normal */}
                                <span className="font-normal block text-sm text-theme-text-main">AI Auto-Focus</span>
                                {/* Micro/Meta -> text-[11px] font-normal */}
                                <small className="text-[11px] text-theme-text-sub font-normal">Tự động lấy nét nghệ thuật</small>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={renderOptions.isAutoFocus}
                                    onChange={() => handleOptionChange('isAutoFocus', !renderOptions.isAutoFocus)}
                                />
                                <div className="w-11 h-6 bg-theme-surface2 border border-theme-gold/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-theme-base after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-gold after:border-theme-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-gold/20 peer-checked:border-theme-gold"></div>
                            </label>
                        </div>

                        {/* Chọn Style Ống kính */}
                        <div className="mb-2">
                            <OptionSelector
                                label="Chế độ Ống kính"
                                options={Object.entries(PHOTOGRAPHY_PRESETS).map(([key, val]) => ({
                                    value: key,
                                    label: val.label,
                                    description: val.description
                                }))}
                                value={renderOptions.cameraPreset}
                                onChange={(v) => handleOptionChange('cameraPreset', v)}
                                variant="grid"
                            />
                        </div>
                    </div>
                  )}

                  {/* 3. Text Area */}
                  <div className="space-y-2">
                      {/* Label -> text-xs font-normal */}
                      <label className="block text-xs font-normal text-theme-text-sub uppercase tracking-widest">
                        Chi Tiết Cụ Thể
                      </label>
                      <textarea 
                        className="w-full p-3 bg-theme-base border border-theme-gold/20 rounded-xl text-theme-text-main placeholder-theme-text-sub/50 focus:ring-1 focus:ring-theme-gold focus:border-theme-gold outline-none transition-all resize-none text-sm"
                        rows={3}
                        placeholder="Ví dụ: Thêm đèn chùm pha lê, đảm bảo lối đi có hiệu ứng phản chiếu, bỏ khăn phủ ghế..."
                        value={renderOptions.additionalPrompt}
                        onChange={(e) => handleOptionChange('additionalPrompt', e.target.value)}
                      />
                  </div>

                  {/* 4. Image Count Selector */}
                  <div className="flex items-center justify-between bg-theme-base p-3 rounded-xl border border-theme-gold/20">
                      <div className="flex flex-col">
                          <span className="text-sm font-normal text-theme-text-main uppercase tracking-wide">Số Lượng Ảnh</span>
                          <span className="text-[11px] text-theme-text-sub font-normal">Chọn số lượng phương án (1-4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                          {[1, 2, 3, 4].map((count) => (
                              <button
                                  key={count}
                                  onClick={() => handleOptionChange('imageCount', count)}
                                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center border
                                      ${renderOptions.imageCount === count
                                          ? 'bg-theme-gold text-theme-base border-theme-gold shadow-md'
                                          : 'bg-theme-surface2 text-theme-text-sub border-theme-gold/10 hover:border-theme-gold/50 hover:text-theme-gold'}
                                  `}
                              >
                                  {count}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* 5. Action Button: Primary (text-sm, py-3, font-normal) */}
                  <button
                    onClick={handleGenerate}
                    disabled={!sourceImage || appState === AppState.GENERATING}
                    className={`w-full py-3 px-6 rounded-xl font-normal text-theme-base tracking-widest shadow-lg transition-all transform hover:-translate-y-1 text-sm
                      ${!sourceImage || appState === AppState.GENERATING 
                          ? 'bg-theme-surface2 text-theme-text-sub cursor-not-allowed border border-theme-gold/10' 
                          : 'bg-theme-gold hover:bg-white hover:shadow-[0_0_20px_rgba(217,197,180,0.4)]'
                        }
                    `}
                  >
                    {appState === AppState.GENERATING ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-theme-base" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ĐANG TẠO RENDER...
                      </span>
                    ) : 'HIỆN THỰC HÓA KHÔNG GIAN'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Display */}
            <div className="w-full lg:w-2/3 h-full min-h-[700px] bg-theme-surface rounded-2xl shadow-2xl border border-theme-gold/10 p-3 relative overflow-hidden flex flex-col">
              
              {appState === AppState.IDLE && !sourceImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-text-sub bg-theme-base/50">
                    <svg className="w-24 h-24 mb-6 opacity-30 text-theme-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xl font-light italic text-theme-text-main">Tuyệt tác của bạn bắt đầu từ đây.</p>
                    <p className="text-sm mt-2 opacity-70">Tải lên một bản phác thảo để bắt đầu tạo render.</p>
                </div>
              )}

              {appState === AppState.IDLE && sourceImage && (
                <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden backdrop-blur-sm border border-theme-gold/5">
                    <img src={sourceImage.objectURL} alt="Nguồn" className="max-w-full max-h-[650px] object-contain shadow-2xl" />
                </div>
              )}

              {appState === AppState.GENERATING && (
                <div className="absolute inset-0 z-20 bg-theme-base/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold/20 rounded-full animate-ping opacity-50"></div>
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold rounded-full animate-spin border-t-transparent shadow-[0_0_20px_rgba(217,197,180,0.5)]"></div>
                    </div>
                    <h3 className="mt-8 text-xl font-normal text-theme-gold tracking-widest">AI ĐANG XỬ LÝ...</h3>
                    <p className="text-theme-text-sub mt-2 text-sm">Đang áp dụng vật liệu, ánh sáng và sắp xếp hoa.</p>
                </div>
              )}

              {appState === AppState.SUCCESS && generatedImage && sourceImage?.objectURL && (
                  <div className="h-full flex flex-col gap-4">
                    <div className="flex-1 min-h-0 bg-black/20 rounded-xl overflow-hidden border border-theme-gold/10 relative">
                        <ImageComparator 
                        originalImage={sourceImage.objectURL || ''} 
                        generatedImage={generatedImage} 
                        />
                        
                        {/* Image Selector Overlay */}
                        {generatedImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 z-10">
                                {generatedImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center border
                                            ${selectedImageIndex === idx
                                                ? 'bg-theme-gold text-theme-base border-theme-gold shadow-lg scale-110'
                                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}
                                        `}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center gap-4 py-2">
                      <a 
                        href={generatedImage} 
                        download="wedding-render-8k.png"
                        /* Secondary Buttons: text-xs, py-2, font-normal */
                        className="px-5 py-2 bg-theme-gold text-theme-base rounded-full text-xs font-normal hover:bg-white transition-all shadow-lg flex items-center gap-2 border border-transparent"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Tải Render
                      </a>
                      <button 
                        onClick={handleTransferToUpscale}
                        className="px-5 py-2 bg-theme-surface2 text-theme-gold border border-theme-gold/30 rounded-full text-xs font-normal hover:bg-theme-gold hover:text-theme-base transition-all shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101M12 12l-2 2" /></svg>
                        Nâng Cấp
                      </button>
                      <button 
                        onClick={handleTransferToAdvancedEdit}
                        className="px-5 py-2 bg-theme-surface2 text-theme-gold border border-theme-gold/30 rounded-full text-xs font-normal hover:bg-theme-gold hover:text-theme-base transition-all shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Chỉnh Sửa
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        )}

        {activeTool === Tool.PANORAMIC_AXO && (
          <PanoramicAxoTool
            state={panoramicState}
            onStateChange={(newState) => setPanoramicState(prev => ({ ...prev, ...newState }))}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetPanoramicTab}
          />
        )}

        {activeTool === Tool.AXONOMETRIC && (
          <AxonometricTool 
            state={axoState}
            onStateChange={(newState) => setAxoState(prev => ({ ...prev, ...newState }))}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetAxoTab}
          />
        )}

        {activeTool === Tool.VIEW_SYNC && (
          <ViewSyncTool 
            state={viewSyncState}
            onStateChange={(newState) => setViewSyncState(prev => ({ ...prev, ...newState }))}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetViewSyncTab}
          />
        )}

        {activeTool === Tool.VIDEO_GENERATOR && (
          <div className="space-y-6">
            {/* Video Mode Tabs */}
            <div className="flex justify-center">
              <div className="bg-theme-surface p-1 rounded-lg border border-theme-gold/20 inline-flex">
                <button
                  onClick={() => setVideoMode('single')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    videoMode === 'single'
                      ? 'bg-theme-gold text-theme-base shadow-md'
                      : 'text-theme-text-sub hover:text-theme-gold'
                  }`}
                >
                  Tạo Video (Đơn)
                </button>
                <button
                  onClick={() => setVideoMode('sequence')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    videoMode === 'sequence'
                      ? 'bg-theme-gold text-theme-base shadow-md'
                      : 'text-theme-text-sub hover:text-theme-gold'
                  }`}
                >
                  Chuỗi Video (Storyboard)
                </button>
              </div>
            </div>

            {videoMode === 'single' ? (
              <VideoGenerator
                state={videoGeneratorState}
                onStateChange={(newState) => setVideoGeneratorState(prev => ({ ...prev, ...newState }))}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
              />
            ) : (
              <VideoSequenceGenerator />
            )}
          </div>
        )}

        {activeTool === Tool.IDEA_GENERATOR && (
            <IdeaGenerator
                state={ideaState}
                onStateChange={handleIdeaStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetIdeaTab}
            />
        )}

        {activeTool === Tool.UPSCALE && (
          <Upscale 
            state={upscaleState}
            onStateChange={handleUpscaleStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetUpscaleTab}
          />
        )}

        {activeTool === Tool.ADVANCED_EDIT && (
          <AdvancedEdit 
            state={advancedEditState}
            onStateChange={handleAdvancedEditStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetAdvancedEditTab}
          />
        )}

        {activeTool === Tool.SKETCH_CONVERTER && (
            <SketchConverter 
                state={sketchState} 
                onStateChange={handleSketchStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetSketchTab}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-theme-surface border-t border-theme-gold/10 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-theme-text-sub text-sm">
          <p>© 2024 LuxeRender. Được hỗ trợ bởi Google Gemini AI.</p>
          <div className="flex justify-center gap-4 mt-2 opacity-50">
             <span>Chính sách bảo mật</span> • <span>Điều khoản sử dụng</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
