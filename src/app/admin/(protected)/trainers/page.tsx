import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { isHall } from "@/lib/domain/tariff";
import { formatPrice } from "@/lib/presentation/tariff-labels";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { HallFilter } from "../AdminNav";
import { toggleTrainer } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<{ hall?: string; deleted?: string }>;
}) {
  await requireOwner();
  const { hall: rawHall, deleted } = await searchParams;
  const hall = rawHall && isHall(rawHall) ? rawHall : "general";
  const trainers = await db.trainer.findMany({
    where: { hallId: hall },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { tariffs: { where: { isVisible: true } } },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Тренеры</h1>
        <p className="mt-1 text-sm text-muted">Изменения сразу появляются на сайте.</p>
      </div>

      <HallFilter base="/admin/trainers" hall={hall} />

      {deleted && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          Тренер удалён
        </div>
      )}

      {trainers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
          В этом зале пока нет тренеров.
        </p>
      ) : (
        <ul className="space-y-2">
          {trainers.map((tr) => {
            const min = tr.tariffs.length ? Math.min(...tr.tariffs.map((t) => t.price)) : null;
            return (
              <li key={tr.id} className={`flex items-center gap-3 rounded-2xl bg-card p-3 ${tr.isVisible ? "" : "opacity-60"}`}>
                {tr.photo ? (
                  <Image
                    src={tr.photo}
                    alt=""
                    width={56}
                    height={72}
                    className="h-[72px] w-14 shrink-0 rounded-lg object-cover object-top"
                  />
                ) : (
                  <div className="h-[72px] w-14 shrink-0 rounded-lg bg-card-2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{tr.name}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {tr.tariffs.length === 0 ? "Нет тарифов на сайте" : `Тарифов: ${tr.tariffs.length} · от ${formatPrice(min ?? 0)}`}
                  </div>
                </div>
                <form action={toggleTrainer}>
                  <input type="hidden" name="id" value={tr.id} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={tr.isVisible}
                    aria-label={tr.isVisible ? `Скрыть с сайта: ${tr.name}` : `Показать на сайте: ${tr.name}`}
                    title={tr.isVisible ? "Показывается на сайте" : "Скрыт с сайта"}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${tr.isVisible ? "bg-accent" : "bg-line"}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${tr.isVisible ? "left-6" : "left-1"}`}
                    />
                  </button>
                </form>
                <Link
                  href={`/admin/trainers/${tr.id}`}
                  aria-label={`Редактировать: ${tr.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent"
                >
                  <PencilIcon />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted">
        Загрузка фото появится на следующем этапе. Сейчас фото — карточки из папки проекта; у новых тренеров фото пока нет.
      </p>

      <Link
        href={`/admin/trainers/new?hall=${hall}`}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-4 font-semibold text-accent-ink shadow-lg shadow-black/40"
      >
        <PlusIcon />
        Добавить тренера
      </Link>
    </>
  );
}
