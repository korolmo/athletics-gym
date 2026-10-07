import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/dictionaries/ru";
import { locales, pick, type Locale } from "@/lib/i18n";
import { mapEmbedUrl, site, whatsappUrl } from "@/lib/site";
import {
  UNIT_LABEL_KK,
  UNIT_LABEL_RU,
  isUnit,
  type Category,
} from "@/lib/tariffs";
import { WhatsAppIcon } from "@/components/icons";
import {
  AirSym,
  ArrowForwardSym,
  CallSym,
  ChatSym,
  CheckCircleSym,
  CheckSym,
  EventAvailableSym,
  ExerciseSym,
  FemaleSym,
  FitnessCenterSym,
  LocalFireDepartmentSym,
  LocationOnSym,
  LockSym,
  OpenInNewSym,
  PersonSym,
  PhotoCameraSym,
  ScheduleSym,
} from "@/components/symbols";

type Props = { locale: Locale; t: Dictionary };

// Вёрстка — по макету Stitch (design/stitch/home-desktop.html); тексты и данные — наши
const container = "mx-auto w-full max-w-site px-4 md:px-gutter";
const label = "text-label-uppercase uppercase";
const eyebrow = `${label} mb-1 tracking-wider text-primary-container`;
const h2 = "text-headline-lg-mobile uppercase text-text-primary md:text-headline-lg";
const sectionY = "py-10";

function DemoBadge({ label: text }: { label: string }) {
  return (
    <span className="rounded-sm bg-primary-container/10 px-2 py-0.5 text-[11px] uppercase text-primary-container">
      {text}
    </span>
  );
}

function SectionHead({
  eyebrow: over,
  title,
  badge,
  aside,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className={eyebrow}>{over}</div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={h2}>{title}</h2>
          {badge}
        </div>
      </div>
      {aside}
    </div>
  );
}

function splitNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

/* ───────── Шапка ───────── */

