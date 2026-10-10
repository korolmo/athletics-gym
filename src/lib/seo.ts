// SEO: адрес сайта, метаданные страниц, robots, sitemap и разметка JSON-LD.
// Чистые функции: всё, что зависит от окружения, приходит аргументами — так это проверяется тестами.

import type { Metadata, MetadataRoute } from "next";
import { locales, type Locale } from "@/lib/i18n";
import type { SiteContent } from "@/lib/domain/site-settings";

/** Адрес сайта, пока нет своего домена. С доменом .kz меняется только переменная SITE_URL. */
export const DEFAULT_SITE_URL = "https://athletics-gym.vercel.app";

/** Адрес сайта из SITE_URL: только правильный https-адрес без пути; иначе — адрес по умолчанию. */
export function resolveSiteUrl(raw: string | undefined): string {
  if (!raw) return DEFAULT_SITE_URL;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || !/^[a-z0-9.-]+$/.test(url.hostname)) return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/**
 * Можно ли показывать этот деплой поисковикам. Только production на Vercel:
 * превью и локальный сайт работают на базе разработки и в поиск попадать не должны.
 */
export function isIndexable(vercelEnv: string | undefined): boolean {
  return vercelEnv === "production";
}

export type SeoEnv = { siteUrl: string; vercelEnv: string | undefined; googleVerification?: string };

export function readSeoEnv(env: Record<string, string | undefined> = process.env): SeoEnv {
  return {
    siteUrl: resolveSiteUrl(env.SITE_URL),
    vercelEnv: env.VERCEL_ENV,
    googleVerification: env.GOOGLE_SITE_VERIFICATION?.trim() || undefined,
  };
}

/** hreflang: у каждой языковой версии — ссылки на обе и на версию по умолчанию (русскую). */
export function languageAlternates(siteUrl: string): Record<string, string> {
  return { ru: `${siteUrl}/ru`, kk: `${siteUrl}/kk`, "x-default": `${siteUrl}/ru` };
}

const OG_LOCALE: Record<Locale, string> = { ru: "ru_KZ", kk: "kk_KZ" };

/** Метаданные главной на одном языке: title, description, canonical, hreflang, Open Graph, Twitter, robots. */
export function buildMetadata(
  locale: Locale,
  text: { title: string; description: string },
  env: SeoEnv,
  icon: string,
): Metadata {
  const url = `${env.siteUrl}/${locale}`;
  const indexable = isIndexable(env.vercelEnv);
  return {
    metadataBase: new URL(env.siteUrl),
    title: text.title,
    description: text.description,
    alternates: { canonical: url, languages: languageAlternates(env.siteUrl) },
    // Картинка-превью подставляется сама: файлы opengraph-image и twitter-image рядом со страницей
    openGraph: {
      type: "website",
      url,
      siteName: "Athletic's Gym",
      title: text.title,
      description: text.description,
      locale: OG_LOCALE[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title: text.title, description: text.description },
    icons: { icon: [{ url: icon, type: "image/png" }], apple: [{ url: icon }] },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    ...(env.googleVerification ? { verification: { google: env.googleVerification } } : {}),
  };
}

/** robots.txt: в production закрыты админка и API; на превью и локально закрыто всё. */
export function buildRobots(env: SeoEnv): MetadataRoute.Robots {
  if (!isIndexable(env.vercelEnv)) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}

/** sitemap.xml: обе языковые версии главной, у каждой — hreflang на обе и на x-default. */
export function buildSitemap(siteUrl: string, lastModified: Date): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${siteUrl}/${locale}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: locale === "ru" ? 1 : 0.8,
    alternates: { languages: languageAlternates(siteUrl) },
  }));
}

/** Часы работы из текста Настроек сайта («Ежедневно 08:00–23:00») → время открытия и закрытия; null — времени в тексте нет. */
export function parseOpeningHours(text: string): { opens: string; closes: string } | null {
  const m = /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/.exec(text);
  if (!m) return null;
  const [h1, m1, h2, m2] = [m[1], m[2], m[3], m[4]].map(Number);
  if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { opens: `${pad(h1)}:${pad(m1)}`, closes: `${pad(h2)}:${pad(m2)}` };
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Разметка зала для поисковиков (schema.org, тип ExerciseGym). Данные — из Настроек сайта.
 * Рейтинга и отзывов здесь нет намеренно: оценка зала взята из 2ГИС, а Google запрещает
 * размечать как свои оценки, собранные на других площадках.
 */
export function buildGymJsonLd(input: {
  siteUrl: string;
  locale: Locale;
  name: string;
  description: string;
  city: string;
  coords: { lat: number; lng: number };
  logoPath: string;
  extraLinks: string[];
  content: Pick<SiteContent, "contacts" | "women">;
}): Record<string, unknown> {
  const { siteUrl, locale, content } = input;
  const hours = parseOpeningHours(content.contacts.hours);
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    "@id": `${siteUrl}/#gym`,
    name: input.name,
    description: input.description,
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    logo: `${siteUrl}${input.logoPath}`,
    image: `${siteUrl}/${locale}/opengraph-image`,
    telephone: content.contacts.phoneTel,
    address: {
      "@type": "PostalAddress",
      streetAddress: content.contacts.address,
      addressLocality: input.city,
      addressCountry: "KZ",
    },
    geo: { "@type": "GeoCoordinates", latitude: input.coords.lat, longitude: input.coords.lng },
    ...(hours
      ? { openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ALL_DAYS, opens: hours.opens, closes: hours.closes }] }
      : {}),
    sameAs: [...new Set([content.contacts.instagram, content.women.instagram, ...input.extraLinks])],
  };
}

/** JSON для тега script: «<» экранируется, чтобы текст из Настроек не мог закрыть тег. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
