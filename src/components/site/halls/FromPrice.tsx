import { formatNumber } from "@/lib/presentation/tariff-labels";
import type { PricesText } from "@/components/site/halls/types";

/** Крупная цена «от …» в карточке Категории. */
export function FromPrice({ p, value, accent, caption }: { p: PricesText; value: number | null; accent?: boolean; caption?: string }) {
  const [before, after] = p.fromTemplate.split("{price}");
  if (value === null) return <div className="my-6 text-price-numeral text-text-muted">{p.ask}</div>;
  return (
    <div className="my-6">
      <div className="flex items-baseline gap-1">
        {before.trim() && <span className="text-body-sm text-text-muted">{before.trim()}</span>}
        <span
          className={
            accent
              ? "text-[36px] font-extrabold leading-8 tracking-[-0.01em] text-primary-container"
              : "text-price-numeral text-text-primary"
          }
        >
          {formatNumber(value)}
        </span>
        <span className="text-headline-sm text-primary-container">₸</span>
        {after.trim() && <span className="text-body-sm text-text-muted">{after.trim()}</span>}
      </div>
      {caption && <span className="text-body-sm text-text-muted">{caption}</span>}
    </div>
  );
}
