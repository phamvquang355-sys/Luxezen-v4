import { GoogleGenAI, Type } from "@google/genai";
import { FileData, RenderOptions, Resolution, EditMode, ClickPoint, SketchStyle, IdeaAsset, CornerPhotoWithLocation, ViewOption } from "../types"; 
import { PHOTOGRAPHY_PRESETS, STRUCTURE_FIDELITY_PROMPT, REALISM_MODIFIERS } from "../constants";

const WEDDING_MATERIALS_KEYWORDS = {
  // These are now examples or fallbacks, as actual values will come from options
  florals: "high-density fresh white hydrangeas and roses, hanging wisteria, lush greenery",
  lighting: "cinematic volumetric lighting, warm amber ambient glow, professional stage spotlights, Tyndall effect"
};

// ... (keep all existing constants and helpers like resizeAndCompressImage, getEmpowermentPrompt, generatePromptFromImageAndText, generateRenderPrompt) ...
// 1. Thêm hằng số định nghĩa quy tắc bố cục nghiêm ngặt
const COMPOSITION_RULE_PROMPT = `
=== CAMERA & COMPOSITION RULES (NON-NEGOTIABLE) ===
1. PRESERVE FRAMING: Do NOT crop, zoom, or change the camera angle. The output image must match the exact field of view of the source sketch.
2. SAFE ZONE ENFORCEMENT: 
   - Maintain the subject within the central 80% of the width (leaving 10% padding on Left/Right).
   - Maintain the subject within the vertical 70% (leaving 10% padding Top, 20% padding Bottom).
3. NEGATIVE SPACE: Respect the whitespace/background in the sketch. Do not fill the entire frame if the sketch implies empty space.
===================================================
`;

// 2. Thêm Prompt chuyên dụng cho việc render lại ảnh ghép (Bước 2)
const REALISTIC_BLENDING_PROMPT = `
You are an expert Architectural Visualizer and Post-Production Artist.

INPUT DATA:
- An image containing a room background with decor objects pasted on top of it.
- This creates a "collage" look where objects may look flat, floating, or have jagged edges.

YOUR TASK:
Transform this rough composite image into a single, high-end, photorealistic photograph.

STRICT GUIDELINES:
1. **GEOMETRY LOCK (CRITICAL):** Do NOT move, resize, add, or remove any objects. The objects are already placed exactly where the user wants them. Your job is ONLY to improve their appearance.
2. **LIGHTING INTEGRATION:** Analyze the light direction from the original room (windows, lamps). Generate realistic CAST SHADOWS for the pasted objects onto the floor and walls.
3. **COLOR MATCHING:** Adjust the color temperature, exposure, and contrast of the pasted objects so they perfectly match the room's environment.
4. **EDGE REFINEMENT:** Remove the sharp "cut-out" edges of the pasted objects. Blend them naturally with the background.
5. **REFLECTION:** If the floor is shiny/reflective, generate correct reflections of the decor objects on the floor.

OUTPUT:
- A high-resolution, photorealistic image.
`;

/**
 * Resize and compress an image to optimize for upload speed and API cost.
 */
