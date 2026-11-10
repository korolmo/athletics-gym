"use client";

import Link from "next/link";
import { createContext, useActionState, useContext } from "react";
import { LIMITS } from "@/lib/admin/limits";
import {
  MARQUEE_MAX_ITEMS,
  MARQUEE_PLACEHOLDERS,
  formatPhone,
  formatRating,
  instagramHandle,
  type AboutCardData,
  type SiteSettingsData,
} from "@/modules/site/client";
import { DEFAULT_DATA_LOCATION } from "@/modules/site/client";
import { saveAbout, saveClub, saveContacts, saveHero, saveLegal, saveMarquee, saveRating, saveWomen, type SettingsFormState } from "./actions";

import { CLUB_LIMITS, logoSource, type ClubData } from "@/modules/club/client";

const field =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-accent";
const labelCls = "mb-2 block text-sm font-semibold text-muted";
const hint = "mt-1 block text-xs text-muted";

/** То, что Владелец ввёл перед ошибкой: после отправки форма сбрасывается к этим значениям, а не к сохранённым. */
const Typed = createContext<Record<string, string> | undefined>(undefined);

function useValue(name: string, saved: string): string {
  return useContext(Typed)?.[name] ?? saved;
}

function Input({
  name,
  label,
  saved,
  max,
  rows,
  required,
  note,
  ...rest
}: {
  name: string;
  label: string;
  saved: string;
  max?: number;
  /** Задано — многострочное поле */
  rows?: number;
  required?: boolean;
  note?: string;
} & Pick<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "autoComplete" | "placeholder">) {
  const value = useValue(name, saved);
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {rows ? (
        <textarea name={name} rows={rows} maxLength={max} required={required} defaultValue={value} className={field} />
      ) : (
        <input name={name} maxLength={max} required={required} defaultValue={value} className={field} {...rest} />
      )}
      {note && <span className={hint}>{note}</span>}
    </label>
  );
}

/** Пара полей: русский (обязателен) и казахский (пусто → на казахской версии покажем русский). */
function RuKk({
  name,
  label,
  ru,
  kk,
  max,
  rows,
}: {
  /** Имена полей — `<name>Ru` и `<name>Kk` */
  name: string;
  label: string;
  ru: string;
  kk: string | null;
  max: number;
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      <Input name={`${name}Ru`} label={`${label} (RU) *`} saved={ru} max={max} rows={rows} required />
      <Input
        name={`${name}Kk`}
        label={`${label} (KZ)`}
        saved={kk ?? ""}
        max={max}
        rows={rows}
        note="Если пусто — на казахской версии покажем русский."
      />
    </div>
  );
}

