import Link from "next/link";
import { getSettingsForEdit } from "@/lib/services/site-settings";
import {
  BLOCKS,
  SHOW_COLUMN,
  formatRating,
  isSettingsForm,
  type BlockId,
} from "@/lib/domain/site-settings";
import { BLOCK_LABEL_RU, SETTINGS_FORM_LABEL_RU } from "@/lib/presentation/site-settings-labels";
import { plural } from "@/lib/presentation/tariff-labels";
import { PencilIcon } from "@/components/icons";
import { toggleBlock } from "./actions";

export const dynamic = "force-dynamic";

/** Что в Блоке меняется в этом разделе; у остальных здесь только показ. */
const BLOCK_NOTE: Record<BlockId, string> = {
  about: "Четыре карточки",
  directions: "Только показ на сайте",
  women: "Текст и Instagram",
  prices: "Цены меняются в разделе «Тарифы»",
  gallery: "Только показ на сайте",
  trainers: "Тренеры меняются в разделе «Тренеры»",
  reviews: "Отзывы — в разделе «Отзывы». Пока опубликованных нет — только рейтинг 2ГИС и «Оставить отзыв»",
  contacts: "Адрес, часы, телефон, WhatsApp, Instagram",
};

const pencil =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:border-accent hover:text-accent";

export default async function SitePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { settings } = await getSettingsForEdit();

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Сайт</h1>
        <p className="mt-1 text-sm text-muted">Тексты и контакты главной страницы. Изменения сразу появляются на сайте.</p>
      </div>

      {saved && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          Сохранено — уже на сайте
        </div>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Блоки главной</h2>
        <ul className="space-y-2">
          {/* Первый экран есть всегда: его можно править, но нельзя скрыть */}
          <li className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug">{SETTINGS_FORM_LABEL_RU.hero}</div>
              <div className="mt-0.5 text-sm text-muted">Девиз и подзаголовок. Показывается всегда</div>
            </div>
            <Link href="/admin/site/hero" aria-label={`Редактировать: ${SETTINGS_FORM_LABEL_RU.hero}`} className={pencil}>
              <PencilIcon />
            </Link>
          </li>
          {BLOCKS.map((block) => {
            const shown = settings[SHOW_COLUMN[block]];
            const name = BLOCK_LABEL_RU[block];
            return (
              <li key={block} className={`flex items-center gap-3 rounded-2xl bg-card p-4 ${shown ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{name}</div>
                  <div className="mt-0.5 text-sm text-muted">{shown ? BLOCK_NOTE[block] : "Скрыт с сайта"}</div>
                </div>
                <form action={toggleBlock}>
                  <input type="hidden" name="block" value={block} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={shown}
                    aria-label={shown ? `Скрыть с сайта: ${name}` : `Показать на сайте: ${name}`}
                    title={shown ? "Показывается на сайте" : "Скрыт с сайта"}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${shown ? "bg-accent" : "bg-line"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-all ${shown ? "left-6" : "left-1"}`} />
                  </button>
                </form>
                {isSettingsForm(block) ? (
                  <Link href={`/admin/site/${block}`} aria-label={`Редактировать: ${name}`} className={pencil}>
                    <PencilIcon />
                  </Link>
                ) : (
                  // Место под кнопку правки — чтобы переключатели стояли в одну колонку
                  <span aria-hidden="true" className="h-10 w-10 shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Телефон, WhatsApp и Instagram из «Контактов» работают на всём сайте, даже если сам блок скрыт.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Рейтинг 2ГИС</h2>
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">
              ★ {formatRating(settings.ratingTenths)} · {settings.ratingCount}{" "}
              {plural(settings.ratingCount, ["оценка", "оценки", "оценок"])}
            </div>
            <div className="mt-0.5 text-sm text-muted">Показывается на первом экране и на карте</div>
          </div>
          <Link href="/admin/site/rating" aria-label="Редактировать: рейтинг 2ГИС" className={pencil}>
            <PencilIcon />
          </Link>
        </div>
      </section>
    </>
  );
}
