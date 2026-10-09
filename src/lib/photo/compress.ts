// Сжатие фото в браузере перед загрузкой: длинная сторона до ~1600 px, формат WebP.
// Фото с телефона весит 3–12 МБ, после сжатия — обычно 150–500 КБ.

import { MAX_SIDE_PX } from "@/lib/domain/photo";

const UNREADABLE = "Не удалось открыть фото. Попробуйте другое или сделайте снимок экрана.";

/** Новые размеры: длинная сторона не больше предела, пропорции те же, маленькое фото не растягиваем. */
export function fitSize(width: number, height: number, maxSide: number = MAX_SIDE_PX): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // createImageBitmap учитывает поворот из EXIF — фото с телефона не ляжет набок
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // не получилось — пробуем через <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(UNREADABLE);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Сжимает фото. Результат — WebP; если браузер не умеет его кодировать (старый Safari), то JPEG. */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const image = await decode(file);
  try {
    if (!image.width || !image.height) throw new Error(UNREADABLE);
    const { width, height } = fitSize(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(UNREADABLE);
    ctx.drawImage(image.source, 0, 0, width, height);

    const webp = await toBlob(canvas, "image/webp", 0.82);
    // Браузер без кодировщика WebP молча отдаёт PNG — он был бы в разы тяжелее, берём JPEG
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
    if (jpeg && jpeg.type === "image/jpeg") return jpeg;
    throw new Error(UNREADABLE);
  } finally {
    image.close();
  }
}
