import Image from "next/image";
import type { LogoView } from "@/modules/club/client";

// Логотип Клуба или Зала (этап П1): картинка (файл из public/ или Фото) или монограмма — буквы в круге цвета акцента.
// Без "use client": рисуется и сервером (сайт), и в браузерных оболочках (кабинет, админка).

export function ClubLogo({
  logo,
  size,
  className = "",
  alt = "",
  priority = false,
  sizes,
}: {
  logo: LogoView;
  /** Сторона в CSS-пикселях — для width/height картинки и viewBox монограммы */
  size: number;
  className?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (logo.kind === "image") {
    return <Image src={logo.src} alt={alt} width={size} height={size} className={className} priority={priority} sizes={sizes} />;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      <circle cx="50" cy="50" r="50" fill={logo.bg} />
      <text x="50" y="50" dy=".35em" textAnchor="middle" fontWeight={800} fontSize={logo.text.length > 1 ? 40 : 52} fill={logo.fg} style={{ fontFamily: "inherit" }}>
        {logo.text}
      </text>
    </svg>
  );
}
