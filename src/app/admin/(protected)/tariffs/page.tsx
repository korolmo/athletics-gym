import Link from "next/link";
import { db } from "@/lib/db";
import {
  CATEGORY_LABEL_RU,
  CATEGORY_ORDER,
  UNIT_LABEL_RU,
  formatPrice,
  isUnit,
} from "@/lib/tariffs";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { toggleTariff } from "./actions";

export const dynamic = "force-dynamic";

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { saved, deleted } = await searchParams;
  const tariffs = await db.tariff.findMany({ orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide">Тарифы</h1>
          <p className="mt-1 text-sm text-muted">Изменения сразу появляются на сайте.</p>
        </div>
      </div>

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено — уже на сайте" : "Тариф удалён"}
        </div>
      )}

      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const list = tariffs.filter((t) => t.category === cat);
          const visible = list.filter((t) => t.isVisible);
          const min = visible.length ? Math.min(...visible.map((t) => t.price)) : null;
          return (
            <section key={cat}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl uppercase tracking-wide">{CATEGORY_LABEL_RU[cat]}</h2>
                <span className="text-xs text-muted">
                  На сайте: {min !== null ? `от ${formatPrice(min)}` : "«уточняйте»"}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
                  Пока нет тарифов в этой категории.
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className={`flex items-center gap-3 rounded-2xl bg-card p-4 ${t.isVisible ? "" : "opacity-60"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{t.nameRu}</div>
                        <div className="mt-0.5 text-sm text-muted">
                          {t.durationValue} {isUnit(t.durationUnit) ? UNIT_LABEL_RU[t.durationUnit] : ""}
                          {!t.nameKk && <span className="ml-2 text-xs text-muted/70">· нет KZ</span>}
                        </div>
                      </div>
                      <div className="shrink-0 font-display text-2xl">{formatPrice(t.price)}</div>
                      <form action={toggleTariff}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={t.isVisible}
                          aria-label={t.isVisible ? "Скрыть с сайта" : "Показать на сайте"}
                          title={t.isVisible ? "Показывается на сайте" : "Скрыт с сайта"}
                          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                            t.isVisible ? "bg-accent" : "bg-line"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${
                              t.isVisible ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      </form>
                      <Link
                        href={`/admin/tariffs/${t.id}`}
                        aria-label={`Редактировать: ${t.nameRu}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent"
                      >
                        <PencilIcon />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Link
        href="/admin/tariffs/new"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-4 font-semibold text-accent-ink shadow-lg shadow-black/40"
      >
        <PlusIcon />
        Добавить тариф
      </Link>
    </>
  );
}
