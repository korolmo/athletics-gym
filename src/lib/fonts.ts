import localFont from "next/font/local";

// Шрифты админки — в admin-fonts.ts: общий файл заставлял публичные страницы предзагружать и их.

// Публичный сайт: два семейства, каждое — одним своим файлом (src/assets/fonts/site, как собраны — README там же).
// Google Fonts режет шрифт на части по алфавитам: латиница, кириллица, расширенная кириллица, расширенная латиница
// (её тянул знак ₸) — четыре файла Manrope, и после прихода каждого браузер заново раскладывал всю страницу.
// Один файл — одна подмена шрифта. Начертания — только нужные сайту: Manrope 400–800, Oswald 600.

// Шрифт макета Stitch — весь текст сайта. Предзагружается; запасной шрифт подогнан по метрикам — подмена без сдвига
const manrope = localFont({
  src: "../assets/fonts/site/manrope-400-800.woff2",
  weight: "400 800",
  variable: "--font-manrope",
  display: "swap",
  adjustFontFallback: "Arial",
});

// Бегущая строка — Oswald, без предзагрузки: лента ниже девиза и первой отрисовке не нужна.
// Шрифт включается после оживления страницы (правило html[data-late-fonts] .marquee-track в globals.css)
const oswaldSite = localFont({
  src: "../assets/fonts/site/oswald-600.woff2",
  weight: "600",
  variable: "--font-oswald",
  display: "swap",
  preload: false,
});

export const siteFontVars = `${manrope.variable} ${oswaldSite.variable}`;
