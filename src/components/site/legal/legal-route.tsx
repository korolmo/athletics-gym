import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/site/legal/LegalPage";
import { toSiteContent } from "@/modules/site/client";
import { isLocale } from "@/lib/i18n";
import { getClubOnce, getLogos, getSiteDictionary } from "@/app/brand";
import { legalContext, legalDoc, legalHead, type LegalPageId } from "@/modules/legal";
import { buildMetadata, readSeoEnv } from "@/lib/seo";
import { getSiteSettings } from "@/modules/site";
import { resolveCodeChannel } from "@/modules/clients";
import { guestLoginEnabled } from "@/modules/owner";

// Общее для страниц /privacy и /terms: сами файлы страниц только называют документ.

type Params = Promise<{ locale: string }>;

/** Свои title и description, canonical и hreflang на эту же страницу на другом языке. */
export async function legalMetadata(page: LegalPageId, params: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [club, logos] = await Promise.all([getClubOnce(), getLogos()]);
  return buildMetadata(locale, legalHead(page, locale, club.name), readSeoEnv(), logos.icons, `/${page}`, club.name);
}

/** Документ на языке страницы: реквизиты, адрес зала и телефон — из Настроек сайта. */
export async function LegalRoute({ page, params }: { page: LegalPageId; params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, logos] = await Promise.all([getSiteDictionary(locale), getLogos()]);
  const { settings, cards } = await getSiteSettings();
  const s = toSiteContent(locale, settings, cards);
  // Разделы о личном кабинете — только там, где он работает (Лаборатория)
  const cabinet = resolveCodeChannel() !== null;
  return (
    <LegalPage locale={locale} t={t} s={s} logos={logos} page={page} doc={legalDoc(page, legalContext(locale, t, s, cabinet, guestLoginEnabled()))} cabinet={cabinet} />
  );
}
