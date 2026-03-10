
export interface FileData {
  base64: string;
  mimeType: string;
  file?: File;
  objectURL?: string;
  width?: number; // New: width of the image
  height?: number; // New: height of the image
}

export interface OptionItem {
  value: string;
  label: string;
  description?: string;
}

// New Idea Generator Types
export interface IdeaAsset {
  id: string;
  x: number; // Percentage coordinate 0-100 (Top-Left)
  y: number; // Percentage coordinate 0-100 (Top-Left)
  width: number; // Percentage width 0-100
  height: number; // Percentage height 0-100
  rotation: number; // Degrees 0-360
  aspectRatio: number; // width / height ratio of the asset image
  image: FileData | null;
  label: string;
}

export interface RenderOptions {
  category: string;
  style: string;
  colorPalette: string;
  surfaceMaterial: string; // New: specific surface material
  textileMaterial: string; // New: specific textile material
  textileColor1: string; // New: primary textile color
  textileColor2: string; // New: secondary textile color
  additionalPrompt: string;
  hiddenAIContext?: string; // New: Hidden AI analysis context
  isAutoFocus: boolean; // New: AI Photography Auto-Focus
  cameraPreset: string; // New: Photography Lens Preset Key
  assets?: IdeaAsset[]; // New: List of spatial assets
  imageCount: number; // New: Number of images to generate
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum Tool {
  RENDER = 'render',
  AXONOMETRIC = 'axonometric', // Tool cũ (có mặt bằng)
  PANORAMIC_AXO = 'panoramic_axo', // <-- TOOL MỚI (Chỉ từ ảnh góc)
  IDEA_GENERATOR = 'idea_generator',
  UPSCALE = 'upscale',
  ADVANCED_EDIT = 'advanced_edit',
  SKETCH_CONVERTER = 'sketch_converter',
  VIEW_SYNC = 'view_sync',
  VIDEO_GENERATOR = 'video_generator' // NEW: Tạo Phim
}

export type Resolution = '1K' | '2K' | '4K';

export interface UpscaleState {
  sourceImage: FileData | null;
  isLoading: boolean;
  error: string | null;
  upscaledImages: string[];
  resolution: Resolution;
}

export interface UpscaleProps {
  state: UpscaleState;
  onStateChange: (newState: Partial<UpscaleState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New AdvancedEdit state and props
export type EditMode = 'NOTE' | 'SWAP';

export interface ClickPoint {
  x: number;
  y: number;
}

export interface AdvancedEditState {
  sourceImage: FileData | null;
  editMode: EditMode;
  refObject: FileData | null; // For SWAP mode
  annotatedBase64: string | null; // For NOTE mode (base64 of image with annotations)
  clickPoint: ClickPoint | null; // For SWAP mode (single point reference for detection/swap)
  detectedPoints: ClickPoint[]; // New: List of automatically detected similar objects
  resultImage: string | null; // AI generated result
  isLoading: boolean;
  error: string | null;
  isAnnotating: boolean; // Controls whether AnnotationCanvas is visible
  additionalPrompt?: string; // New: Optional user text prompt for edits
}

export interface AdvancedEditProps {
  state: AdvancedEditState;
  onStateChange: (newState: Partial<AdvancedEditState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New Sketch Converter types
export type SketchStyle = 'pencil' | 'charcoal' | 'watercolor' | 'architectural';

export interface SketchConverterState {
  sourceImage: FileData | null;
  resultImage: string | null;
  isLoading: boolean;
  error: string | null;
  sketchStyle: SketchStyle;
  resolution: Resolution;
}

export interface SketchConverterProps {
  state: SketchConverterState;
  onStateChange: (newState: Partial<SketchConverterState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

export type IdeaStep = 'UPLOAD' | 'STRUCTURE_RESULT' | 'DECOR_SETUP' | 'FINAL_RESULT';

export interface IdeaGeneratorState {
  sourceSketch: FileData | null;
  referenceStyle: FileData | null; // New: Reference image for materials
  baseImage: string | null; // New: Result of Pass 1 (Structure)
  assets: IdeaAsset[];
  isLoading: boolean;
  error: string | null;
  resultImages: string[]; // Updated: Array of results
  currentStep: IdeaStep;
}

export interface IdeaGeneratorProps {
  state: IdeaGeneratorState;
  onStateChange: (newState: Partial<IdeaGeneratorState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// NEW: Axonometric Types (Existing)
export interface AxonometricState {
  floorPlan: FileData | null;
  cornerPhotos: FileData[];
  resultImage: string | null;
  analysisText: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AxonometricProps {
  state: AxonometricState;
  onStateChange: (newState: Partial<AxonometricState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// Thêm interface mới lưu trữ tọa độ Không gian
export interface CornerPhotoWithLocation {
  fileData: FileData;
  x: number; // Tọa độ X trên mặt bằng (%)
  y: number; // Tọa độ Y trên mặt bằng (%)
  rotation: number; // Hướng nhìn Camera (độ)
}

// Cập nhật PanoramicAxoState
export interface PanoramicAxoState {
  floorPlan: FileData | null; // MỚI: Ảnh Mặt Bằng
  perspectivePhotos: CornerPhotoWithLocation[]; // THAY ĐỔI: Chuyển từ mảng FileData sang mảng có tọa độ
  resultImage: string | null;
  aiReasoning: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface PanoramicAxoProps {
  state: PanoramicAxoState;
  onStateChange: (newState: Partial<PanoramicAxoState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// Support for EventAxonometric.tsx (Single Image + Text flow)
export interface EventAxonometricState {
  sourceImage: FileData | null;
  eventDescription: string;
  resultImage: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface EventAxonometricProps {
  state: EventAxonometricState;
  onStateChange: (newState: Partial<EventAxonometricState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
}

// New ViewSync Types
export interface ViewOption {
  id: string;
  label: string;
  description: string;
  prompt_suffix: string;
  strength?: number;
  guidance?: string; // New field
}

export interface ViewSyncState {
  sourceImage: FileData | null;
  resultImage: string | null;
  selectedViewId: string;
  userPrompt: string;
  isLoading: boolean;
  error: string | null;
}

export interface ViewSyncProps {
  state: ViewSyncState;
  onStateChange: (newState: Partial<ViewSyncState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

export interface VideoGeneratorState {
  originalImage: FileData | null;
  videoResult: string | null;
  selectedShotId: string;
  userPrompt: string;
  isLoading: boolean;
  error: string | null;
}

export interface VideoGeneratorProps {
  state: VideoGeneratorState;
  onStateChange: (newState: Partial<VideoGeneratorState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
}

export interface VideoScene {
  id: string;
  image: string | null;
  prompt: string;
  shotType: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}


// Annotation Types for AnnotationCanvas
export type AnnotationTool = 'brush' | 'arrow' | 'text';

export interface StrokeAnnotation {
  type: 'brush';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface ArrowAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export interface TextAnnotation {
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  fontFamily: string;
}

export type Annotation = StrokeAnnotation | ArrowAnnotation | TextAnnotation;
