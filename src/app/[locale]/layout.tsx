import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { siteFontVars } from "@/lib/fonts";
import { getDictionary, isLocale } from "@/lib/i18n";
import { buildMetadata, readSeoEnv } from "@/lib/seo";
import { siteIcons } from "@/lib/brand";
import { COOKIES_ANCHOR, legalPath } from "@/lib/legal/meta";
import { CookieNotice } from "@/components/site/CookieNotice";
import { LabBanner } from "@/components/LabBanner";
import { isLab } from "@/lib/lab";

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
  return buildMetadata(locale, t.seo, readSeoEnv(), siteIcons);
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
  const { cookie, lab } = getDictionary(locale);
  const demo = isLab();
  return (
    <html lang={locale} className={siteFontVars} data-lab={demo ? "" : undefined}>
      <body className="bg-background font-site text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
        {/* Лаборатория: плашка «демо-версия» на всех страницах; на боевом сайте её нет */}
        {demo && <LabBanner texts={lab} path={`/${locale}`} />}
        {/* Без скриптов нижнюю панель на телефоне некому выдвинуть — показываем её сразу */}
        <noscript>
          <style>{'[data-contact-source="mobile-bar"]{transform:none!important;animation:none!important}'}</style>
        </noscript>
        {children}
        {/* Сообщение о cookie — на всех страницах сайта, пока Посетитель не нажмёт «Понятно» */}
        <CookieNotice label={cookie.label} text={cookie.text} more={cookie.more} ok={cookie.ok} href={legalPath(locale, "privacy", COOKIES_ANCHOR)} />
      </body>
    </html>
  );
}
