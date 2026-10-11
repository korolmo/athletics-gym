import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { siteFontVars } from "@/lib/fonts";
import { getDictionary, isLocale } from "@/lib/i18n";
import { buildMetadata, readSeoEnv } from "@/lib/seo";
import { logoIconUrl } from "@/lib/brand";

// Пустой список: при сборке страницы не строятся (сборке и CI база не нужна), а собираются при первом запросе
// и дальше отдаются из кэша. Языки проверяет isLocale — чужой адрес получает 404.
export function generateStaticParams() {
  return [];
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
      <body className="bg-background font-site text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
        {/* Без скриптов нижнюю панель на телефоне некому выдвинуть — показываем её сразу */}
        <noscript>
          <style>{'[data-contact-source="mobile-bar"]{transform:none!important;animation:none!important}'}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
