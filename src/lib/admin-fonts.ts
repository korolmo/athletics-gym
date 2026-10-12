import { Inter, Oswald } from "next/font/google";

// Шрифты админки. Отдельный файл от шрифтов сайта (fonts.ts): Next предзагружает все шрифты модуля,
// который подключил layout, — из общего файла публичные страницы предзагружали и шрифты админки (шесть лишних файлов).

const oswald = Oswald({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVars = `${oswald.variable} ${inter.variable}`;
