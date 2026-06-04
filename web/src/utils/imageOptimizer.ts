/**
 * Image optimization utility for KiuQ Website System.
 * Handles client-side compression and WebP conversion.
 */

export interface OptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  targetSizeKB: number;
  maxSizeKB: number;
  initialQuality: number;
  minQuality: number;
  outputType: string;
}

export interface OptimizeResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  mimeType: string;
  previewUrl: string;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  targetSizeKB: 100,
  maxSizeKB: 200,
  initialQuality: 0.8,
  minQuality: 0.45,
  outputType: 'image/webp'
};

/**
 * Main optimization function
 */
export async function optimizeImage(
  file: File,
  options: Partial<OptimizeOptions> = {}
): Promise<OptimizeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  // 1. Create an Image object
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  // 2. Calculate new dimensions
  let { width, height } = calculateDimensions(originalWidth, originalHeight, opts.maxWidth, opts.maxHeight);

  // 3. Compress using canvas with quality iteration
  let quality = opts.initialQuality;
  let blob: Blob | null = null;
  let currentSizeKB = 0;

  // Iterative compression to hit target size
  while (quality >= opts.minQuality) {
    blob = await compressToBlob(img, width, height, opts.outputType, quality);
    currentSizeKB = blob.size / 1024;
    
    if (currentSizeKB <= opts.targetSizeKB) break;
    quality -= 0.1;
  }

  // If still too large, try reducing dimensions further (up to 20%)
  if (currentSizeKB > opts.maxSizeKB) {
    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
    blob = await compressToBlob(img, width, height, opts.outputType, opts.minQuality);
    currentSizeKB = blob.size / 1024;
  }

  if (!blob) throw new Error('Optimization failed');

  // 4. Create new File object
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const newFileName = `task-image-${timestamp}.webp`;
  const optimizedFile = new File([blob], newFileName, { type: opts.outputType });

  return {
    file: optimizedFile,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
    compressionRatio: Math.round(((file.size - optimizedFile.size) / file.size) * 100),
    width,
    height,
    mimeType: opts.outputType,
    previewUrl: URL.createObjectURL(optimizedFile)
  };
}

/**
 * Load File into Image object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate aspect-ratio preserved dimensions
 */
function calculateDimensions(w: number, h: number, maxW: number, maxH: number) {
  let width = w;
  let height = h;

  if (width > maxW) {
    height = Math.round((height * maxW) / width);
    width = maxW;
  }

  if (height > maxH) {
    width = Math.round((width * maxH) / height);
    height = maxH;
  }

  return { width, height };
}

/**
 * Draw to canvas and get Blob
 */
function compressToBlob(
  img: HTMLImageElement,
  w: number,
  h: number,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas context failed'));

    // For transparent images, we might want to fill background if converting to non-transparent format
    // But WebP supports transparency, so we're good.
    ctx.drawImage(img, 0, 0, w, h);
    
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}

/**
 * Human readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
