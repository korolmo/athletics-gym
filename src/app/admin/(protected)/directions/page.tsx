import Image from "next/image";
import Link from "next/link";
import { listDirections } from "@/lib/services/directions";
import { DIRECTION_ICONS, isDirectionIcon } from "@/lib/domain/direction";
import { DIRECTION_ICON } from "@/components/site/direction-icons";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { moveDirection, toggleDirection } from "./actions";

export const dynamic = "force-dynamic";

const square =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted";

export default async function DirectionsPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const { saved, deleted } = await searchParams;
  const directions = await listDirections();
  const visible = directions.filter((d) => d.isVisible).length;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Направления</h1>
        <p className="mt-1 text-sm text-muted">
          С чем помогают тренеры зала — блок «С чем помогут тренеры» на сайте. На сайте: {visible}
          {visible === 0 ? " — блок не показывается, пока нет ни одного видимого направления." : "."}
        </p>
      </div>

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено — уже на сайте" : "Направление удалено"}
        </div>
      )}

      {directions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
          Направлений пока нет. Добавьте первое — блок появится на сайте.
        </p>
      ) : (
        <ul className="space-y-2">
          {directions.map((d, i) => {
            const Icon = DIRECTION_ICON[isDirectionIcon(d.icon) ? d.icon : DIRECTION_ICONS[0]];
            return (
              <li key={d.id} className={`rounded-2xl bg-card p-3 ${d.isVisible ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg text-accent">
                    {d.photoUrl ? <Image src={d.photoUrl} alt="" fill sizes="48px" className="object-cover" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-snug [overflow-wrap:anywhere]">{d.titleRu}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {d.isVisible ? (d.descriptionRu ?? (d.photoUrl ? "Своё фото" : "Без описания")) : "Скрыто с сайта"}
                    </div>
                  </div>
                  <form action={toggleDirection}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={d.isVisible}
                      aria-label={d.isVisible ? `Скрыть с сайта: ${d.titleRu}` : `Показать на сайте: ${d.titleRu}`}
                      title={d.isVisible ? "Показывается на сайте" : "Скрыто с сайта"}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${d.isVisible ? "bg-accent" : "bg-line"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${d.isVisible ? "left-6" : "left-1"}`} />
                    </button>
                  </form>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
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
                  <Link href={`/admin/directions/${d.id}`} aria-label={`Редактировать: ${d.titleRu}`} className={square}>
                    <PencilIcon />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/admin/directions/new"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-4 font-semibold text-accent-ink shadow-lg shadow-black/40"
      >
        <PlusIcon />
        Добавить направление
      </Link>
    </>
  );
}
