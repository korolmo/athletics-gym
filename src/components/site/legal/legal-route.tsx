import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/site/legal/LegalPage";
import { siteIcons } from "@/lib/brand";
import { toSiteContent } from "@/lib/domain/site-settings";
import { getDictionary, isLocale } from "@/lib/i18n";
import { legalContext, legalDoc, legalHead, type LegalPageId } from "@/lib/legal";
import { buildMetadata, readSeoEnv } from "@/lib/seo";
import { getSiteSettings } from "@/lib/services/site";

// Общее для страниц /privacy и /terms: сами файлы страниц только называют документ.

type Params = Promise<{ locale: string }>;

/** Свои title и description, canonical и hreflang на эту же страницу на другом языке. */
export async function legalMetadata(page: LegalPageId, params: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildMetadata(locale, legalHead(page, locale), readSeoEnv(), siteIcons, `/${page}`);
}

/** Документ на языке страницы: реквизиты, адрес зала и телефон — из Настроек сайта. */
export async function LegalRoute({ page, params }: { page: LegalPageId; params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { settings, cards } = await getSiteSettings();
  const s = toSiteContent(locale, settings, cards);
  return <LegalPage locale={locale} t={t} s={s} page={page} doc={legalDoc(page, legalContext(locale, t, s))} />;
}
