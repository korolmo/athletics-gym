import Link from "next/link";
import { type TariffShape } from "@/lib/domain/tariff";
import { formatTariffPrice, tariffLabelRu, tariffTagsRu } from "@/lib/presentation/tariff-labels";
import { PencilIcon } from "@/components/icons";
import { toggleTariff } from "./actions";

/** Строка Тарифа в списках админки: название из полей, пометки, цена, переключатель и правка. */
export function TariffRow({ t }: { t: TariffShape & { id: string; isVisible: boolean } }) {
  const tags = tariffTagsRu(t);
  const name = tariffLabelRu(t);
  return (
    <li className={`flex items-center gap-3 rounded-2xl bg-card p-4 ${t.isVisible ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-snug">{name}</div>
        {tags.length > 0 && <div className="mt-0.5 text-sm text-muted">{tags.join(" · ")}</div>}
      </div>
      <div className="max-w-[7.5rem] shrink-0 text-right font-display text-xl leading-tight">{formatTariffPrice(t)}</div>
      <form action={toggleTariff}>
        <input type="hidden" name="id" value={t.id} />
        <button
          type="submit"
          role="switch"
          aria-checked={t.isVisible}
          aria-label={t.isVisible ? "Скрыть с сайта" : "Показать на сайте"}
          title={t.isVisible ? "Показывается на сайте" : "Скрыт с сайта"}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${t.isVisible ? "bg-accent" : "bg-line"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${t.isVisible ? "left-6" : "left-1"}`}
          />
        </button>
      </form>
      <Link
        href={`/admin/tariffs/${t.id}`}
        aria-label={`Редактировать: ${name}${tags.length ? `, ${tags.join(", ")}` : ""}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent"
      >
        <PencilIcon />
      </Link>
    </li>
  );
}
