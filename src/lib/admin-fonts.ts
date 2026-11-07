import localFont from "next/font/local";

// Шрифт админки (новая админка, docs/stages/admin-v2.md, решение 23): тот же Onest, что у сайта, — одна система
// вместо Oswald + Inter. Отдельный файл от fonts.ts по-прежнему нужен: Next предзагружает все шрифты модуля,
// который подключил layout, — так публичные страницы не тянут ничего лишнего, а админка не тянет Oswald сайта.
const onest = localFont({
  src: "../assets/fonts/site/onest-400-800.woff2",
  weight: "400 800",
  variable: "--font-onest",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const fontVars = onest.variable;
