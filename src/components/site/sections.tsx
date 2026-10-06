import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/dictionaries/ru";
import { locales, pick, type Locale } from "@/lib/i18n";
import { mapEmbedUrl, site, whatsappUrl } from "@/lib/site";
import {
  CATEGORY_ORDER,
  UNIT_LABEL_KK,
  UNIT_LABEL_RU,
  formatPrice,
  isUnit,
  type Category,
} from "@/lib/tariffs";
import {
  ArrowRightIcon,
  ClockIcon,
  DumbbellIcon,
  InstagramIcon,
  MapPinIcon,
  SnowIcon,
  StarIcon,
  UserIcon,
  VenusIcon,
  WhatsAppIcon,
  disciplineIcon,
} from "@/components/icons";

type Props = { locale: Locale; t: Dictionary };

const container = "mx-auto w-full max-w-6xl px-4";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-semibold text-accent-ink transition hover:brightness-95 active:scale-[0.99]";
const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3.5 font-semibold text-fg transition hover:border-accent hover:text-accent";
const btnWa =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-wa px-5 py-3.5 font-semibold text-[#0b2e17] transition hover:brightness-95";

function SectionTitle({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="h-7 w-1.5 rounded bg-accent" />
      <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">{children}</h2>
      {badge}
    </div>
  );
}

function DemoBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-accent/50 px-2 py-0.5 text-xs font-bold tracking-wider text-accent">
      {label}
    </span>
  );
}

/* ───────── Шапка ───────── */

export function Header({ locale, t }: Props) {
  const links: [string, string][] = [
    ["#about", t.nav.about],
    ["#women", t.nav.women],
    ["#disciplines", t.nav.disciplines],
    ["#prices", t.nav.prices],
    ["#trainers", t.nav.trainers],
    ["#schedule", t.nav.schedule],
    ["#contacts", t.nav.contacts],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <a href="#top" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt={site.name} width={40} height={40} className="rounded-full" priority />
          <span className="font-display text-lg uppercase tracking-wide">
            {"Athletic's"} <span className="text-accent">Gym</span>
          </span>
        </a>
        <nav className="hidden items-center gap-5 text-sm text-muted lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition hover:text-fg">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-line p-0.5 text-xs font-semibold">
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                aria-current={l === locale ? "page" : undefined}
                className={
                  l === locale
                    ? "rounded-full bg-accent px-2.5 py-1 text-accent-ink"
                    : "rounded-full px-2.5 py-1 text-muted hover:text-fg"
                }
              >
                {t.lang[l]}
              </Link>
            ))}
          </div>
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink md:inline-flex"
          >
            {t.cta.trial}
          </a>
        </div>
      </div>
    </header>
  );
}

/* ───────── Первый экран ───────── */

