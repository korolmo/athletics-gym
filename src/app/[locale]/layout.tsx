import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { siteFontVars } from "@/lib/fonts";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import { buildMetadata, readSeoEnv } from "@/lib/seo";
import { logoIconUrl } from "@/lib/brand";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  // title и description — на языке страницы; canonical, hreflang, Open Graph и robots — по адресу и окружению деплоя
  return buildMetadata(locale, t.seo, readSeoEnv(), logoIconUrl);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={siteFontVars}>
      <body className="bg-background font-site text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">{children}</body>
    </html>
  );
}