function Form({
  action,
  children,
}: {
  action: (prev: SettingsFormState, fd: FormData) => Promise<SettingsFormState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-line bg-card p-5 lg:p-6">
      <Typed.Provider value={state?.values}>{children}</Typed.Provider>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/admin/site" className="inline-flex items-center rounded-xl bg-card-2 px-5 py-3.5 font-semibold text-fg hover:bg-line">
          К списку
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-bold uppercase tracking-wide text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

export function HeroForm({ s }: { s: SiteSettingsData }) {
  return (
    <Form action={saveHero}>
      <RuKk name="heroTitle" label="Девиз" ru={s.heroTitleRu} kk={s.heroTitleKk} max={LIMITS.motto} />
      <p className={hint}>
        Если в девизе несколько предложений, второе выделяется жёлтым: «КҮШ. <span className="text-accent">ШЫДАМДЫЛЫҚ.</span>{" "}
        НӘТИЖЕ.» Девиз повторяется внизу сайта.
      </p>
      <RuKk
        name="heroSubtitle"
        label="Подзаголовок"
        ru={s.heroSubtitleRu}
        kk={s.heroSubtitleKk}
        max={LIMITS.subtitle}
        rows={3}
      />
    </Form>
  );
}

export function MarqueeForm({ s }: { s: SiteSettingsData }) {
  const max = LIMITS.marqueeItem;
  return (
    <Form action={saveMarquee}>
      <p className="text-sm text-muted">
        Короткие факты о зале — они бегут лентой под первым экраном, между ними звёздочка. До {MARQUEE_MAX_ITEMS} пунктов,
        каждый не длиннее {max} символов; на сайте буквы станут заглавными. Пустые пункты пропускаются.
      </p>
      <p className="text-sm text-muted">
        <span className="text-fg">{MARQUEE_PLACEHOLDERS.hours}</span> — сайт подставит часы работы из «Контактов» (сейчас:{" "}
        {s.hoursRu}), <span className="text-fg">{MARQUEE_PLACEHOLDERS.rating}</span> — оценку из «Рейтинга 2ГИС» (сейчас:{" "}
        {formatRating(s.ratingTenths)}).
      </p>
      {Array.from({ length: MARQUEE_MAX_ITEMS }, (_, i) => (
        <fieldset key={i} className="space-y-3 rounded-2xl bg-bg p-4">
          <legend className="text-xl font-bold">Пункт {i + 1}</legend>
          <Input name={`marquee${i + 1}Ru`} label="Текст (RU)" saved={s.marqueeRu[i] ?? ""} max={max} autoComplete="off" />
          <Input name={`marquee${i + 1}Kk`} label="Текст (KZ)" saved={s.marqueeKk[i] ?? ""} max={max} autoComplete="off" />
        </fieldset>
      ))}
      <p className={hint}>Если казахский текст пуст — на казахской версии покажем русский.</p>
    </Form>
  );
}

/** Что означает каждая из четырёх карточек: иконка на сайте привязана к месту. */
const CARD_NOTES = [
  "Иконка — гантель. Заголовок и текст повторяются в подписи фото в «Галерее».",
  "Иконка — женский знак. Заголовок повторяется на первом экране, текст — в блоке «Женский зал».",
  "Иконка — ветер. Заголовок и текст повторяются на первом экране и в подписи фото в «Галерее».",
  "Иконка — календарь. Заголовок и текст повторяются на первом экране, заголовок — внизу сайта, текст — в «Контактах».",
];

export function AboutForm({ cards }: { cards: AboutCardData[] }) {
  return (
    <Form action={saveAbout}>
      {cards.map((card, i) => (
        <fieldset key={card.position} className="space-y-3 rounded-2xl bg-card-2/40 p-4">
          <legend className="text-xl font-bold">Карточка {i + 1}</legend>
          <p className="text-xs text-muted">{CARD_NOTES[i]}</p>
          <RuKk name={`card${i + 1}.kicker`} label="Подпись" ru={card.kickerRu} kk={card.kickerKk} max={LIMITS.cardKicker} />
          <RuKk name={`card${i + 1}.title`} label="Заголовок" ru={card.titleRu} kk={card.titleKk} max={LIMITS.cardTitle} />
          <RuKk name={`card${i + 1}.text`} label="Текст" ru={card.textRu} kk={card.textKk} max={LIMITS.cardText} rows={2} />
        </fieldset>
      ))}
    </Form>
  );
}

export function WomenForm({ s }: { s: SiteSettingsData }) {
  return (
    <Form action={saveWomen}>
      <RuKk name="womenText" label="Текст" ru={s.womenTextRu} kk={s.womenTextKk} max={LIMITS.womenText} rows={4} />
      <Input
        name="womenInstagram"
        label="Instagram Женского зала *"
        saved={instagramHandle(s.womenInstagram)}
        required
        autoComplete="off"
        note="Имя профиля (@athletics__gym__women) или ссылка на него."
      />
    </Form>
  );
}

export function ContactsForm({ s }: { s: SiteSettingsData }) {
  return (
    <Form action={saveContacts}>
      <RuKk name="address" label="Адрес" ru={s.addressRu} kk={s.addressKk} max={LIMITS.address} />
      <p className={hint}>Без города: город Клуба сайт подставляет сам. Точка на карте от адреса не зависит.</p>
      <RuKk name="hours" label="Часы работы" ru={s.hoursRu} kk={s.hoursKk} max={LIMITS.hours} />
      <p className={hint}>
        Часы есть ещё в четвёртой карточке «О зале» и в названиях тарифов «Дневной» и «Весь день» — при смене режима
        поправьте и их.
      </p>
      <Input
        name="phone"
        label="Телефон *"
        saved={formatPhone(s.phone)}
        required
        type="tel"
        inputMode="tel"
        autoComplete="off"
        note="По этому номеру звонят с сайта."
      />
      <Input
        name="whatsapp"
        label="Номер WhatsApp *"
        saved={formatPhone(`+${s.whatsapp}`)}
        required
        type="tel"
        inputMode="tel"
        autoComplete="off"
        note="Сюда ведут все кнопки записи на сайте. Проверьте номер: на него приходят все обращения."
      />
      <Input
        name="instagram"
        label="Instagram зала *"
        saved={instagramHandle(s.instagram)}
        required
        autoComplete="off"
        note="Имя профиля (@athletics_gym_qyzylorda) или ссылка на него."
      />
    </Form>
  );
}

export function LegalForm({ s }: { s: SiteSettingsData }) {
  return (
    <Form action={saveLegal}>
      <p className="text-sm text-muted">
        Реквизиты показываются внизу сайта, в политике конфиденциальности и в пользовательском соглашении. Все поля
        необязательны: пустое поле на сайте просто не показывается.
      </p>
      <Input
        name="legalName"
        label="Название ИП"
        saved={s.legalName ?? ""}
        max={LIMITS.legalName}
        autoComplete="off"
        placeholder="ИП Иванов Иван Иванович"
        note="Как в свидетельстве или талоне о регистрации, вместе с «ИП»."
      />
      <Input
        name="legalBin"
        label="ИИН/БИН"
        saved={s.legalBin ?? ""}
        max={20}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000000000000"
        note="Ровно 12 цифр."
      />
      <Input name="legalAddress" label="Юридический адрес" saved={s.legalAddress ?? ""} max={LIMITS.legalAddress} autoComplete="off" rows={2} />
      <Input
        name="privacyEmail"
        label="Email для обращений о персональных данных"
        saved={s.privacyEmail ?? ""}
        max={LIMITS.email}
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="info@example.kz"
        note="На этот адрес люди пишут, чтобы узнать, исправить или удалить свои данные. Он виден на сайте."
      />
      <fieldset className="space-y-3 rounded-2xl bg-card-2/40 p-4">
        <legend className="text-xl font-bold">Место хранения данных</legend>
        <p className="text-xs text-muted">
          Продолжение фразы «Данные хранятся …» в политике конфиденциальности. Если пусто — «{DEFAULT_DATA_LOCATION.ru}».
        </p>
        <Input
          name="dataLocationRu"
          label="Текст (RU)"
          saved={s.dataLocationRu ?? ""}
          max={LIMITS.dataLocation}
          autoComplete="off"
          placeholder={DEFAULT_DATA_LOCATION.ru}
        />
        <Input
          name="dataLocationKk"
          label="Текст (KZ)"
          saved={s.dataLocationKk ?? ""}
          max={LIMITS.dataLocation}
          autoComplete="off"
          placeholder={DEFAULT_DATA_LOCATION.kk}
          note="Если пусто — на казахской версии покажем русский."
        />
      </fieldset>
    </Form>
  );
}

export function RatingForm({ s }: { s: SiteSettingsData }) {
  return (
    <Form action={saveRating}>
      <Input
        name="ratingTenths"
        label="Оценка в 2ГИС *"
        saved={formatRating(s.ratingTenths)}
        required
        inputMode="decimal"
        autoComplete="off"
        note="От 1 до 5, один знак после запятой: 4,9."
      />
      <Input
        name="ratingCount"
        label="Число оценок *"
        saved={String(s.ratingCount)}
        required
        inputMode="numeric"
        autoComplete="off"
        note="Как в карточке зала в 2ГИС. Сайт сам 2ГИС не читает — обновляйте вручную."
      />
    </Form>
  );
}

/** Клуб (этап П1): бренд, город и ссылки — сразу на всём сайте, в кабинете и в админке. Пояс не меняется (П2). */
export function ClubForm({ c }: { c: ClubData }) {
  const current = logoSource(c.logo).kind;
  const mode = useValue("logoMode", current === "photo" ? "photo" : current === "file" ? "file" : "monogram");
  const color = useValue("accentColor", c.accentColor);
  return (
    <Form action={saveClub}>
      <Input name="name" label="Название *" saved={c.name} max={CLUB_LIMITS.name} required note="На сайте, во вкладке браузера, в поиске и в кабинете." />
      <RuKk name="city" label="Город" ru={c.cityRu} kk={c.cityKk} max={CLUB_LIMITS.city} />
      <RuKk name="cityIn" label="В каком городе" ru={c.cityInRu} kk={c.cityInKk} max={CLUB_LIMITS.cityIn} />
      <p className={hint}>Для заголовков: «спортзал в Алматы», «Алматыдағы спорт зал».</p>
      <RuKk name="seoDescription" label="Описание для поиска" ru={c.seoDescriptionRu} kk={c.seoDescriptionKk} max={CLUB_LIMITS.seo} rows={3} />
      <Input
        name="foundedYear"
        label="Год открытия"
        saved={c.foundedYear ? String(c.foundedYear) : ""}
        inputMode="numeric"
        autoComplete="off"
        note="Подпись «с 2022 года» на первом экране. Пусто — без подписи."
      />

      <fieldset className="space-y-3">
        <legend className={labelCls}>Цвет акцента *</legend>
        <label className="flex items-center gap-3">
          <input type="color" name="accentColor" defaultValue={color} className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-bg" />
          <span className="text-sm text-muted">Кнопки, подписи и ссылки. Тёмный цвет форма не примет: на тёмном сайте он не читается.</span>
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={labelCls}>Логотип *</legend>
        {(
          [
            ["file", "Исходный логотип", "Файл, с которым запускался сайт"],
            ["monogram", "Монограмма", "Первые буквы названия в круге цвета акцента"],
            ["photo", "Загруженное фото", current === "photo" ? "Загружено ниже, в «Фото логотипа»" : "Загрузите фото ниже — оно сразу станет логотипом"],
          ] as const
        ).map(([value, title, note]) => (
          <label key={value} className="flex items-start gap-3 rounded-xl border border-line bg-bg p-3">
            <input type="radio" name="logoMode" value={value} defaultChecked={mode === value} disabled={value === "photo" && current !== "photo"} className="mt-1 accent-[var(--color-accent)]" />
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-xs text-muted">{note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Input name="twoGisUrl" label="Карточка в 2ГИС" saved={c.twoGisUrl ?? ""} max={CLUB_LIMITS.url} inputMode="url" note="Ссылка «Открыть в 2ГИС» и рейтинг. Пусто — без ссылки." />
      <Input name="twoGisReviewsUrl" label="Отзывы в 2ГИС" saved={c.twoGisReviewsUrl ?? ""} max={CLUB_LIMITS.url} inputMode="url" />
      <Input name="twoGisRouteUrl" label="Маршрут в 2ГИС" saved={c.twoGisRouteUrl ?? ""} max={CLUB_LIMITS.url} inputMode="url" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="latitude" label="Широта" saved={c.latitude === null ? "" : String(c.latitude)} inputMode="decimal" autoComplete="off" note="Точка на карте в «Контактах»." />
        <Input name="longitude" label="Долгота" saved={c.longitude === null ? "" : String(c.longitude)} inputMode="decimal" autoComplete="off" />
      </div>
    </Form>
  );
}
