import { Inter, Manrope, Oswald } from "next/font/google";

export const oswald = Oswald({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-oswald",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Шрифт макета Stitch (сайт); cyrillic-ext нужен для казахских букв
export const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

// Админка
export const fontVars = `${oswald.variable} ${inter.variable}`;
// Бегущая строка на сайте — тоже Oswald, но без предзагрузки: лента ниже девиза и первой отрисовке не нужна.
// Шрифт включается после оживления страницы (правило html[data-late-fonts] .marquee-track в globals.css)
const oswaldSite = Oswald({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-oswald",
  display: "swap",
  preload: false,
});

// Публичный сайт
export const siteFontVars = `${manrope.variable} ${oswaldSite.variable}`;