export const resizeAndCompressImage = (
  file: File, 
  maxWidth: number = 1024, 
  quality: number = 0.8
): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D rendering context for canvas."));
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ 
          base64: dataUrl.split(',')[1], 
          mimeType: 'image/jpeg',
          width: width,
          height: height
        }); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const getEmpowermentPrompt = (selections: RenderOptions): string => {
  const autoInstructions: string[] = [];
  if (selections.category === 'none') {
    autoInstructions.push("- PHÂN TÍCH CẤU TRÚC GỐC: Nhận diện chính xác vị trí các vật thể hiện hữu. Tuyệt đối không thêm thắt các khối kiến trúc làm thay đổi bố cục gốc.");
  }
  if (selections.style === 'none') {
    autoInstructions.push("- TRÍCH XUẤT PHONG CÁCH: Phân tích các đường nét kiến trúc sẵn có trong ảnh (ví dụ: phào chỉ cổ điển, nét thẳng hiện đại) để render vật liệu đồng nhất với ngôn ngữ đó.");
  }
  if (selections.colorPalette === 'none') {
    autoInstructions.push("- BẢO TỒN BẢNG MÀU (STRICT COLOR MATCH): Thực hiện lấy mẫu màu trực tiếp từ hình ảnh gốc. Nếu ảnh gốc có tông màu vàng kem và gỗ, bản render phải sử dụng chính xác mã màu đó. Tuyệt đối không tự ý thay đổi tone màu chủ đạo.");
  }
  if (selections.surfaceMaterial === 'none') {
    autoInstructions.push("- NÂNG CẤP VẬT LIỆU THỰC TẾ (MATERIAL ENHANCEMENT): Xác định vật liệu hiện có (ví dụ: sàn gạch, vải lụa, kim loại). Thay vì thay thế, hãy tập trung vào việc làm nét (upscale) vân bề mặt, thêm độ phản chiếu (reflection) và độ bóng (glossiness) dựa trên bản chất vật liệu gốc.");
  }
  if (selections.textileMaterial === 'none') {
    autoInstructions.push("- TỐI ƯU VẬT LIỆU VẢI: Phân tích các loại vải hiện có (ví dụ: rèm, khăn trải bàn) và nâng cấp chúng lên chất liệu cao cấp (lụa óng ánh, nhung dày, voan mỏng) phù hợp với bối cảnh tổng thể.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor1 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC CHÍNH VẢI: AI sẽ chọn màu sắc chính hài hòa với vật liệu vải và bảng màu tổng thể.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor2 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC PHỤ VẢI: AI sẽ chọn màu sắc phụ hài hòa với vật liệu vải và bảng màu tổng thể, tạo điểm nhấn tinh tế.");
  }

  if (autoInstructions.length === 0) return "";

  return `
--- CHẾ ĐỘ AI TUÂN THỦ TỐI ĐA (STRICT ADHERENCE MODE) ---
Nhiệm vụ của bạn là 'Diễn họa phục hồi'. Hãy coi hình ảnh gốc là tiêu chuẩn vàng về màu sắc và vật liệu:
${autoInstructions.join('\n')}
MỤC TIÊU: Tạo ra bản render 8k siêu thực nhưng khi đặt cạnh ảnh gốc, người xem phải thấy sự đồng nhất 100% về màu sắc và linh hồn của vật liệu.
-------------------------------------------------------
  `;
};

export const generatePromptFromImageAndText = async (
  image: FileData, 
  instruction: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: instruction },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } }
        ]
      },
      config: { temperature: 0.4 }
    });

    return response.text || "Không thể phân tích ảnh.";
  } catch (error) {
    console.error("Auto-Prompt Generation Error:", error);
    throw error;
  }
};

export const generateRenderPrompt = (
  basePrompt: string, 
  style: string, 
  isAutoFocus: boolean,
  presetKey: string
) => {
  const preset = PHOTOGRAPHY_PRESETS[presetKey as keyof typeof PHOTOGRAPHY_PRESETS] || PHOTOGRAPHY_PRESETS.CINEMATIC;
  const focusPrompt = isAutoFocus 
    ? "AI AUTOMATIC FOCUS: Identify the most prominent decorative element and apply a sharp photographic focus to it, creating a natural depth of field."
    : "MANUAL FOCUS: Keep the sharpness consistent across the designated focal area.";

  return `
    IMAGE TYPE: Wedding Design Render.
    CORE INSTRUCTION: ${STRUCTURE_FIDELITY_PROMPT}
    
    SUBJECT DESCRIPTION: ${basePrompt}.
    VISUAL STYLE: ${style}.
    PHOTOGRAPHY SETTINGS: ${preset.prompt}.
    FOCUS CONTROL: ${focusPrompt}.
    
    QUALITY STANDARDS: ${REALISM_MODIFIERS}.
    
    FINAL NOTE: Ensure the materials like glass, silk, and flowers look authentic under the specified lighting.
  `;
};

