import Link from "next/link";
import { listHallTariffs } from "@/modules/tariffs";
import { HALL_CATEGORIES, isHall } from "@/modules/tariffs/client";
import { CATEGORY_LABEL_RU, formatPrice } from "@/modules/tariffs/client";
import { PlusIcon } from "@/components/icons";
import { HallFilter } from "../AdminNav";
import { Empty, Notice, PageHead, btnPrimary, card } from "../../ui";
import { TariffRow } from "./TariffRow";

// Тарифы — по макету А4 (design/stitch/admin/a4-tarify-mobile.png): Зал, «Добавить тариф», группы по Категориям
// с «от … на сайте» и карточки Тарифов. Пометку «хит» и «синхронизировано» из макета не взяли — таких полей нет.
export const dynamic = "force-dynamic";

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ hall?: string; saved?: string; deleted?: string }>;
}) {
  const { hall: rawHall, saved, deleted } = await searchParams;
  const hall = rawHall && isHall(rawHall) ? rawHall : "general";
  // Позиции прайса Зала; Тарифы Тренеров правятся в разделе «Тренеры»
  const { tariffs, trainerTariffCount } = await listHallTariffs(hall);

  return (
    <>
      <PageHead title="Тарифы и абонементы" subtitle="Цены на сайте клуба — изменения появляются сразу" />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,24rem)_auto] lg:items-center lg:justify-between">
        <HallFilter base="/admin/tariffs" hall={hall} />
        <Link href={`/admin/tariffs/new?hall=${hall}`} className={`${btnPrimary} mb-6 normal-case tracking-normal`}>
          <PlusIcon />
          Добавить тариф
        </Link>
      </div>

      {(saved || deleted) && (
        <div className="mb-6">
          <Notice tone="ok">{saved ? "Сохранено — уже на сайте" : "Тариф удалён"}</Notice>
        </div>
      )}

      <div className="space-y-8">
        {HALL_CATEGORIES.map((cat) => {
          const list = tariffs.filter((t) => t.category === cat);
          const visible = list.filter((t) => t.isVisible);
          const min = visible.length ? Math.min(...visible.map((t) => t.price)) : null;
          return (
            <section key={cat}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  {CATEGORY_LABEL_RU[cat]}
                  <span className="rounded-md bg-card-2 px-2 text-sm text-muted">{list.length}</span>
                </h2>
                <span className="text-sm text-muted">{min !== null ? `от ${formatPrice(min)} на сайте` : "на сайте «уточняйте»"}</span>
              </div>
              {list.length === 0 ? (
                <Empty>Пока нет тарифов в этой категории.</Empty>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((t) => (
                    <TariffRow key={t.id} t={t} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section>
          <h2 className="mb-3 text-xl font-bold">Персональная тренировка</h2>
          <p className={`${card} text-sm text-muted`}>
            Цены на персональные тренировки у каждого тренера свои ({trainerTariffCount} в этом зале). Они правятся в разделе{" "}
            <Link href={`/admin/trainers?hall=${hall}`} className="text-accent underline underline-offset-2">
              Тренеры
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
