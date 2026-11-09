import Image from "next/image";
import Link from "next/link";
import { listDirections } from "@/modules/directions";
import { DIRECTION_ICONS, isDirectionIcon } from "@/modules/directions/client";
import { DIRECTION_ICON } from "@/components/site/direction-icons";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { Empty, Notice, PageHead, btnPrimary, card } from "../../ui";
import { moveDirection, toggleDirection } from "./actions";

// Направления — по макету А6 (design/stitch/admin/a6-napravleniya-mobile.png): номер, иконка или фото, название,
// описание, «На сайте» и правка. Порядок — стрелками вверх/вниз: перетаскивания из макета нет — стрелки работают
// без скриптов и на телефоне надёжнее.
export const dynamic = "force-dynamic";

const square =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted";

export default async function DirectionsPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const { saved, deleted } = await searchParams;
  const directions = await listDirections();
  const visible = directions.filter((d) => d.isVisible).length;

  return (
    <>
      <PageHead
        title="Направления тренировок"
        subtitle="Блок «С чем помогут тренеры» на главной: список, порядок и показ"
        aside={<span className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-muted">на сайте: {visible}</span>}
      />

      <Link href="/admin/directions/new" className={`${btnPrimary} mb-6 w-full normal-case tracking-normal lg:w-auto`}>
        <PlusIcon />
        Добавить направление
      </Link>

      {(saved || deleted) && (
        <div className="mb-6">
          <Notice tone="ok">{saved ? "Сохранено — уже на сайте" : "Направление удалено"}</Notice>
        </div>
      )}
      {visible === 0 && directions.length > 0 && (
        <div className="mb-6">
          <Notice tone="error">Блок не показывается на сайте, пока нет ни одного видимого направления.</Notice>
        </div>
      )}

      {directions.length === 0 ? (
        <Empty>Направлений пока нет. Добавьте первое — блок появится на сайте.</Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {directions.map((d, i) => {
            const Icon = DIRECTION_ICON[isDirectionIcon(d.icon) ? d.icon : DIRECTION_ICONS[0]];
            return (
              <li key={d.id} className={`${card} p-4 ${d.isVisible ? "" : "border-dashed opacity-75"}`}>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent/10 text-accent">
                    {d.photoUrl ? <Image src={d.photoUrl} alt="" fill sizes="56px" className="object-cover" /> : <Icon className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-accent">#{i + 1}</span>
                      <span className="truncate text-lg font-bold">{d.titleRu}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-sm text-muted">{d.descriptionRu ?? (d.photoUrl ? "Своё фото" : "Без описания")}</div>
                  </div>
                  <form action={toggleDirection}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={d.isVisible}
                      aria-label={d.isVisible ? `Скрыть с сайта: ${d.titleRu}` : `Показать на сайте: ${d.titleRu}`}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${d.isVisible ? "bg-accent" : "bg-line"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${d.isVisible ? "left-6 bg-accent-ink" : "left-1 bg-muted"}`} />
                    </button>
                  </form>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className={`text-sm font-semibold ${d.isVisible ? "text-wa" : "text-muted"}`}>● {d.isVisible ? "На сайте" : "Скрыто"}</span>
                  <span className="flex gap-2">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveDirection}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="direction" value={dir} />
                        <button
                          type="submit"
                          disabled={dir === "up" ? i === 0 : i === directions.length - 1}
                          aria-label={`${dir === "up" ? "Выше" : "Ниже"}: ${d.titleRu}`}
                          className={square}
                        >
                          {dir === "up" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                    <Link href={`/admin/directions/${d.id}`} aria-label={`Редактировать: ${d.titleRu}`} className={`${square} text-accent`}>
                      <PencilIcon />
                    </Link>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