export const generateWeddingRender = async (
  sourceImage: FileData,
  options: RenderOptions
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const empowermentPrompt = getEmpowermentPrompt(options);
  const spatialPrompt = ""; 

  let masterPrompt = "";
  let textileDetails = '';
  if (options.textileMaterial !== 'none') {
    textileDetails += options.textileMaterial;
    if (options.textileColor1 !== 'none' && options.textileColor2 !== 'none') {
      textileDetails += ` in a primary color of ${options.textileColor1} and a secondary color of ${options.textileColor2}`;
    } else if (options.textileColor1 !== 'none') {
      textileDetails += ` in ${options.textileColor1}`;
    } else if (options.textileColor2 !== 'none') {
      textileDetails += ` with accents of ${options.textileColor2}`;
    }
  } else {
    textileDetails = 'appropriate luxury fabrics and draping based on context';
  }

  const baseDescription = `
    Analyze this wedding sketch/3D base.
    CONTEXT: ${options.category !== 'none' ? options.category : 'wedding event space'}.
    STYLE: ${options.style !== 'none' ? options.style : 'high-end luxury wedding'}.
    PALETTE: ${options.colorPalette !== 'none' ? options.colorPalette : 'harmonious elegant palette'}.
    MATERIALS: ${options.surfaceMaterial !== 'none' ? options.surfaceMaterial : 'appropriate luxury materials based on context'} for flooring and prominent surfaces.
    TEXTILE MATERIALS: ${textileDetails}.
    FLORALS: ${WEDDING_MATERIALS_KEYWORDS.florals}.
    LIGHTING: ${WEDDING_MATERIALS_KEYWORDS.lighting}.
    USER DETAILS: ${options.additionalPrompt}.
    ${empowermentPrompt}
    ${spatialPrompt}
  `;

  if (options.hiddenAIContext) {
      console.log("Step 1: Using Mixed Prompt Strategy (Hidden Context Available)...");
      masterPrompt = generateRenderPrompt(
          `${baseDescription}\nCONTEXTUAL ANALYSIS FROM SOURCE: ${options.hiddenAIContext}`,
          options.style,
          options.isAutoFocus,
          options.cameraPreset
      );
  } else {
      console.log("Step 1: Analyzing structure with Gemini Flash (Fallback)...");
      const analysisPrompt = `
        ${baseDescription}
        1. Identify the exact perspective: (e.g., eye-level, wide angle).
        2. Identify structural anchors: (e.g., center aisle, stage placement, ceiling height).
        3. Generate a comprehensive description of the scene that can be used to re-render it photorealistically.
        
        Return ONLY the description.
      `;

      try {
          const reasoningResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: analysisPrompt },
                    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
                ]
            },
            config: { temperature: 0.2 }
          });
          
          const sceneDescription = reasoningResponse.text || baseDescription;
          masterPrompt = generateRenderPrompt(
              sceneDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      } catch (e) {
          console.warn("Reasoning step failed, falling back to basic prompt", e);
          masterPrompt = generateRenderPrompt(
              baseDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      }
  }

  try {
    const generatedImages: string[] = [];
    const count = options.imageCount || 1;

    for (let i = 0; i < count; i++) {
        const renderResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [
              { text: masterPrompt },
              { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
            ]
          },
          config: {
            systemInstruction: "You are a specialized 3D Wedding Visualizer. Transform the input sketch into a photorealistic render following the prompt exactly."
          }
        });

        if (renderResponse.candidates && renderResponse.candidates.length > 0) {
            const content = renderResponse.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        generatedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }
            }
        }
    }

    if (generatedImages.length > 0) {
        return generatedImages;
    }
    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateHighQualityImage = async (
  prompt: string,
  resolution: Resolution,
  sourceImage: { mimeType: string; base64: string; width?: number; height?: number } 
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contentsParts = [];
  contentsParts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
  contentsParts.push({ text: prompt });

  const aspectRatio = sourceImage.width && sourceImage.height
    ? getSupportedAspectRatio(sourceImage.width, sourceImage.height)
    : "16:9";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: contentsParts },
      config: {
        imageConfig: { aspectRatio: aspectRatio, imageSize: resolution },
        systemInstruction: "You are an expert image upscaler..."
      },
    });

    const generatedImageUrls: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }
      }
    }
    if (generatedImageUrls.length === 0) throw new Error("No image data returned.");
    return generatedImageUrls;
  } catch (error) {
    console.error("Gemini High Quality Image Generation Error:", error);
    throw error;
  }
};

