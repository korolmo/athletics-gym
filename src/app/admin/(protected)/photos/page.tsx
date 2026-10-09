import Image from "next/image";
import Link from "next/link";
import { getSinglePhotos, listGallery } from "@/lib/services/photos";
import { GALLERY_FIRST, MAX_FILE_BYTES, formatMegabytes } from "@/lib/domain/photo";
import { HALLS } from "@/lib/domain/tariff";
import { HALL_LABEL_RU } from "@/lib/presentation/tariff-labels";
import { PencilIcon } from "@/components/icons";
import { moveGalleryPhoto, toggleGalleryPhoto } from "./actions";
import { PhotoSlot } from "./PhotoSlot";
import { PhotoUploader } from "./PhotoUploader";

export const dynamic = "force-dynamic";

const h2 = "mb-3 font-display text-xl uppercase tracking-wide";
const square =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted";

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const { saved, deleted } = await searchParams;
  const [single, gallery] = await Promise.all([getSinglePhotos(), listGallery()]);
  const off = !single.configured;
  const visible = gallery.filter((p) => p.isVisible).length;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Фото</h1>
        <p className="mt-1 text-sm text-muted">
          Фото сжимается на телефоне перед загрузкой. Подходят JPEG, PNG и WebP, после сжатия — до{" "}
          {formatMegabytes(MAX_FILE_BYTES)}.
        </p>
      </div>

      {off && (
        <div role="alert" className="mb-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Хранилище фото не настроено — загрузка недоступна. Сообщите разработчику.
        </div>
      )}

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено — уже на сайте" : "Фото удалено"}
        </div>
      )}

      <section>
        <h2 className={h2}>Главная</h2>
        <div className="space-y-3">
          <PhotoSlot
            target="hero"
            title="Фон первого экрана"
            note="Большое фото справа от девиза. Лучше вертикальное или квадратное."
            url={single.hero}
            fallback="/stitch/hero.jpg"
            disabled={off}
          />
          <PhotoSlot
            target="women"
            title="Женский зал"
            note="Фото в блоке «Женский зал», справа от текста."
            url={single.women}
            emptyNote="Не загружено — на сайте там логотип Женского зала"
            disabled={off}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className={h2}>Плакаты прайса</h2>
        <p className="mb-3 text-sm text-muted">
          Фото прайса, как он висит в зале. На сайте открывается кнопкой в блоке «Цены» у своего зала.
        </p>
        <div className="space-y-3">
          {HALLS.map((hall) => (
            <PhotoSlot
              key={hall}
              target={`hall:${hall}`}
              title={HALL_LABEL_RU[hall]}
              note="Плакат прайса этого зала"
              url={single.posters[hall] ?? null}
              shape="tall"
              disabled={off}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className={h2}>Плакаты тренеров</h2>
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
          Плакат тренера меняется на его странице в разделе{" "}
          <Link href="/admin/trainers" className="text-accent hover:underline">
            Тренеры
          </Link>
          .
        </p>
      </section>

      <section id="gallery" className="mt-8 scroll-mt-28">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl uppercase tracking-wide">Галерея</h2>
          <span className="text-xs text-muted">
            На сайте: {visible > 0 ? `${visible}, сразу видно ${Math.min(visible, GALLERY_FIRST)}` : "демо-картинки"}
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          Можно выбрать сразу несколько фото. Первые {GALLERY_FIRST} видны на сайте сразу, остальные — по кнопке «Ещё».
          Пока в Галерее нет ни одного своего фото, сайт показывает демо-картинки.
        </p>
        <PhotoUploader target="gallery" label="Добавить фото в Галерею" multiple disabled={off} />

        {gallery.length > 0 && (
          <ul className="mt-4 space-y-2">
            {gallery.map((p, i) => {
              const name = p.captionRu ?? "Без подписи";
              return (
                <li key={p.id} className={`rounded-2xl bg-card p-3 ${p.isVisible ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-bg">
                      {p.url && <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`leading-snug [overflow-wrap:anywhere] ${p.captionRu ? "font-semibold" : "text-muted"}`}>
                        {name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {p.isVisible ? `Место ${i + 1}` : "Скрыто с сайта"}
                      </div>
                    </div>
                    <form action={toggleGalleryPhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        role="switch"
                        aria-checked={p.isVisible}
                        aria-label={p.isVisible ? `Скрыть с сайта: фото ${i + 1}` : `Показать на сайте: фото ${i + 1}`}
                        title={p.isVisible ? "Показывается на сайте" : "Скрыто с сайта"}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${p.isVisible ? "bg-accent" : "bg-line"}`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${p.isVisible ? "left-6" : "left-1"}`}
                        />
                      </button>
                    </form>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <form action={moveGalleryPhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={`Выше: фото ${i + 1}`} className={square}>
                        ↑
                      </button>
                    </form>
                    <form action={moveGalleryPhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === gallery.length - 1}
                        aria-label={`Ниже: фото ${i + 1}`}
                        className={square}
                      >
                        ↓
                      </button>
                    </form>
                    <Link href={`/admin/photos/${p.id}`} aria-label={`Подпись и удаление: фото ${i + 1}`} className={square}>
                      <PencilIcon />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
