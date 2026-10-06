import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { siteFontVars } from "@/lib/fonts";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import { site } from "@/lib/site";

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
  return {
    metadataBase: new URL(site.url),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: { ru: "/ru", kk: "/kk" } },
    icons: { icon: "/logo.png" },
    openGraph: { title: t.meta.title, description: t.meta.description, images: ["/logo.png"] },
  };
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
