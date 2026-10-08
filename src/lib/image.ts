const FULL_MAX = 2200;
const THUMB_MAX = 640;

export interface ProcessedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

type Source = ImageBitmap | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch {
      /* fallback xuống <img> (vd. HEIC trên Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function size(src: Source): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight];
  return [src.width, src.height];
}

function render(src: Source, max: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const [sw, sh] = size(src);
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, w, h }) : reject(new Error('Không thể xử lý ảnh'))), 'image/jpeg', quality),
  );
}

export async function processSource(src: Source): Promise<ProcessedPhoto> {
  const [full, thumb] = await Promise.all([render(src, FULL_MAX, 0.88), render(src, THUMB_MAX, 0.8)]);
  return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h };
}

/** Nén ảnh gốc thành bản đầy đủ (≤2200px) và thumbnail (≤640px). */
export async function processImage(file: Blob): Promise<ProcessedPhoto> {
  const src = await decode(file);
  try {
    return await processSource(src);
  } finally {
    if ('close' in src) src.close();
  }
}
