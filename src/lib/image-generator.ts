// Using Pollinations AI for free image generation (no API key needed)

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  style?: string;
  seed?: number;
  nologo?: boolean;
}

// Get dimensions based on aspect ratio
function getDimensions(aspectRatio: string): { width: number; height: number } {
  const baseSize = 512;
  switch (aspectRatio) {
    case "16:9":
      return { width: 768, height: 432 };
    case "9:16":
      return { width: 432, height: 768 };
    case "4:3":
      return { width: 640, height: 480 };
    case "3:4":
      return { width: 480, height: 640 };
    case "1:1":
    default:
      return { width: baseSize, height: baseSize };
  }
}

export async function generateImage(promptOrOptions: string | ImageGenerationOptions): Promise<string | null> {
  try {
    // Handle both string prompt and options object
    const options: ImageGenerationOptions = typeof promptOrOptions === "string"
      ? { prompt: promptOrOptions }
      : promptOrOptions;

    const { prompt, negativePrompt, aspectRatio = "1:1", seed, nologo = true } = options;

    // Get dimensions
    const { width, height } = getDimensions(aspectRatio);

    // Build the prompt with negative prompt if provided
    let fullPrompt = prompt;
    if (negativePrompt) {
      fullPrompt = `${prompt} ### ${negativePrompt}`;
    }

    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(fullPrompt);

    // Build URL parameters
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      nologo: nologo.toString(),
      seed: (seed || Date.now()).toString(),
    });

    // Pollinations AI endpoint
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    console.log("Generating image with Pollinations:", imageUrl);

    // Retry logic for server errors (502, 503, etc.)
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Fetch with timeout (60 seconds for image generation)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(imageUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Server errors - retry
          if (response.status >= 500 && attempt < maxRetries) {
            console.log(`Server error ${response.status}, retrying... (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Wait before retry
            continue;
          }
          // User-friendly error messages
          if (response.status === 502 || response.status === 503) {
            throw new Error("Server is busy. Please try again in a moment.");
          } else if (response.status === 429) {
            throw new Error("Image generation limit reached! The free quota has been exceeded. Please try again in about 1 hour.");
          } else if (response.status >= 500) {
            throw new Error("Server error. Please try again later.");
          }
          throw new Error(`Failed to generate image (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        console.log("Image generated successfully, size:", arrayBuffer.byteLength);

        return `data:${mimeType};base64,${base64}`;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          throw new Error("Image generation timed out. Please try again.");
        }

        // Retry on network errors
        if (attempt < maxRetries && !lastError.message.includes("Rate limit")) {
          console.log(`Error occurred, retrying... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("Failed to generate image after multiple attempts");
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
    throw new Error(errorMessage);
  }
}

// Generate image from another image (image-to-image)
export async function generateImageFromImage(
  referenceImageUrl: string,
  prompt: string,
  options?: Partial<ImageGenerationOptions>
): Promise<string | null> {
  try {
    const { aspectRatio = "1:1", negativePrompt, seed, nologo = true } = options || {};
    const { width, height } = getDimensions(aspectRatio);

    // Build prompt with reference
    let fullPrompt = prompt;
    if (negativePrompt) {
      fullPrompt = `${prompt} ### ${negativePrompt}`;
    }

    const encodedPrompt = encodeURIComponent(fullPrompt);
    const encodedImageUrl = encodeURIComponent(referenceImageUrl);

    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      nologo: nologo.toString(),
      seed: (seed || Date.now()).toString(),
      image: encodedImageUrl,
    });

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    console.log("Generating image-to-image with Pollinations:", imageUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;
  } catch (error: unknown) {
    console.error("Image-to-image generation error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(errorMessage);
  }
}

// Generate animated GIF
export async function generateAnimation(
  prompt: string,
  options?: Partial<ImageGenerationOptions>
): Promise<string | null> {
  try {
    const { negativePrompt, seed, nologo = true } = options || {};

    let fullPrompt = prompt;
    if (negativePrompt) {
      fullPrompt = `${prompt} ### ${negativePrompt}`;
    }

    const encodedPrompt = encodeURIComponent(fullPrompt);

    // Pollinations video/animation endpoint
    const params = new URLSearchParams({
      nologo: nologo.toString(),
      seed: (seed || Date.now()).toString(),
    });

    // Using the text-to-video endpoint
    const videoUrl = `https://text.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;

    console.log("Generating animation with Pollinations:", videoUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes for video

    const response = await fetch(videoUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to generate animation: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'video/mp4';

    return `data:${mimeType};base64,${base64}`;
  } catch (error: unknown) {
    console.error("Animation generation error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(errorMessage);
  }
}
