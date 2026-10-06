import { Inter, Oswald } from "next/font/google";

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

export const fontVars = `${oswald.variable} ${inter.variable}`;
