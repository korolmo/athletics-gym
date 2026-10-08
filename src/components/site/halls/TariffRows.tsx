import { formatTariffPrice } from "@/lib/presentation/tariff-labels";
import { CheckCircleSym, CheckSym } from "@/components/symbols";
import type { TariffView, PricesText } from "@/components/site/halls/types";
import { tariffLabel, tariffTags } from "@/components/site/halls/tariff-text";

/** Список Тарифов с пометками Аудитории и Времени доступа и ценой справа. */
export function TariffRows({ p, items, accent }: { p: PricesText; items: TariffView[]; accent?: boolean }) {
  const Check = accent ? CheckCircleSym : CheckSym;
  return (
    <ul className="flex flex-col gap-3 text-body-md text-text-primary">
      {items.map((x) => {
        const tags = tariffTags(p, x);
        return (
          <li key={x.id} className="flex items-start gap-2">
            <Check className="mt-px h-[18px] w-[18px] shrink-0 text-primary-container" />
            <span className="min-w-0 grow">
              {tariffLabel(p, x)}
              {tags.length > 0 && <span className="block text-body-sm text-text-muted">{tags.join(" · ")}</span>}
            </span>
            <span className="shrink-0 whitespace-nowrap font-bold">{formatTariffPrice(x)}</span>
          </li>
        );
      })}
    </ul>
  );
}
