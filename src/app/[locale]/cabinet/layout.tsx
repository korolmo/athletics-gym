import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCabinetDictionary, isLocale } from "@/lib/i18n";
import { resolveCodeChannel } from "@/modules/clients";

// Личный кабинет Клиента (этап 1, ADR 0016). Страницы зависят от сессии — собираются на каждый запрос, в кэш не идут.
// Без канала доставки кода (боевой сайт: демо-канала там нет) кабинета нет вовсе — 404.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getCabinetDictionary(locale);
  return { title: t.meta.title, robots: { index: false, follow: false } };
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  if (!resolveCodeChannel()) notFound();
  return children;
}
