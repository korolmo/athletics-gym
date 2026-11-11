import Link from "next/link";
import { getSettingsForEdit } from "@/modules/site";
import { getClubForEdit } from "@/modules/club";
import {
  BLOCKS,
  SHOW_COLUMN,
  formatRating,
  isSettingsForm,
  type BlockId,
} from "@/modules/site/client";
import { LEGAL_PAGES, legalPath } from "@/modules/legal/client";
import { BLOCK_LABEL_RU, SETTINGS_FORM_LABEL_RU } from "@/modules/site/client";
import { plural } from "@/lib/plural";
import { PencilIcon } from "@/components/icons";
import { takeDemoSnapshotAction, toggleBlock } from "./actions";
import { getDemoStatus } from "@/modules/demo";
import { guestLoginEnabled, isGuest, requireOwner } from "@/modules/owner";
import { Notice, PageHead, card } from "../../ui";

export const dynamic = "force-dynamic";

/** Что в Блоке меняется в этом разделе; у остальных здесь только показ. */
const BLOCK_NOTE: Record<BlockId, string> = {
  marquee: "Лента с фактами о зале под первым экраном",
  about: "Четыре карточки",
  directions: "Направления меняются в разделе «Направления»",
  women: "Текст и Instagram",
  prices: "Цены меняются в разделе «Тарифы»",
  gallery: "Только показ на сайте",
  trainers: "Тренеры меняются в разделе «Тренеры»",
  reviews: "Отзывы — в разделе «Отзывы». Пока опубликованных нет — только рейтинг 2ГИС и «Оставить отзыв»",
  contacts: "Адрес, часы, телефон, WhatsApp, Instagram",
};

const pencil =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg text-accent hover:brightness-110";

export default async function SitePage({ searchParams }: { searchParams: Promise<{ saved?: string; snapshot?: string }> }) {
  const { saved, snapshot } = await searchParams;
  const demo = guestLoginEnabled();
  const [{ settings }, club, demoStatus, guest] = await Promise.all([
    getSettingsForEdit(),
    getClubForEdit(),
    demo ? getDemoStatus(requireOwner) : null,
    isGuest(),
  ]);
  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: club.timeZone }).format(d) : "ещё не было";

  return (
    <>
      <PageHead title="Настройки сайта" subtitle="Клуб, блоки, тексты и контакты главной страницы. Изменения сразу появляются на сайте." />

      {saved && (
        <div className="mb-6">
          <Notice tone="ok">Сохранено — уже на сайте</Notice>
        </div>
      )}

      {/* Сводка — по макету А9: сколько Блоков на сайте и ссылка на сайт */}
      <div className={`${card} mb-8 flex items-center justify-between gap-3`}>
        <p className="flex items-center gap-3 text-lg font-bold">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
          {BLOCKS.filter((b) => settings[SHOW_COLUMN[b]]).length} из {BLOCKS.length} блоков на сайте
        </p>
        <a href="/ru" target="_blank" className="rounded-xl bg-card-2 px-4 py-2 font-bold text-accent">
          Сайт ↗
        </a>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Клуб</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
          <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full border border-line" style={{ background: club.accentColor }} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">
              {club.name} · {club.cityRu}
            </div>
            <div className="mt-0.5 text-sm text-muted">Название, город, цвет, логотип, 2ГИС — на всём сайте, в кабинете и в админке</div>
          </div>
          <Link href="/admin/site/club" aria-label="Редактировать: Клуб" className={pencil}>
            <PencilIcon />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Блоки главной</h2>
        <ul className="grid gap-3 lg:grid-cols-2">
          {/* Первый экран есть всегда: его можно править, но нельзя скрыть */}
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold leading-snug">{SETTINGS_FORM_LABEL_RU.hero}</div>
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
              <li key={block} className={`flex items-center gap-3 rounded-2xl border border-line bg-card p-4 ${shown ? "" : "opacity-80"}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold leading-snug">{name}</div>
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
                    <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${shown ? "left-6 bg-accent-ink" : "left-1 bg-muted"}`} />
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
        <h2 className="mb-3 text-xl font-bold">Рейтинг 2ГИС</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
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

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Реквизиты и документы</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">{settings.legalName || "Реквизиты не заполнены"}</div>
            <div className="mt-0.5 text-sm text-muted">
              {settings.legalName || settings.legalBin || settings.legalAddress
                ? "Показываются внизу сайта, в политике конфиденциальности и в пользовательском соглашении"
                : "Название ИП, ИИН/БИН, юридический адрес, email. Пока пусто — внизу сайта только ссылки на документы"}
            </div>
          </div>
          <Link href="/admin/site/legal" aria-label="Редактировать: реквизиты" className={pencil}>
            <PencilIcon />
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">
          Документы на сайте:{" "}
          {LEGAL_PAGES.map((page, i) => (
            <span key={page}>
              {i > 0 && " · "}
              <a href={legalPath("ru", page)} target="_blank" rel="noopener" className="underline hover:text-accent">
                {page === "privacy" ? "политика конфиденциальности" : "пользовательское соглашение"}
              </a>
            </span>
          ))}
          . Их текст меняется только вместе с сайтом.
        </p>
      </section>

      {/* Суточный сброс демо-админки (этап П1, ADR 0019) — только где работает гостевой вход */}
      {demoStatus && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Демо Лаборатории</h2>
          {snapshot && (
            <div className="mb-3">
              <Notice tone="ok">Текущее состояние стало исходным: в 04:00 сайт вернётся к нему.</Notice>
            </div>
          )}
          <div className={`${card} space-y-3`}>
            <p className="text-sm text-muted">
              Каждый день в 04:00 по времени Клуба Клуб, Настройки сайта, Тарифы, Тренеры, Направления, статусы Отзывов и Галерея
              возвращаются к исходному снимку. Записи, Клиенты, уведомления и Обращения не трогаются.
            </p>
            <p className="text-sm">
              Снимок: {fmt(demoStatus.snapshotAt)} · последний сброс: {fmt(demoStatus.lastResetAt)}
              {demoStatus.lastResetMs !== null ? ` (${demoStatus.lastResetMs} мс)` : ""}
            </p>
            {!guest && (
              <form action={takeDemoSnapshotAction}>
                <button type="submit" className="rounded-xl bg-card-2 px-4 py-2 font-bold text-accent hover:bg-line">
                  Сделать текущее состояние исходным
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