// ... (keep generateAdvancedEdit, detectSimilarObjects, generateSketch) ...
export const generateAdvancedEdit = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  editMode: EditMode,
  secondaryImageData?: { base64: string; mimeType: string }, 
  targetClickPoints?: ClickPoint[], 
  additionalPrompt?: string 
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } }];
  let systemInstruction = "";
  let userPrompt = "";

  if (editMode === 'NOTE') {
    if (!secondaryImageData) throw new Error("Annotated image data is required for 'NOTE' mode.");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const userInstructionText = additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : "Follow the visual annotations.";
    userPrompt = `TASK: PHOTOREALISTIC IMAGE EDITING... ${userInstructionText}`;
    systemInstruction = "You are an AI image editor...";
  } else if (editMode === 'SWAP') {
    if (!secondaryImageData || !targetClickPoints || targetClickPoints.length === 0) throw new Error("Reference object image and target click points are required.");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const clickPointsDescription = targetClickPoints.map(p => `(X:${p.x}%, Y:${p.y}%)`).join(', ');
    userPrompt = `TASK: PHOTOREALISTIC OBJECT REPLACEMENT... Coords: ${clickPointsDescription}`;
    systemInstruction = "You are an AI specializing in precise object replacement...";
  }

  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: parts }, 
      config: { systemInstruction: systemInstruction }
    });
    if (response.candidates && response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Advanced Edit Error:", error);
    throw error;
  }
};

export const detectSimilarObjects = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  detectionPrompt: string,
): Promise<ClickPoint[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: detectionPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER }
            },
            required: ["x", "y"]
          }
        },
        systemInstruction: "You are an expert object detection AI..."
      }
    });
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("No JSON response.");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Object Detection Error:", error);
    throw error;
  }
};

export const generateSketch = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  style: SketchStyle,
  resolution: Resolution
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';
  const finalPrompt = `Professional high-speed ${style} sketch conversion...`;
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: finalPrompt }
        ]
      },
    });
    if (response.candidates && response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData?.data) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No sketch/render generated.");
  } catch (error) {
    console.error("Gemini Sketch Generation Error:", error);
    throw error;
  }
};

const getSupportedAspectRatio = (width: number, height: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
  const ratio = width / height;
  if (ratio > 1.5) return "16:9"; 
  if (ratio > 1.0) return "4:3";
  if (ratio < 0.6) return "9:16";
  if (ratio < 1.0) return "3:4";
  return "1:1";
};

// ... (keep generateIdeaStructure, generateIdeaDecor, autoGenerateAxonometric, generateAxonometricView, generatePanoramicAxonometric) ...
export const generateIdeaStructure = async (
  sketchImage: FileData,
  referenceStyle: FileData | null,
  imageCount: number = 1,
  onStatusUpdate?: (status: string) => void
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang xây dựng khung sườn kiến trúc 3D...");

  const structurePrompt = `
    ROLE: Professional Event Constructor & 3D Visualizer.
    TASK: Convert this SKETCH (Input 1) into a photorealistic architectural base (Empty Room) following strict stage design rules.
    
    CRITICAL INSTRUCTIONS FOR STAGE 1 (STRUCTURE & COMPOSITION):
      
    1. CAMERA ANGLE (GÓC MÁY):
    - TYPE: **Dead-center Frontal Shot** (Góc chụp chính diện tuyệt đối).
    - PERSPECTIVE: **Elevation View** (Mặt đứng). The camera must be placed exactly on the center axis facing the stage flatly. No Dutch angles, no side angles.
    - SYMMETRY: Ensure perfect symmetry if the sketch implies it.

    2. COMPOSITION & PROPORTIONS (BỐ CỤC):
    - HORIZONTAL FILL: The stage design must occupy **85% of the image width**. Minimal negative space on sides (hoành tráng).
    - VERTICAL LAYOUT (STRICT):
      * **Bottom 20%**: Glossy Black Floor (Sàn đen bóng).
      * **Middle 70%**: The main Stage Structure (Frame, Walls, Decor foundations).
      * **Top 10%**: Ceiling/Background void (Starry curtain).
    
    3. MANDATORY ENVIRONMENT:
    - FLOOR: High-gloss black reflection floor.
    - BACKGROUND: Black velvet curtains with LED starlight effect.
    
    4. MATERIAL APPLICATION:
    - Apply the user's requested style (from Reference Image if provided) ONLY to the structural elements (arches, walls, catwalk) defined in the sketch.

    5. NEGATIVE INSTRUCTIONS:
    - Do NOT crop the sketch edges.
    - Do NOT add random furniture/props yet (wait for Phase 2).
    
    Output: Photorealistic 8k render of the architectural base.
  `;

  const parts: any[] = [
    { text: structurePrompt },
    { inlineData: { mimeType: sketchImage.mimeType, data: sketchImage.base64 } }
  ];

  if (referenceStyle) {
    parts.push({ inlineData: { mimeType: referenceStyle.mimeType, data: referenceStyle.base64 } });
  }

  try {
    const images: string[] = [];

    // Loop to generate multiple variations if needed
    for (let i = 0; i < imageCount; i++) {
        if (onStatusUpdate && imageCount > 1) onStatusUpdate(`Đang tạo khung sườn ${i + 1}/${imageCount}...`);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: parts },
            config: {
                systemInstruction: "You are a specialized 3D Architectural Visualizer. Your goal is to create a realistic 'blank canvas' room based on a sketch."
            }
        });

        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }
            }
        }
    }

    if (images.length === 0) throw new Error("No structure image generated.");
    return images;
  } catch (error) {
    console.error("Gemini Idea Structure Error:", error);
    throw error;
  }
};

