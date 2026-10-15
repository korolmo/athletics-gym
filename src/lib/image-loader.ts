// Загрузчик next/image без оптимизатора на сервере (ADR 0004): вместо пересжатия «на лету» — готовые файлы.
// - Фото с диска (/media/<папка>/<uuid>.webp): уменьшенные копии делает браузер Владельца при загрузке
//   (<uuid>-w400.webp, -w800.webp); шире 800 — сам файл (до 1600 px).
// - Картинки из public/ (/stitch/hero.jpg, /logo.png): копии WebP шириной из image-widths.json
//   собирает scripts/images/build-variants.mjs в public/_img/; шире самой большой — самая большая.
// - Всё остальное (data:, внешние адреса, /_next/static) — как есть.
// Ширины в srcset задают images.deviceSizes и imageSizes в next.config.mjs.

import widths from "./image-widths.json";

/** Ширины копий Фото — как PHOTO_VARIANTS в src/lib/domain/photo.ts (проверяет тест). */
export const MEDIA_VARIANT_WIDTHS = [400, 800] as const;

const MEDIA = /^(\/media\/[a-z]+\/[0-9a-f-]{36})\.(webp|jpg|png)$/;
const PUBLIC = /^\/((?!_next\/|_img\/|media\/|api\/)[A-Za-z0-9_\-/]+)\.(jpe?g|png|webp)(\?[^#]*)?$/;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const media = MEDIA.exec(src);
  if (media) {
    const variant = MEDIA_VARIANT_WIDTHS.find((w) => w >= width);
    return variant ? `${media[1]}-w${variant}.${media[2]}` : src;
  }
  const file = PUBLIC.exec(src);
  if (file) {
    const variant = widths.public.find((w) => w >= width) ?? widths.public[widths.public.length - 1];
    return `/_img/${file[1]}-${variant}.webp${file[3] ?? ""}`;
  }
  return src;
}
