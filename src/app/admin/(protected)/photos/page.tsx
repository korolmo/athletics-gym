import Image from "next/image";
import Link from "next/link";
import { isStorageConfigured, listGallery, mediaStatus, mediaUrl } from "@/modules/photos";
import { getSettingsPhotos } from "@/modules/site";
import { GALLERY_FIRST, MAX_FILE_BYTES, formatMegabytes } from "@/modules/photos";
import { HALLS, HALL_LABEL_RU, listPricePosters } from "@/modules/tariffs";
import { listTrainers } from "@/modules/trainers";
import { PencilIcon, PlusIcon, UserIcon } from "@/components/icons";
import { Notice, PageHead, card } from "../../ui";
import { moveGalleryPhoto, toggleGalleryPhoto } from "./actions";
import { PhotoSlot } from "./PhotoSlot";
import { PhotoUploader } from "./PhotoUploader";

// Фото — по макету А7 (design/stitch/admin/a7-foto-mobile.png): хранилище, «1. Главная», «2. Плакаты прайса»,
// «3. Плакаты тренеров», «4. Галерея». Шкала хранилища — только на hoster.kz (диск с лимитом MEDIA_QUOTA_MB);
// «CDN-ускорения» и «AVIF» из макета нет: фото сжимаются в WebP в браузере перед загрузкой.
export const dynamic = "force-dynamic";

const square =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted";

function SectionHead({ n, title, note }: { n: number; title: string; note: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-extrabold uppercase">
        <span className="text-accent">{n}.</span> {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const { saved, deleted } = await searchParams;
  const [single, gallery, posters, status, general, women] = await Promise.all([
    getSettingsPhotos(),
    listGallery(),
    listPricePosters(),
    mediaStatus().catch((): Record<string, unknown> => ({})),
    listTrainers("general"),
    listTrainers("women"),
  ]);
  const off = !isStorageConfigured();
  const visible = gallery.filter((p) => p.isVisible).length;
  const used = typeof status.usedMb === "number" ? status.usedMb : null;
  const quota = typeof status.quotaMb === "number" ? status.quotaMb : null;
  const trainers = [...general, ...women];

  return (
    <>
      <PageHead
        title="Фото"
        subtitle={`Изображения на сайте: первый экран, плакаты и Галерея. Фото сжимается перед загрузкой — до ${formatMegabytes(MAX_FILE_BYTES)}.`}
      />

      {off && (
        <div className="mb-6">
          <Notice tone="error">Хранилище фото не настроено — загрузка недоступна. Сообщите разработчику.</Notice>
        </div>
      )}
      {(saved || deleted) && (
        <div className="mb-6">
          <Notice tone="ok">{saved ? "Сохранено — уже на сайте" : "Фото удалено"}</Notice>
        </div>
      )}

      {used !== null && quota !== null && (
        <section className={`${card} mb-8`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">Хранилище файлов</h2>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">{Math.round((used / quota) * 100)}% занято</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold">
            {used} МБ <span className="text-base font-semibold text-muted">из {quota} МБ</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((used / quota) * 100))}%` }} />
          </div>
        </section>
      )}

      <section>
        <SectionHead n={1} title="Главная" note="Фон первого экрана и фото блока «Женский зал»" />
        <div className="grid gap-4 lg:grid-cols-2">
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

      <section className="mt-10">
        <SectionHead n={2} title="Плакаты прайса" note="Прайс, как он висит в зале. На сайте открывается кнопкой в блоке «Цены» у своего зала." />
        <div className="grid gap-4 lg:grid-cols-2">
          {HALLS.map((hall) => (
            <PhotoSlot key={hall} target={`hall:${hall}`} title={HALL_LABEL_RU[hall]} note="Плакат прайса этого зала" url={posters[hall] ?? null} shape="tall" disabled={off} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHead n={3} title="Плакаты тренеров" note="Вертикальные карточки 3:4 — меняются на странице тренера" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {trainers.map((t) => {
            const poster = mediaUrl(t.uploadedPhoto) ?? t.photo;
            return (
              <li key={t.id} className={`${card} p-2`}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-bg">
                  {poster ? (
                    <Image src={poster} alt="" fill sizes="(min-width: 1024px) 200px, 45vw" className="object-cover object-top" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted">
                      <UserIcon className="h-8 w-8" />
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate px-1 font-semibold">{t.name}</p>
                <Link href={`/admin/trainers/${t.id}`} className="mt-2 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-card-2 text-sm font-semibold text-accent">
                  <PencilIcon className="h-4 w-4" />
                  Изменить
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/admin/trainers/new"
              className="flex aspect-[3/4] h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-3 text-center text-sm text-muted hover:border-accent hover:text-accent"
            >
              <PlusIcon />
              Новый тренер
            </Link>
          </li>
        </ul>
      </section>

      <section id="gallery" className="mt-10 scroll-mt-28">
        <SectionHead
          n={4}
          title="Галерея зала"
          note={
            visible > 0
              ? `На сайте: ${visible}, сразу видно ${Math.min(visible, GALLERY_FIRST)}, остальные — по кнопке «Ещё»`
              : "Своих фото пока нет — на сайте показываются демо-картинки"
          }
        />
        {gallery.length > 0 && (
          <ul className="mb-4 grid gap-3 lg:grid-cols-2">
            {gallery.map((p, i) => (
              <li key={p.id} className={`${card} flex items-center gap-3 p-3 ${p.isVisible ? "" : "border-dashed opacity-75"}`}>
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-bg">
                  {p.url && <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate ${p.captionRu ? "font-semibold" : "text-muted"}`}>{p.captionRu ?? "Без подписи"}</div>
                  <div className={`mt-0.5 text-xs ${p.isVisible ? "text-wa" : "text-muted"}`}>● {p.isVisible ? `На сайте, место ${i + 1}` : "Скрыто с сайта"}</div>
                </div>
                <form action={toggleGalleryPhoto}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={p.isVisible}
                    aria-label={p.isVisible ? `Скрыть с сайта: фото ${i + 1}` : `Показать на сайте: фото ${i + 1}`}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${p.isVisible ? "bg-accent" : "bg-line"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${p.isVisible ? "left-6 bg-accent-ink" : "left-1 bg-muted"}`} />
                  </button>
                </form>
                <span className="flex flex-col gap-1">
                  <form action={moveGalleryPhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={i === 0} aria-label={`Выше: фото ${i + 1}`} className={`${square} h-8`}>
                      ↑
                    </button>
                  </form>
                  <form action={moveGalleryPhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={i === gallery.length - 1} aria-label={`Ниже: фото ${i + 1}`} className={`${square} h-8`}>
                      ↓
                    </button>
                  </form>
                </span>
                <Link href={`/admin/photos/${p.id}`} aria-label={`Подпись и удаление: фото ${i + 1}`} className={`${square} text-accent`}>
                  <PencilIcon />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-2xl border-2 border-dashed border-line p-6 text-center">
          <p className="mb-1 font-bold">Добавить в Галерею</p>
          <p className="mb-4 text-sm text-muted">Можно выбрать сразу несколько фото. JPEG, PNG или WebP — сожмём сами.</p>
          <PhotoUploader target="gallery" label="Загрузить фото" multiple disabled={off} />
        </div>
      </section>
    </>
  );
}
