import sharp from "sharp";
import { PHOTO_VARIANTS, variantPath } from "../../src/lib/domain/photo";

/**
 * Фото из Supabase и его уменьшенные копии по ширине (как делает браузер при загрузке, src/lib/photo/compress.ts):
 * до этапа 8 копий не было, а загрузчик картинок на хостинге их ждёт. Формат копий — как у самого Фото.
 */
export async function photoWithVariants(photo: string, bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = { [photo]: bytes };
  const format = photo.endsWith(".png") ? "png" : photo.endsWith(".jpg") ? "jpeg" : "webp";
  for (const width of PHOTO_VARIANTS) {
    const resized = sharp(bytes, { failOn: "none" }).rotate().resize({ width, withoutEnlargement: true });
    const variant = format === "png" ? resized.png() : format === "jpeg" ? resized.jpeg({ quality: 85 }) : resized.webp({ quality: 82 });
    files[variantPath(photo, width)] = new Uint8Array(await variant.toBuffer());
  }
  return files;
}
