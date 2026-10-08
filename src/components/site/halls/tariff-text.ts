import { isAccess, isAudience } from "@/lib/domain/tariff";
import { plural } from "@/lib/presentation/tariff-labels";
import type { TariffView, PricesText } from "@/components/site/halls/types";

// Как Тариф называется на сайте — на языке страницы, из полей и словаря

function countPerMonth(p: PricesText, n: number, words: readonly string[]): string {
  return p.countPerMonth.replace("{n}", String(n)).replace("{word}", plural(n, words));
}

export function tariffLabel(p: PricesText, t: TariffView): string {
  if (t.title) return t.title;
  switch (t.category) {
    case "SINGLE":
      return p.singleVisit;
    case "VISITS":
      return countPerMonth(p, t.visitsPerMonth ?? 0, p.visits);
    case "UNLIMITED":
      return `${t.durationMonths ?? 0} ${plural(t.durationMonths ?? 0, p.months)}`;
    default:
      return t.visitsPerMonth ? countPerMonth(p, t.visitsPerMonth, p.sessions) : p.singleSession;
  }
}

/** Пометки Аудитории и Времени доступа. */
export function tariffTags(p: PricesText, t: TariffView): string[] {
  const tags: string[] = [];
  if (isAudience(t.audience) && p.audience[t.audience]) tags.push(p.audience[t.audience]);
  if (t.category === "VISITS" && isAccess(t.access)) tags.push(p.access[t.access]);
  return tags;
}