export function Header({ locale, t }: Props) {
  const links: [string, string][] = [
    ["#about", t.nav.about],
    ["#disciplines", t.nav.disciplines],
    ["#prices", t.nav.prices],
    ["#schedule", t.nav.schedule],
    ["#contacts", t.nav.contacts],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full bg-background/85 shadow-header backdrop-blur-xl">
      <div className={`${container} flex h-16 items-center justify-between gap-3 md:h-20 md:gap-6`}>
        <a href="#top" className="flex min-w-0 items-center gap-2 md:gap-4">
          <Image src="/logo.png" alt={site.name} width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
          <span className="whitespace-nowrap text-[15px] font-bold uppercase leading-6 tracking-wide text-text-primary md:text-headline-sm md:tracking-wider">{site.name}</span>
        </a>
        <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
          {links.map(([href, text]) => (
            <a
              key={href}
              href={href}
              className={`${label} text-on-surface-variant transition-colors hover:text-on-surface`}
            >
              {text}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-4">
          <div className={`${label} flex items-center gap-1 text-text-muted`}>
            {locales.map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">|</span>}
                <Link
                  href={`/${l}`}
                  aria-current={l === locale ? "page" : undefined}
                  className={
                    l === locale
                      ? "px-0.5 py-2 text-primary-container"
                      : "px-0.5 py-2 transition-colors hover:text-on-surface"
                  }
                >
                  {t.lang[l]}
                </Link>
              </span>
            ))}
          </div>
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${label} hidden items-center justify-center rounded-sm bg-primary-container px-6 py-2 text-on-primary transition-all hover:brightness-95 active:translate-y-px md:inline-flex lg:hidden xl:inline-flex`}
          >
            {t.cta.trial}
          </a>
        </div>
      </div>
    </header>
  );
}

/* ───────── Полоса с адресом и первый экран ───────── */

export function Hero({ t }: Props) {
  const [first, middle, ...rest] = t.hero.title.split(". ");
  const stats = [
    { Icon: ScheduleSym, title: t.about.items[3].title, text: t.about.items[3].text },
    { Icon: LocationOnSym, title: t.contacts.city, text: t.contacts.address },
    { Icon: AirSym, title: t.about.items[2].title, text: t.about.items[2].text },
  ];
  return (
    <>
      <section className="hidden w-full border-b border-surface-border bg-surface-container-lowest/90 px-gutter py-2 text-body-sm text-text-muted backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`${label} inline-flex items-center gap-1.5 text-primary-container`}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              {t.contacts.city} · {t.contacts.address}
            </span>
            <span className="text-surface-border">|</span>
            <span>{t.contacts.hours}</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={`tel:${site.phoneTel}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-text-primary transition-colors hover:text-primary-container"
            >
              <CallSym className="h-4 w-4 text-primary-container" />
              {site.phoneDisplay}
            </a>
            <a
              href={site.twoGisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm bg-surface-card px-2.5 py-0.5 text-[12px] text-on-surface"
            >
              <span className="text-star">★</span> {site.rating} · {t.rating.count}
            </a>
          </div>
        </div>
      </section>

      <section id="top" className="relative w-full overflow-hidden py-10 lg:py-16">
        <div className={`${container} grid grid-cols-1 items-center gap-8 lg:grid-cols-12`}>
          <div className="z-10 flex flex-col items-start gap-4 lg:col-span-7">
            <a
              href={site.twoGisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-surface-card px-3.5 py-1.5 shadow-xs"
            >
              <span className="text-[13px] text-primary-container">★ {site.rating}</span>
              <span className="text-surface-border">/</span>
              <span className={`${label} tracking-wider text-text-primary`}>405 {t.hero.rating}</span>
            </a>

            <div className="mt-2 flex flex-col gap-1">
              <span className={`${label} tracking-widest text-primary-container`}>{t.hero.kicker}</span>
              <h1 className="text-display-hero-mobile uppercase leading-[1.02] tracking-tight text-text-primary md:text-display-hero md:leading-[1.02] md:tracking-tight">
                {first}.{" "}
                <span className="bg-linear-to-r from-primary-container to-surface-tint bg-clip-text text-transparent">
                  {middle}.
                </span>{" "}
                {rest.join(". ")}
              </h1>
            </div>

            <p className="max-w-[580px] pt-1 text-body-lg leading-relaxed text-text-muted lg:min-h-[82px]">{t.hero.subtitle}</p>

            <div className="flex w-full flex-wrap items-center gap-4 pt-3 sm:w-auto lg:flex-col lg:items-start">
              <a
                href={whatsappUrl(t.wa.trial)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-2 text-[14px] font-bold uppercase leading-5 tracking-wide text-on-primary shadow-md transition-all hover:brightness-95 active:translate-y-px sm:w-auto md:px-8 md:text-headline-sm md:tracking-wide"
              >
                <span>{t.cta.trialLong}</span>
                <span className={`${label} shrink-0 rounded-sm bg-black/20 px-2 py-0.5 text-on-primary`}>0 ₸</span>
              </a>
              <a
                href="#prices"
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-surface-card px-6 text-headline-sm uppercase text-text-primary shadow-xs transition-all hover:text-primary-container sm:w-auto"
              >
                {t.cta.prices}
              </a>
            </div>

            <div className="mt-4 grid w-full max-w-[620px] grid-cols-1 gap-4 pt-6 sm:grid-cols-3 lg:max-w-none lg:grid-cols-[1fr_1.4fr_1fr]">
              {stats.map(({ Icon, title, text }) => (
                <div key={title} className="flex flex-col">
                  <span className="flex items-center gap-1 text-headline-sm uppercase text-text-primary">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary-container" />
                    {title}
                  </span>
                  <span className="text-body-sm text-text-muted">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative h-[360px] w-full overflow-hidden rounded-2xl bg-surface-card shadow-2xl md:h-[520px]">
              <Image
                src="/stitch/hero.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 500px, 100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-surface-dim/40 to-transparent" />
              <div className="absolute right-4 top-4 flex items-center gap-3 rounded-xl bg-surface-card/90 px-3.5 py-2 shadow-lg backdrop-blur-md">
                <Image
                  src="/logo-women.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full bg-background object-contain p-1"
                />
                <div className="flex flex-col">
                  <span className={`${label} text-primary-container`}>{t.women.title}</span>
                  <span className="text-body-sm font-bold text-text-primary">{t.about.items[1].title}</span>
                </div>
              </div>
              <div className="absolute bottom-5 left-5 flex max-w-[280px] items-center gap-4 rounded-xl bg-background/95 p-4 shadow-xl backdrop-blur-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                  <FitnessCenterSym className="h-[26px] w-[26px]" />
                </div>
                <div className="flex flex-col">
                  <span className={`${label} text-text-muted`}>{t.cta.trial}</span>
                  <span className="text-headline-sm text-text-primary">0 ₸</span>
                  <span className="text-[11px] leading-4 text-primary-container">{t.prices.trialNote}</span>
                </div>
              </div>
              <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-dim/80 text-[10px] text-text-muted backdrop-blur-xs">
                {"'22"}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ───────── О зале ───────── */

export function About({ t }: Props) {
  const icons = [ExerciseSym, FemaleSym, AirSym, EventAvailableSym];
  return (
    <section id="about" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.about}
          title={t.about.title}
          aside={<p className="max-w-[420px] text-body-md text-text-muted">{t.meta.description}</p>}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.about.items.map((item, i) => {
            const Icon = icons[i] ?? ExerciseSym;
            return (
              <div
                key={item.title}
                className="group flex h-[200px] flex-col justify-between rounded-2xl bg-surface-card p-6 shadow-md transition-transform hover:-translate-y-0.5 lg:h-[280px]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary-container transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`${label} text-text-muted`}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <h3 className="mb-2 text-headline-sm uppercase text-text-primary">{item.title}</h3>
                  <p className="text-body-md text-text-muted">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────── Направления ───────── */

export type DisciplineData = {
  id: string;
  slug: string;
  nameRu: string;
  nameKk: string | null;
  descriptionRu: string;
  descriptionKk: string | null;
};

// Фото из макета Stitch (сгенерированы, не съёмка зала)
const disciplinePhoto: Record<string, string> = {
  functional: "/stitch/functional.jpg",
  crossfit: "/stitch/crossfit.jpg",
  cycle: "/stitch/cycle.jpg",
  trx: "/stitch/trx.jpg",
};

const programCard =
  "group flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-surface-card shadow-md transition-all hover:-translate-y-1 sm:w-auto";

function ProgramBody({ title, text, caption }: { title: string; text: string; caption: string }) {
  return (
    <div className="flex grow flex-col justify-between p-5 lg:min-h-[174px]">
      <div>
        <h3 className="mb-1 text-headline-sm uppercase text-text-primary">{title}</h3>
        <p className="text-body-sm text-text-muted">{text}</p>
      </div>
      <div className="flex items-center justify-between pt-4 text-[12px] text-text-muted">
        <span>{caption}</span>
        <ArrowForwardSym className="h-4 w-4 text-primary-container" />
      </div>
    </div>
  );
}

function ProgramPhoto({ src, cropBottom, chip }: { src?: string; cropBottom?: boolean; chip?: string }) {
  return (
    <div className="relative h-44 w-full overflow-hidden bg-surface-container">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 240px, 256px"
          className={`object-cover transition-transform duration-500 ${cropBottom ? "origin-top scale-[1.45] group-hover:scale-150" : "group-hover:scale-105"}`}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-surface-border">
          <ExerciseSym className="h-16 w-16" />
        </div>
      )}
      {chip && (
        <span className="absolute left-3 top-3 rounded-sm bg-primary-container px-2 py-0.5 text-[11px] uppercase text-on-primary">
          {chip}
        </span>
      )}
    </div>
  );
}

export function Disciplines({ locale, t, items }: Props & { items: DisciplineData[] }) {
  return (
    <section id="disciplines" className={`w-full ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.disciplines}
          title={t.disciplines.title}
          aside={
            <span className={`${label} text-text-muted`}>
              {String(items.length + 1).padStart(2, "0")} {"//"} {t.disciplines.title}
            </span>
          }
        />
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {items.map((d) => (
            <a key={d.id} href="#schedule" className={programCard}>
              {/* на фото кроссфита из макета на полу написано чужое название клуба — низ кадра обрезаем */}
              <ProgramPhoto src={disciplinePhoto[d.slug]} cropBottom={d.slug === "crossfit"} />
              <ProgramBody
                title={pick(locale, d.nameRu, d.nameKk)}
                text={pick(locale, d.descriptionRu, d.descriptionKk)}
                caption={t.nav.schedule}
              />
            </a>
          ))}
          <a href={whatsappUrl(t.wa.personal)} target="_blank" rel="noopener noreferrer" className={programCard}>
            <ProgramPhoto src="/stitch/personal.jpg" chip={t.trainers.personal} />
            <ProgramBody title={t.disciplines.personalTitle} text={t.disciplines.personalText} caption={t.cta.whatsapp} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────── Женский зал ───────── */

export function Women({ t }: Props) {
  return (
    <section id="women" className="w-full py-4">
      <div className={container}>
        <div className="relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-surface-card via-surface-container-high to-surface-card p-8 shadow-2xl lg:flex lg:min-h-[480px] lg:p-12">
          <div className="relative z-10 grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-start gap-4 lg:col-span-8 lg:self-start">
              <div className={`${label} inline-flex items-center gap-2 rounded-sm bg-primary-container/10 px-3 py-1 text-primary-container`}>
                <LockSym className="h-4 w-4 shrink-0" />
                {t.about.items[1].text}
              </div>
              <h2 className={h2}>{t.women.title}</h2>
              <p className="max-w-[640px] text-body-lg text-text-muted">{t.women.text}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-body-md text-text-primary">
                {[t.prices.trialNote, t.prices.payment].map((x) => (
                  <div key={x} className="flex items-center gap-2">
                    <CheckCircleSym className="h-5 w-5 shrink-0 text-primary-container" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href={site.instagramWomen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-2 rounded-xl bg-surface-container px-6 text-[14px] text-text-primary shadow-xs transition-colors hover:text-primary-container"
                >
                  <PhotoCameraSym className="h-[18px] w-[18px]" />
                  <span>{t.women.link}</span>
                </a>
                <a
                  href={whatsappUrl(t.wa.trial)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-2 rounded-xl bg-whatsapp-green px-6 text-[14px] text-white shadow-md transition-all hover:brightness-105"
                >
                  <ChatSym className="h-[18px] w-[18px]" />
                  <span>{t.cta.trial}</span>
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center lg:col-span-4">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-surface-dim p-4 shadow-inner">
                <Image
                  src="/logo-women.png"
                  alt={t.women.title}
                  width={176}
                  height={176}
                  className="h-44 w-44 rounded-full object-contain shadow-lg"
                />
                <div className={`${label} absolute -bottom-2 rounded-full bg-primary-container px-3 py-1 text-on-primary shadow-md`}>
                  {t.women.title}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Цены ───────── */

export type TariffData = {
  id: string;
  category: string;
  nameRu: string;
  nameKk: string | null;
  descriptionRu?: string | null;
  descriptionKk?: string | null;
  price: number;
  durationValue: number;
  durationUnit: string;
};

// Порядок карточек как в макете: разовое — годовой (акцент) — месячный
const PRICE_CARDS: Category[] = ["SINGLE", "YEARLY", "MONTHLY"];

export function Prices({ locale, t, items }: Props & { items: TariffData[] }) {
  const unitLabels = locale === "kk" ? UNIT_LABEL_KK : UNIT_LABEL_RU;
  const [fromBefore, fromAfter] = t.prices.fromTemplate.split("{price}");
  // Персональная тренировка получает карточку, только когда Администратор завёл для неё Тариф
  const cats: Category[] = items.some((x) => x.category === "PERSONAL") ? [...PRICE_CARDS, "PERSONAL"] : PRICE_CARDS;
  const duration = (x: TariffData) =>
    isUnit(x.durationUnit) ? `${x.durationValue} ${unitLabels[x.durationUnit]}` : "";

  return (
    <section id="prices" className={`w-full ${sectionY}`}>
      <div className={container}>
        <div className="mx-auto mb-12 max-w-[680px] text-center">
          <div className={eyebrow}>{t.eyebrow.prices}</div>
          <h2 className={h2}>{t.prices.title}</h2>
          <p className="mt-2 text-body-md text-text-muted lg:min-h-10">{t.prices.payment}</p>
        </div>

        <div className={`grid grid-cols-1 items-stretch gap-6 ${cats.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
          {cats.map((cat, i) => {
            const list = items.filter((x) => x.category === cat);
            const cheapest = list.length ? list.reduce((a, b) => (b.price < a.price ? b : a)) : null;
            const highlight = cat === "YEARLY" && cheapest !== null;
            const description = cheapest ? pick(locale, cheapest.descriptionRu ?? "", cheapest.descriptionKk ?? null) : "";
            // Строки с галочками: сначала Тарифы категории, затем общие преимущества зала — как в макете, 4 строки у акцентной карточки и 3 у остальных
            const others = list.filter((x) => x !== cheapest);
            const perks = t.about.items.map((x) => x.title).slice(0, Math.max(2, (highlight ? 4 : 3) - others.length));
            const Check = highlight ? CheckCircleSym : CheckSym;
            return (
              <div
                key={cat}
                className={
                  highlight
                    ? "relative flex flex-col justify-between rounded-2xl bg-linear-to-b from-surface-card via-surface-container to-surface-card p-8 shadow-2xl outline-2 outline-primary-container lg:min-h-[533px]"
                    : "flex flex-col justify-between rounded-2xl bg-surface-card p-8 shadow-md lg:min-h-[533px]"
                }
              >
                {highlight && (
                  <div className={`${label} absolute -top-3.5 right-6 flex items-center gap-1 rounded-full bg-primary-container px-3.5 py-1 text-on-primary shadow-lg`}>
                    <LocalFireDepartmentSym className="h-3.5 w-3.5" />
                    {t.prices.best}
                  </div>
                )}
                <div>
                  <div className="mb-4 flex min-h-5 items-center justify-between">
                    <span className={`${label} ${highlight ? "text-primary-container" : "text-text-muted"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {cheapest && duration(cheapest) && (
                      <span
                        className={`rounded-sm px-2.5 py-0.5 text-[11px] uppercase ${
                          highlight ? "bg-primary-container/20 text-primary-container" : "bg-surface-container text-text-muted"
                        }`}
                      >
                        {duration(cheapest)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-headline-md uppercase text-text-primary">{t.prices.categories[cat]}</h3>
                  <p className="mt-1 min-h-4 text-body-sm text-text-muted">{description}</p>
                  <div className="my-6">
                    {cheapest ? (
                      <div className="flex items-baseline gap-1">
                        {fromBefore.trim() && <span className="text-body-sm text-text-muted">{fromBefore.trim()}</span>}
                        <span
                          className={
                            highlight
                              ? "text-[36px] font-extrabold leading-8 tracking-[-0.01em] text-primary-container"
                              : "text-price-numeral text-text-primary"
                          }
                        >
                          {splitNumber(cheapest.price)}
                        </span>
                        <span className="text-headline-sm text-primary-container">₸</span>
                        {fromAfter.trim() && <span className="text-body-sm text-text-muted">{fromAfter.trim()}</span>}
                      </div>
                    ) : (
                      <div className="text-price-numeral text-text-muted">{t.prices.ask}</div>
                    )}
                    {cheapest && (
                      <span className="text-body-sm text-text-muted">
                        {pick(locale, cheapest.nameRu, cheapest.nameKk)}
                        {cheapest.durationUnit !== "VISIT" && duration(cheapest) ? ` · ${duration(cheapest)}` : ""}
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-3 py-4 text-body-md text-text-primary">
                    {others.map((x) => (
                        <li key={x.id} className="flex items-center gap-2">
                          <Check className="h-[18px] w-[18px] shrink-0 text-primary-container" />
                          <span className="min-w-0 grow font-bold">
                            {pick(locale, x.nameRu, x.nameKk)}
                            {x.durationUnit !== "VISIT" && duration(x) ? ` · ${duration(x)}` : ""}
                          </span>
                          <span className="shrink-0 font-bold">{splitNumber(x.price)} ₸</span>
                        </li>
                    ))}
                    {perks.map((x) => (
                      <li key={x} className="flex items-center gap-2">
                        <Check className="h-[18px] w-[18px] shrink-0 text-primary-container" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6">
                  <a
                    href={whatsappUrl(t.wa.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      highlight
                        ? "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-[14px] text-on-primary shadow-md transition-all hover:brightness-95"
                        : "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-container text-[14px] text-text-primary transition-colors hover:text-primary-container"
                    }
                  >
                    {t.cta.whatsapp}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl bg-surface-card p-6 shadow-xs md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-whatsapp-green/20 text-whatsapp-green">
              <ChatSym className="h-[26px] w-[26px]" />
            </div>
            <div>
              <div className="text-headline-sm text-text-primary">{t.prices.trialNote}</div>
              <p className="text-body-sm text-text-muted">
                {t.contacts.city}, {t.contacts.address} · {t.contacts.hours}
              </p>
            </div>
          </div>
          <a
            href={whatsappUrl(t.wa.price)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-whatsapp-green px-6 text-[13px] uppercase text-white shadow-md transition-all hover:brightness-105 sm:w-auto"
          >
            <span>{t.cta.askPrice}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────── Галерея (фото из макета — сгенерированы, поэтому с пометкой «ДЕМО») ───────── */

export function Gallery({ t }: Props) {
  const tiles = [
    { src: "/stitch/gallery-weights.jpg", span: "md:col-span-8", sizes: "(min-width: 768px) 820px, 100vw", item: t.about.items[0] },
    { src: "/stitch/gallery-cardio.jpg", span: "md:col-span-4", sizes: "(min-width: 768px) 400px, 100vw", item: t.about.items[2] },
  ];
  return (
    <section id="gallery" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.gallery}
          title={t.gallery.title}
          badge={<DemoBadge label={t.schedule.demo} />}
          aside={
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <div className="flex flex-col">
                <span className={`${label} text-text-primary`}>{site.name}</span>
                <span className="text-body-sm text-text-muted">{t.contacts.city}</span>
              </div>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {tiles.map((tile) => (
            <div key={tile.src} className={`group relative h-[240px] overflow-hidden rounded-2xl md:h-[340px] ${tile.span}`}>
              <Image
                src={tile.src}
                alt=""
                fill
                sizes={tile.sizes}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5">
                <span className={`${label} text-primary-container`}>{tile.item.title}</span>
                <div className="text-headline-sm text-text-primary">{tile.item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Тренеры ───────── */

export type TrainerData = {
  id: string;
  nameRu: string;
  nameKk: string | null;
  takesPersonal: boolean;
  isDemo: boolean;
  disciplines: { id: string; nameRu: string; nameKk: string | null }[];
};

export function Trainers({ locale, t, items }: Props & { items: TrainerData[] }) {
  const anyDemo = items.some((x) => x.isDemo);
  return (
    <section id="trainers" className={`w-full ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.trainers}
          title={t.trainers.title}
          badge={anyDemo ? <DemoBadge label={t.schedule.demo} /> : undefined}
        />
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {items.map((tr) => (
            <article key={tr.id} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-surface-card shadow-md md:w-auto">
              <div className="flex h-44 items-center justify-center bg-surface-container text-surface-border">
                <PersonSym className="h-24 w-24" />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-headline-sm uppercase text-text-primary">{pick(locale, tr.nameRu, tr.nameKk)}</h3>
                  {tr.isDemo && <span className="text-body-sm text-text-muted">{t.trainers.demo}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tr.disciplines.map((d) => (
                    <span key={d.id} className="rounded-sm bg-surface-container px-2.5 py-0.5 text-[11px] uppercase text-text-muted">
                      {pick(locale, d.nameRu, d.nameKk)}
                    </span>
                  ))}
                  {tr.takesPersonal && (
                    <span className="rounded-sm bg-primary-container/20 px-2.5 py-0.5 text-[11px] uppercase text-primary-container">
                      {t.trainers.personal}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Расписание (заголовок; сетка — клиентский компонент) ───────── */

export function ScheduleSection({
  t,
  isDemo,
  children,
}: Props & { isDemo: boolean; children: React.ReactNode }) {
  return (
    <section id="schedule" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.schedule}
          title={t.schedule.title}
          badge={isDemo ? <DemoBadge label={t.schedule.demo} /> : undefined}
        />
        {children}
      </div>
    </section>
  );
}

/* ───────── Контакты ───────── */

export function Contacts({ t }: Props) {
  const rows = [
    { Icon: LocationOnSym, title: t.contacts.address, text: t.contacts.city, href: undefined },
    { Icon: ScheduleSym, title: t.contacts.hours, text: t.about.items[3].text, href: undefined },
    { Icon: CallSym, title: site.phoneDisplay, text: t.cta.whatsapp, href: `tel:${site.phoneTel}` },
  ];
  return (
    <section id="contacts" className={`w-full ${sectionY}`}>
      <div className={container}>
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-2xl bg-surface-card p-8 shadow-md lg:col-span-5 lg:min-h-[451px]">
            <div>
              <div className={eyebrow}>{t.eyebrow.contacts}</div>
              <h2 className={`${h2} mb-6`}>{t.contacts.title}</h2>
              <div className="flex flex-col gap-6">
                {rows.map(({ Icon, title, text, href }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary-container">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      {href ? (
                        <a href={href} className="text-headline-sm text-text-primary transition-colors hover:text-primary-container">
                          {title}
                        </a>
                      ) : (
                        <div className="text-headline-sm text-text-primary">{title}</div>
                      )}
                      {text && <div className="mt-0.5 text-body-sm text-text-muted">{text}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-8">
              <a
                href={whatsappUrl(t.wa.trial)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-green text-[14px] uppercase text-white shadow-md transition-all hover:brightness-105"
              >
                <ChatSym className="h-5 w-5" />
                <span>{t.cta.whatsapp}</span>
              </a>
            </div>
          </div>

          <div className="relative h-[320px] overflow-hidden rounded-2xl bg-surface-card shadow-lg md:h-[420px] lg:col-span-7">
            <iframe
              title={t.contacts.mapTitle}
              src={mapEmbedUrl}
              loading="lazy"
              className="absolute inset-0 h-full w-full [filter:brightness(0.75)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-background/20" />
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 rounded-xl bg-surface-card/95 p-4 shadow-xl backdrop-blur-md">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              <div>
                <div className="text-[13px] uppercase leading-5 text-text-primary">{site.name}</div>
                <div className="text-[11px] leading-4 text-primary-container">
                  {t.contacts.address} · 2ГИС ★ {site.rating}
                </div>
              </div>
            </div>
            <a
              href={site.twoGisRoute}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-8 right-4 flex items-center gap-1.5 rounded-xl bg-surface-dim/90 px-4 py-2 text-[11px] uppercase text-text-primary shadow-md backdrop-blur-xs transition-colors hover:text-primary-container"
            >
              <span>{t.contacts.route}</span>
              <OpenInNewSym className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Подвал и плавающие кнопки ───────── */

export function Footer({ t }: Props) {
  const links: [string, string][] = [
    ["#about", t.nav.about],
    ["#prices", t.nav.prices],
    ["#contacts", t.nav.contacts],
  ];
  return (
    <footer className="mt-10 w-full bg-surface-container-lowest py-10 pb-28 md:pb-10">
      <div className={container}>
        <div className="flex flex-col items-start justify-between gap-6 pb-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-headline-sm uppercase text-text-primary">{site.name}</span>
              <span className={`${label} rounded-sm bg-primary-container/10 px-1 py-0.5 text-primary-container`}>
                {t.about.items[3].title}
              </span>
            </div>
            <p className="text-body-sm text-text-muted">
              {t.contacts.city} · {t.contacts.address}
            </p>
          </div>
          <div className={`${label} flex flex-wrap items-center gap-6 text-text-muted`}>
            {links.map(([href, text]) => (
              <a key={href} href={href} className="transition-colors hover:text-primary-container">
                {text}
              </a>
            ))}
            <a href={whatsappUrl(t.wa.trial)} target="_blank" rel="noopener noreferrer" className="text-whatsapp-green">
              {t.cta.whatsapp}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 pt-4 text-body-sm text-text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t.footer.rights} ·{" "}
            <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary-container">
              {t.contacts.instagram}
            </a>{" "}
            ·{" "}
            <a href={site.twoGis} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary-container">
              2ГИС
            </a>
          </p>
          <p className={`${label} tracking-widest text-text-muted/60`}>{t.hero.title}</p>
        </div>
      </div>
    </footer>
  );
}

export function MobileBar({ t }: Props) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-surface-border bg-background/85 p-3 backdrop-blur-md md:hidden">
        <div className="flex gap-3">
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-primary-container px-4 text-[14px] font-bold uppercase tracking-wide text-on-primary transition-all hover:brightness-95 active:translate-y-px"
          >
            {t.cta.trial}
          </a>
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-whatsapp-green text-white"
          >
            <WhatsAppIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
      <a
        href={whatsappUrl(t.wa.trial)}
        target="_blank"
        rel="noopener noreferrer"
        title={`WhatsApp: ${site.phoneDisplay}`}
        aria-label="WhatsApp"
        className="group fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp-green text-white shadow-wa transition-all hover:scale-110 active:scale-95 md:flex"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-surface-card px-3 py-1.5 text-body-sm text-text-primary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          WhatsApp: {site.phoneDisplay}
        </span>
      </a>
    </>
  );
}
