import { GoogleGenAI } from "@google/genai";

export interface VeoVideoOptions {
  aspectRatio?: "16:9" | "9:16";
  enableAudio?: boolean; // Note: Veo 3.1 Fast Preview might not support audio control via config yet, but we keep the interface
}

/**
 * Gọi API Google Veo 3 Fast để tạo video từ ảnh Render của Luxzen
 * @param base64Image Ảnh gốc (Data URL)
 * @param fullPrompt Lệnh điều khiển camera và cảnh vật
 * @param options Tùy chọn định dạng
 * @returns URL của Video (MP4) hoặc null nếu lỗi
 */
export const generateVideoFromImage = async (
  base64Image: string, 
  fullPrompt: string,
  options: VeoVideoOptions = { aspectRatio: "9:16" }
): Promise<string | null> => {
  try {
    console.log("Đang gửi yêu cầu Render Video tới Veo 3 Fast (Google GenAI)...");

    if (!process.env.API_KEY) {
      throw new Error("API Key is missing. Please select a Google Cloud Project with billing enabled.");
    }


    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Parse Data URI to get mimeType and base64 data
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image format");
    }
    const mimeType = matches[1];
    const imageBytes = matches[2];

    // Helper function for retry logic
    const generateVideosWithRetry = async (params: any, retries: number = 3, delay: number = 2000): Promise<any> => {
      try {
        return await ai.models.generateVideos(params);
      } catch (error: any) {
        if (retries > 0 && (error?.status === 503 || error?.code === 503 || error?.message?.includes("503") || error?.message?.includes("overloaded"))) {
          console.warn(`Veo API 503 error. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return generateVideosWithRetry(params, retries - 1, delay * 2);
        }
        throw error;
      }
    };

    // Veo 3.1 Fast Generate Preview
    // Supported aspect ratios: '16:9' (landscape) or '9:16' (portrait)
    // Resolution: '720p' or '1080p'
    let operation = await generateVideosWithRetry({
      model: 'veo-3.1-fast-generate-preview',
      prompt: fullPrompt,
      image: {
        imageBytes: imageBytes,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p', // Defaulting to 720p for speed
        aspectRatio: options.aspectRatio || '9:16'
      }
    });

    console.log("Video generation operation started. Polling for results...");

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling status:", operation.metadata?.state);
    }

    if (operation.error) {
      throw new Error(`Veo Generation Failed: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned from Veo.");
    }

    // To fetch the video, we need to make a GET request with the API key
    // However, we can't just return the URI because it requires auth headers to download.
    // We will fetch it here and convert to a blob URL for the frontend to display.
    
    console.log("Video generated. Fetching content...");
    const videoResponse = await fetch(videoUri, {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.API_KEY,
      },
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video content: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoObjectUrl = URL.createObjectURL(videoBlob);
    
    return videoObjectUrl;

  } catch (error: any) {
    console.error("Lỗi khi tạo video bằng Veo 3:", error);
    // Return the error message if possible so the UI can show it
    throw error; 
  }
};

