import Image from "next/image";
import Link from "next/link";
import { listTrainers } from "@/modules/trainers";
import { getScheduleForAdmin } from "@/modules/schedule";
import { getClubOnce } from "@/app/brand";
import { mediaUrl } from "@/modules/photos";
import { isHall } from "@/modules/tariffs/client";
import { formatPrice } from "@/modules/tariffs/client";
import { PencilIcon, PlusIcon, UserIcon } from "@/components/icons";
import { HallFilter } from "../AdminNav";
import { Empty, Notice, PageHead, btnPrimary } from "../../ui";
import { toggleTrainer } from "./actions";

// Тренеры — по макету А5 (design/stitch/admin/a5-trenery-mobile.png): плакат 3:4, имя, описание, тарифы и дни работы,
// «На сайте» и правка. Должности, стаж и «В отпуске» из макета не взяты — таких полей у Тренера нет
// (отпуск — это Исключение в часах работы).
export const dynamic = "force-dynamic";

const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/** «пн–сб», «пн, ср, пт», «часы не заданы» — по дням недели с интервалами работы. */
function daysLabel(weekdays: number[]): string {
  const d = [...new Set(weekdays)].sort((a, b) => a - b);
  if (d.length === 0) return "часы не заданы";
  const contiguous = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  return contiguous && d.length > 2 ? `${WD[d[0] - 1]}–${WD[d[d.length - 1] - 1]}` : d.map((x) => WD[x - 1]).join(", ");
}

export default async function TrainersPage({ searchParams }: { searchParams: Promise<{ hall?: string; deleted?: string }> }) {
  const { hall: rawHall, deleted } = await searchParams;
  const hall = rawHall && isHall(rawHall) ? rawHall : "general";
  const trainers = await listTrainers(hall);
  const { timeZone } = await getClubOnce();
  const schedules = await Promise.all(trainers.map((t) => getScheduleForAdmin(t.id, timeZone)));
  const visible = trainers.filter((t) => t.isVisible).length;

  return (
    <>
      <PageHead title="Тренеры" subtitle="Карточки тренеров на сайте, их тарифы и часы работы" />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,24rem)_auto] lg:items-center lg:justify-between">
        <HallFilter base="/admin/trainers" hall={hall} />
        <Link href={`/admin/trainers/new?hall=${hall}`} className={`${btnPrimary} mb-6 normal-case tracking-normal`}>
          <PlusIcon />
          Добавить тренера
        </Link>
      </div>

      {deleted && (
        <div className="mb-6">
          <Notice tone="ok">Тренер удалён</Notice>
        </div>
      )}

      <p className="mb-4 flex items-center gap-3 text-sm text-muted">
        Всего: <b className="text-fg">{trainers.length}</b> · <span className="text-wa">● на сайте: {visible}</span>
      </p>

      {trainers.length === 0 ? (
        <Empty>В этом зале пока нет тренеров.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trainers.map((tr, i) => {
            const min = tr.tariffs.length ? Math.min(...tr.tariffs.map((t) => t.price)) : null;
            const poster = mediaUrl(tr.uploadedPhoto) ?? tr.photo;
            return (
              <li key={tr.id} className={`rounded-2xl border bg-card p-4 ${tr.isVisible ? "border-line" : "border-dashed border-line opacity-75"}`}>
                <div className="flex gap-4">
                  <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-card-2">
                    {poster ? (
                      <Image src={poster} alt="" fill sizes="96px" className={`object-cover object-top ${tr.isVisible ? "" : "grayscale"}`} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-muted">
                        <UserIcon className="h-8 w-8" />
                      </span>
                    )}
                    {tr.isVisible && <span aria-hidden="true" className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-wa ring-2 ring-card" />}
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 text-xs font-bold">#{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold">{tr.name}</h2>
                    {tr.descriptionRu && <p className="mt-1 line-clamp-2 text-sm text-muted">{tr.descriptionRu}</p>}
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <span className="text-accent">{tr.tariffs.length ? `${tr.tariffs.length} тариф. · от ${formatPrice(min ?? 0)}` : "нет тарифов"}</span>
                      <span className="text-muted">{daysLabel(schedules[i].workHours.map((w) => w.weekday))}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <form action={toggleTrainer} className="flex items-center gap-3">
                    <input type="hidden" name="id" value={tr.id} />
                    <span className="text-sm font-semibold">На сайте</span>
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={tr.isVisible}
                      aria-label={tr.isVisible ? `Скрыть с сайта: ${tr.name}` : `Показать на сайте: ${tr.name}`}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${tr.isVisible ? "bg-accent" : "bg-line"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${tr.isVisible ? "left-6 bg-accent-ink" : "left-1 bg-muted"}`} />
                    </button>
                  </form>
                  <Link
                    href={`/admin/trainers/${tr.id}`}
                    aria-label={`Редактировать: ${tr.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg text-accent hover:brightness-110"
                  >
                    <PencilIcon />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
