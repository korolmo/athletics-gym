import Link from "next/link";
import { type TariffShape } from "@/modules/tariffs/client";
import { formatTariffPrice, tariffLabelRu, tariffTagsRu } from "@/modules/tariffs/client";
import { PencilIcon } from "@/components/icons";
import { toggleTariff } from "./actions";

/**
 * Карточка Тарифа в списках админки — по макету А4 (design/stitch/admin/a4-tarify-mobile.png): название, пометки,
 * цена крупно, внизу «На сайте клуба» и переключатель; карандаш — правка.
 */
export function TariffRow({ t }: { t: TariffShape & { id: string; isVisible: boolean } }) {
  const tags = tariffTagsRu(t);
  const name = tariffLabelRu(t);
  return (
    <li className={`rounded-2xl border bg-card p-4 ${t.isVisible ? "border-line" : "border-dashed border-line opacity-75"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-snug">{name}</div>
          {tags.length > 0 && <div className="mt-0.5 text-sm text-muted">{tags.join(" · ")}</div>}
        </div>
        <Link
          href={`/admin/tariffs/${t.id}`}
          aria-label={`Редактировать: ${name}${tags.length ? `, ${tags.join(", ")}` : ""}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-muted hover:text-accent"
        >
          <PencilIcon />
        </Link>
      </div>
      <div className="mt-3 text-3xl font-extrabold leading-none">{formatTariffPrice(t)}</div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className={`flex items-center gap-2 text-sm font-semibold ${t.isVisible ? "text-fg" : "text-muted"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${t.isVisible ? "bg-wa" : "bg-muted"}`} />
          {t.isVisible ? "На сайте клуба" : "Скрыт с сайта"}
        </span>
        <form action={toggleTariff}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            role="switch"
            aria-checked={t.isVisible}
            aria-label={t.isVisible ? "Скрыть с сайта" : "Показать на сайте"}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${t.isVisible ? "bg-wa" : "bg-line"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-fg transition-all ${t.isVisible ? "left-6" : "left-1"}`} />
          </button>
        </form>
      </div>
    </li>
  );
}
