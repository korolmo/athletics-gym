import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORY_LABEL_RU, HALL_CATEGORIES, formatPrice, isHall } from "@/lib/tariffs";
import { PlusIcon } from "@/components/icons";
import { HallFilter } from "../AdminNav";
import { TariffRow } from "./TariffRow";

export const dynamic = "force-dynamic";

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ hall?: string; saved?: string; deleted?: string }>;
}) {
  const { hall: rawHall, saved, deleted } = await searchParams;
  const hall = rawHall && isHall(rawHall) ? rawHall : "general";
  // Позиции прайса Зала; Тарифы Тренеров правятся в разделе «Тренеры»
  const [tariffs, trainerTariffCount] = await Promise.all([
    db.tariff.findMany({ where: { hallId: hall, trainerId: null }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    db.tariff.count({ where: { hallId: hall, trainerId: { not: null } } }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Тарифы</h1>
        <p className="mt-1 text-sm text-muted">Изменения сразу появляются на сайте.</p>
      </div>

      <HallFilter base="/admin/tariffs" hall={hall} />

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено — уже на сайте" : "Тариф удалён"}
        </div>
      )}

      <div className="space-y-8">
        {HALL_CATEGORIES.map((cat) => {
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
                    <TariffRow key={t.id} t={t} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Персональные тренировки</h2>
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
            Цены на персональные тренировки — у каждого тренера свои ({trainerTariffCount} в этом зале). Они правятся в
            разделе{" "}
            <Link href={`/admin/trainers?hall=${hall}`} className="text-accent hover:underline">
              Тренеры
            </Link>
            .
          </p>
        </section>
      </div>

      <Link
        href={`/admin/tariffs/new?hall=${hall}`}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-4 font-semibold text-accent-ink shadow-lg shadow-black/40"
      >
        <PlusIcon />
        Добавить тариф
      </Link>
    </>
  );
}
