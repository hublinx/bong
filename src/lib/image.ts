import type { Photo } from '../types';
import { uid } from './id';

const FULL_MAX = 2000;
const THUMB_MAX = 640;

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

function render(src: ImageBitmap | HTMLImageElement, max: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height;
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
    canvas.toBlob(
      (b) => (b ? resolve({ blob: b, w, h }) : reject(new Error('Không thể xử lý ảnh'))),
      'image/jpeg',
      quality,
    ),
  );
}

/** Nén ảnh gốc thành bản đầy đủ (≤2000px) và thumbnail (≤640px). */
export async function processImage(file: File): Promise<Photo> {
  const src = await decode(file);
  const [full, thumb] = await Promise.all([render(src, FULL_MAX, 0.86), render(src, THUMB_MAX, 0.8)]);
  if ('close' in src) src.close();
  return {
    id: uid(),
    blob: full.blob,
    thumb: thumb.blob,
    width: full.w,
    height: full.h,
    createdAt: Date.now(),
  };
}