export const generateIdeaDecor = async (
  compositeImageBase64: string, // Changed from background + assets list
  compositeImageMimeType: string,
  imageCount: number, 
  onStatusUpdate?: (status: string) => void
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang hoàn thiện bản phối cảnh cuối cùng...");

  // Use the realistic blending prompt
  const decorPrompt = REALISTIC_BLENDING_PROMPT;
  
  // Use a high-quality model for final rendering/blending
  const modelName = 'gemini-3-pro-image-preview'; 

  const parts: any[] = [
    { text: decorPrompt },
    { inlineData: { mimeType: compositeImageMimeType, data: compositeImageBase64 } }
  ];

  try {
    const images: string[] = [];
    
    for (let i = 0; i < imageCount; i++) {
        if (onStatusUpdate && imageCount > 1) onStatusUpdate(`Đang tạo phương án ${i + 1}/${imageCount}...`);
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: parts },
            config: {
                systemInstruction: "You are an expert Image Compositor and Decorator. Your goal is to blend objects seamlessly into a scene."
            }
        });

        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }
            }
        }
    }

    if (images.length === 0) throw new Error("No decor image generated.");
    return images;

  } catch (error) {
    console.error("Gemini Idea Decor Error:", error);
    throw error;
  }
};

export const autoGenerateAxonometric = async (
  floorPlan: FileData,
  cornerPhotos: FileData[]
): Promise<{ resultImage: string; analysisText: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // ==========================================
  // BƯỚC 1: PHÂN TÍCH ĐA PHƯƠNG THỨC (VISION)
  // ==========================================
  const analysisSystemPrompt = `
    ROLE: Elite Event Designer & Architectural Analyst.
    TASK: Analyze the provided Floor Plan (Image 1) and Room Photos (Images 2+).
    
    1. Identify the existing architectural style and materials (e.g., rustic brick, wood floor).
    2. Invent a high-end event concept (e.g., Wedding, Gala) that perfectly matches the existing vibe.
    3. Describe a highly detailed "3D Isometric Axonometric Cutaway" view of this event space respecting the floor plan layout.
    
    OUTPUT FORMAT (Strict JSON only):
    {
      "analysisText": "Your short Vietnamese explanation of the design concept based on the room's vibe (e.g. 'Dựa trên sàn gỗ và tường gạch mộc, tôi đề xuất thiết kế tiệc cưới phong cách Rustic...').",
      "imagePrompt": "A highly detailed English prompt for an image generator. Must start with '3D isometric axonometric cutaway view of...'. Describe the event, the layout based on the floor plan, and the materials based on the photos. Cinematic lighting, photorealistic, 8k."
    }
  `;

  const contents: any[] = [
    { text: analysisSystemPrompt },
    { text: "--- IMAGE 1: FLOOR PLAN ---" },
    { inlineData: { mimeType: floorPlan.mimeType, data: floorPlan.base64 } }
  ];

  cornerPhotos.forEach((photo, index) => {
    contents.push({ text: `--- IMAGE ${index + 2}: ROOM CORNER PHOTO ---` });
    contents.push({ inlineData: { mimeType: photo.mimeType, data: photo.base64 } });
  });

  try {
    // Gọi Gemini 3 Pro (hỗ trợ phân tích ảnh và văn bản phức tạp)
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: [{ role: 'user', parts: contents }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = analysisResponse.text || "{}";
    const parsedData = JSON.parse(responseText);
    const generatedPrompt = parsedData.imagePrompt;
    const analysisResultText = parsedData.analysisText;

    if (!generatedPrompt) throw new Error("AI không thể phân tích và tạo Prompt.");

    // ==========================================
    // BƯỚC 2: TẠO ẢNH TỪ PROMPT SINH TỰ ĐỘNG
    // ==========================================
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: [{ text: generatedPrompt }]
    });

    const base64Image = imageResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = imageResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/jpeg';
    
    if (!base64Image) {
        throw new Error("Không thể kết xuất hình ảnh 3D từ phân tích.");
    }

    return {
      analysisText: analysisResultText,
      resultImage: `data:${mimeType};base64,${base64Image}` 
    };

  } catch (error) {
    console.error("Auto Analysis Axonometric Error:", error);
    throw error;
  }
};

