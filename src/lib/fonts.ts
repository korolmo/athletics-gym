import localFont from "next/font/local";

// Шрифты админки — в admin-fonts.ts: общий файл заставлял публичные страницы предзагружать и их.

// Публичный сайт: два семейства, каждое — одним своим файлом (src/assets/fonts/site, как собраны — README там же).
// Google Fonts режет шрифт на части по алфавитам: латиница, кириллица, расширенная кириллица, расширенная латиница
// (её тянул знак ₸) — четыре файла, и после прихода каждого браузер заново раскладывал всю страницу.
// Один файл — одна подмена шрифта. Начертания — только нужные сайту: Onest 400–800, Oswald 600.

// Весь текст сайта — Onest. В макете Stitch был Manrope, но в нём нет казахских Қ Ғ Ұ Ә Ң и знака ₸: их рисовал
// системный шрифт, и буквы в одном слове получались разными. Onest — самый близкий по рисунку гротеск с полным
// казахским набором. Предзагружается; запасной шрифт подогнан по метрикам — подмена без сдвига
const onest = localFont({
  src: "../assets/fonts/site/onest-400-800.woff2",
  weight: "400 800",
  variable: "--font-onest",
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

export const siteFontVars = `${onest.variable} ${oswaldSite.variable}`;