export function Hero({ t }: Props) {
  return (
    <section id="top" className="hero-bg relative overflow-hidden border-b border-line/60">
      <div className={`${container} grid items-center gap-10 py-14 md:grid-cols-[1.3fr_1fr] md:py-24`}>
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">{t.hero.kicker}</p>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
            {t.hero.title.split(". ").map((part, i, arr) => (
              <span key={part} className={i === arr.length - 1 ? "block text-accent" : "block"}>
                {part}
                {i < arr.length - 1 ? "." : ""}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={whatsappUrl(t.wa.trial)} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
              <WhatsAppIcon />
              {t.cta.trialLong}
            </a>
            <a href="#prices" className={btnOutline}>
              {t.cta.prices}
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
          <a
            href={site.twoGisReviews}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-card/60 px-4 py-2 text-sm"
          >
            <StarIcon className="h-4 w-4 text-accent" />
            <span className="font-semibold">{site.rating}</span>
            <span className="text-muted">· 405 {t.hero.rating}</span>
          </a>
        </div>
        <div className="relative mx-auto hidden aspect-square w-full max-w-sm md:block">
          <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl" />
          <Image
            src="/logo.png"
            alt=""
            fill
            sizes="384px"
            className="relative rounded-full object-contain drop-shadow-[0_20px_60px_rgba(245,230,66,0.25)]"
            priority
          />
        </div>
      </div>
    </section>
  );
}

/* ───────── О зале ───────── */

export function About({ t }: Props) {
  const icons = [DumbbellIcon, VenusIcon, SnowIcon, ClockIcon];
  return (
    <section id="about" className={`${container} py-14 md:py-20`}>
      <SectionTitle>{t.about.title}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {t.about.items.map((item, i) => {
          const Icon = icons[i] ?? DumbbellIcon;
          return (
            <div key={item.title} className="rounded-2xl bg-card p-4 md:p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-6 w-6" />
              </div>
              <div className="font-semibold leading-snug">{item.title}</div>
              <div className="mt-1 text-sm text-muted">{item.text}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── Женский зал ───────── */

export function Women({ t }: Props) {
  return (
    <section id="women" className={`${container} pb-14 md:pb-20`}>
      <div className="card-glow grid items-center gap-6 overflow-hidden rounded-3xl border border-line p-6 md:grid-cols-[auto_1fr] md:gap-10 md:p-10">
        <Image
          src="/logo-women.png"
          alt={t.women.title}
          width={160}
          height={160}
          className="h-28 w-28 rounded-full md:h-40 md:w-40"
        />
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">{t.women.title}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t.women.text}</p>
          <a
            href={site.instagramWomen}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-semibold text-accent hover:underline"
          >
            <InstagramIcon />
            {t.women.link}
          </a>
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

export function Disciplines({ locale, t, items }: Props & { items: DisciplineData[] }) {
  return (
    <section id="disciplines" className="border-y border-line/60 bg-card/30 py-14 md:py-20">
      <div className={container}>
        <SectionTitle>{t.disciplines.title}</SectionTitle>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
          {items.map((d) => {
            const Icon = disciplineIcon[d.slug] ?? DumbbellIcon;
            return (
              <article
                key={d.id}
                className="card-glow flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-line p-5 md:w-auto"
              >
                <Icon className="h-8 w-8 text-accent" />
                <h3 className="mt-6 font-display text-xl uppercase tracking-wide">
                  {pick(locale, d.nameRu, d.nameKk)}
                </h3>
                <p className="mt-2 text-sm text-muted">{pick(locale, d.descriptionRu, d.descriptionKk)}</p>
              </article>
            );
          })}
          <a
            href={whatsappUrl(t.wa.personal)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-64 shrink-0 snap-start flex-col rounded-2xl bg-accent p-5 text-accent-ink md:w-auto"
          >
            <UserIcon className="h-8 w-8" />
            <h3 className="mt-6 font-display text-xl uppercase tracking-wide">{t.disciplines.personalTitle}</h3>
            <p className="mt-2 text-sm opacity-80">{t.disciplines.personalText}</p>
            <ArrowRightIcon className="mt-auto h-5 w-5 pt-1" />
          </a>
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
  price: number;
  durationValue: number;
  durationUnit: string;
};

export function Prices({ locale, t, items }: Props & { items: TariffData[] }) {
  const unitLabels = locale === "kk" ? UNIT_LABEL_KK : UNIT_LABEL_RU;
  return (
    <section id="prices" className={`${container} py-14 md:py-20`}>
      <SectionTitle>{t.prices.title}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_ORDER.map((cat: Category) => {
          const list = items.filter((x) => x.category === cat);
          const min = list.length ? Math.min(...list.map((x) => x.price)) : null;
          const highlight = cat === "YEARLY" && min !== null;
          return (
            <div
              key={cat}
              className={`relative flex flex-col rounded-2xl border bg-card p-5 ${
                highlight ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : "border-line"
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-ink">
                  {t.prices.best}
                </span>
              )}
              <div className="text-sm text-muted">{t.prices.categories[cat]}</div>
              <div className={`mt-2 font-display text-3xl ${min !== null ? "" : "text-muted"}`}>
                {min !== null ? t.prices.fromTemplate.replace("{price}", formatPrice(min)) : t.prices.ask}
              </div>
              {list.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                  {list.map((x) => (
                    <li key={x.id} className="flex justify-between gap-3">
                      <span className="text-muted">
                        {pick(locale, x.nameRu, x.nameKk)}
                        {isUnit(x.durationUnit) && x.durationUnit !== "VISIT"
                          ? ` · ${x.durationValue} ${unitLabels[x.durationUnit]}`
                          : ""}
                      </span>
                      <span className="shrink-0 font-semibold">{formatPrice(x.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-accent">{t.prices.trialNote}</div>
          <div className="mt-1 text-sm text-muted">{t.prices.payment}</div>
        </div>
        <a href={whatsappUrl(t.wa.price)} target="_blank" rel="noopener noreferrer" className={btnWa}>
          <WhatsAppIcon />
          {t.cta.askPrice}
        </a>
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
    <section id="trainers" className="border-y border-line/60 bg-card/30 py-14 md:py-20">
      <div className={container}>
        <SectionTitle badge={anyDemo ? <DemoBadge label={t.schedule.demo} /> : undefined}>
          {t.trainers.title}
        </SectionTitle>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0">
          {items.map((tr) => (
            <article key={tr.id} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-card md:w-auto">
              <div className="flex aspect-[4/3] items-center justify-center bg-card-2 text-line">
                <UserIcon className="h-24 w-24" />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl uppercase tracking-wide">{pick(locale, tr.nameRu, tr.nameKk)}</h3>
                  {tr.isDemo && <span className="text-xs text-muted">{t.trainers.demo}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tr.disciplines.map((d) => (
                    <span key={d.id} className="rounded-full bg-bg px-3 py-1 text-xs text-muted">
                      {pick(locale, d.nameRu, d.nameKk)}
                    </span>
                  ))}
                  {tr.takesPersonal && (
                    <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
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
    <section id="schedule" className={`${container} py-14 md:py-20`}>
      <SectionTitle badge={isDemo ? <DemoBadge label={t.schedule.demo} /> : undefined}>
        {t.schedule.title}
      </SectionTitle>
      {children}
    </section>
  );
}

/* ───────── Отзывы ───────── */

export function Rating({ t }: Props) {
  return (
    <section id="reviews" className={`${container} pb-14 md:pb-20`}>
      <SectionTitle>{t.rating.title}</SectionTitle>
      <div className="card-glow flex flex-col gap-5 rounded-3xl border border-line p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-center gap-5">
          <div className="font-display text-6xl leading-none">{site.rating}</div>
          <div>
            <div className="flex gap-1 text-accent">
              {[0, 1, 2, 3, 4].map((i) => (
                <StarIcon key={i} className="h-5 w-5" />
              ))}
            </div>
            <div className="mt-1 text-muted">{t.rating.count}</div>
          </div>
        </div>
        <a href={site.twoGisReviews} target="_blank" rel="noopener noreferrer" className={btnOutline}>
          {t.rating.read}
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

/* ───────── Контакты ───────── */

export function Contacts({ t }: Props) {
  return (
    <section id="contacts" className="border-t border-line/60 bg-card/30 py-14 md:py-20">
      <div className={`${container} grid gap-6 md:grid-cols-2`}>
        <div>
          <SectionTitle>{t.contacts.title}</SectionTitle>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <div className="font-semibold">{t.contacts.address}</div>
                <div className="text-sm text-muted">{t.contacts.city}</div>
              </div>
            </li>
            <li className="flex gap-3">
              <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="font-semibold">{t.contacts.hours}</div>
            </li>
            <li className="flex gap-3">
              <WhatsAppIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <a href={`tel:${site.phoneTel}`} className="font-semibold hover:text-accent">
                {site.phoneDisplay}
              </a>
            </li>
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <a href={site.twoGisRoute} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
              <MapPinIcon />
              {t.contacts.route}
            </a>
            <a href={whatsappUrl(t.wa.trial)} target="_blank" rel="noopener noreferrer" className={btnWa}>
              <WhatsAppIcon />
              {t.cta.whatsapp}
            </a>
            <a href={site.instagram} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <InstagramIcon />
              {t.contacts.instagram}
            </a>
          </div>
        </div>
        <iframe
          title={t.contacts.mapTitle}
          src={mapEmbedUrl}
          loading="lazy"
          className="h-72 w-full rounded-3xl border border-line [filter:invert(92%)_hue-rotate(180deg)_saturate(0.6)] md:h-full md:min-h-80"
        />
      </div>
    </section>
  );
}

/* ───────── Подвал и плавающие кнопки ───────── */

export function Footer({ t }: Props) {
  return (
    <footer className="border-t border-line/60 py-8 pb-28 md:pb-8">
      <div className={`${container} flex flex-col items-center justify-between gap-4 text-sm text-muted md:flex-row`}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
          <span>
            © {new Date().getFullYear()} {t.footer.rights}
          </span>
        </div>
        <div className="flex gap-5">
          <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-fg">
            Instagram
          </a>
          <a href={site.twoGis} target="_blank" rel="noopener noreferrer" className="hover:text-fg">
            2ГИС
          </a>
        </div>
      </div>
    </footer>
  );
}

export function MobileBar({ t }: Props) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-3">
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnPrimary} flex-1 py-3`}
          >
            {t.cta.trial}
          </a>
          <a
            href={whatsappUrl(t.wa.trial)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wa text-[#0b2e17]"
          >
            <WhatsAppIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
      <a
        href={whatsappUrl(t.wa.trial)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-wa text-[#0b2e17] shadow-lg shadow-black/40 transition hover:scale-105 md:inline-flex"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </>
  );
}