export const generateAxonometricView = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  description: string
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    ROLE: Professional 3D Visualizer.
    TASK: Create a 3D Axonometric View (Cutaway) based on the provided source image and description.
    SOURCE CONTEXT: The provided image shows the current state or layout.
    USER DESCRIPTION: ${description}
    REQUIREMENTS: 
    - Perspective: Isometric / Axonometric.
    - Style: High-end architectural rendering, photorealistic.
    - Lighting: Cinematic studio lighting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } }
        ]
      }
    });

    if (response.candidates && response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Axonometric View Error:", error);
    throw error;
  }
};



export const generatePanoramicAxonometric = async (
  floorPlan: FileData,
  perspectivePhotos: CornerPhotoWithLocation[]
): Promise<{ resultImage: string; aiReasoning: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Generate Spatial Instructions from mapped photos
  const spatialInstructions = perspectivePhotos.map((p, idx) => {
        let xPos = p.x < 33 ? "Left" : p.x > 66 ? "Right" : "Center (Horizontal)";
        let yPos = p.y < 33 ? "Top" : p.y > 66 ? "Bottom" : "Center (Vertical)";
        return `- Reference Photo ${idx + 2} is located at [${yPos}, ${xPos}] on the floor plan, camera facing ${p.rotation} degrees.`;
    }).join('\n');

  // ============================================================================
  // COMPOSITE PROMPTING SYSTEM
  // ============================================================================
  const SYSTEM_PROMPT = `
ROLE: You are an Expert Architectural Visualizer.
TASK: Reconstruct a cohesive 3D Axonometric cutaway view based on a Master Floor Plan and localized corner photos.

INPUT DATA:
- IMAGE 1 is the STRICT Master Floor Plan. You MUST follow this exact geometric layout and room boundaries. Do not invent a square room if the floor plan is rectangular.
- Subsequent images (IMAGE 2, 3...) are interior reference photos from different mapped locations.

USER MAPPING (CRITICAL):
The user has mapped the locations of the reference photos on the floor plan as follows:
${spatialInstructions}

INSTRUCTIONS:
1. OVERALL SHAPE: Form the base 3D walls and floor strictly using Image 1's proportions.
2. TEXTURE MAPPING: Extract the decor, furniture, wall textures, and colors from each reference image and apply them ONLY to the specific section of the 3D room dictated by the User Mapping.
3. BLENDING: Seamlessly merge these localized zones into ONE cohesive room.
4. VIEW: Render as a 45-degree top-down Isometric/Axonometric cutaway box, floating on a white studio background. Show the thickness of the cut walls.

Return ONLY the raw generated image, no markdown, no JSON.
`;

  // Prepare contents array
  const contents: any[] = [
    { text: SYSTEM_PROMPT },
    { inlineData: { mimeType: floorPlan.mimeType, data: floorPlan.base64 } } // Image 1 (Floor Plan)
  ];
  
  // Add mapped photos
  perspectivePhotos.forEach(p => {
    contents.push({ inlineData: { mimeType: p.fileData.mimeType, data: p.fileData.base64 } });
  });

  try {
    const finalImageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: contents
    });
    
    // Process response
    const base64Image = finalImageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    const mimeType = finalImageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.mimeType || 'image/jpeg';

    if (!base64Image) {
        throw new Error("Không thể tạo hình ảnh toàn cảnh từ mô tả.");
    }

    return {
      resultImage: `data:${mimeType};base64,${base64Image}`,
      aiReasoning: "Generated based on spatial mapping." // Placeholder as reasoning is implicit in visual output now
    };

  } catch (error) {
    console.error("Panoramic Gen Error:", error);
    throw error;
  }
};

export const generateViewSync = async (
  sourceImage: FileData,
  fullPrompt: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: fullPrompt },
          { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
        ]
      },
      config: {
        systemInstruction: "You are an Expert Architectural Visualizer specializing in perspective transformation."
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("View Sync Generation Error:", error);
    throw error;
  }
};
