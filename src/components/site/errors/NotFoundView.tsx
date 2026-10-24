import Link from "next/link";
import { ArrowRightIcon, DumbbellIcon } from "@/components/icons";
import { LocationOnSym } from "@/components/symbols";
import { Art404 } from "@/components/site/errors/ErrorArt";
import { ErrorActions, ErrorChip, ErrorHeading, ErrorShell, errorButton } from "@/components/site/errors/ErrorShell";
import { label } from "@/components/ui/styles";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { toSiteContent } from "@/lib/domain/site-settings";
import { getDictionary, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

// Страница 404 на одном языке — по макету Stitch. Рисуется при сборке (app/global-not-found.tsx), без базы:
// адрес — начальный из кода, часы работы и номер зала не показываем (они в Настройках сайта), контакты — в 2ГИС.

const QUICK = ["trainers", "women", "contacts"] as const;

export function NotFoundView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const e = t.errors;
  const { address } = toSiteContent(locale, DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS).contacts;
  const home = `/${locale}`;

  return (
    <ErrorShell locale={locale} texts={e}>
      <ErrorChip>{e.notFound.chip}</ErrorChip>
      <Art404 />
      <ErrorHeading heading={e.notFound.heading} text={e.notFound.text} />
      <ErrorActions>
        <Link href={home} prefetch={false} className={errorButton.primary}>
          {e.home}
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
        <Link href={`${home}#prices`} prefetch={false} className={errorButton.secondary}>
          {e.notFound.prices}
        </Link>
      </ErrorActions>

      <nav aria-label={e.notFound.quick} className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl bg-surface-card px-6 py-3 md:rounded-full">
        <span className={`${label} w-full tracking-wider text-text-muted md:w-auto`}>{e.notFound.quick}:</span>
        {QUICK.map((block) => (
          <Link key={block} href={`${home}#${block}`} prefetch={false} className="py-1 text-body-md text-text-primary underline underline-offset-2 transition-colors hover:text-primary-container">
            {t.nav[block]}
          </Link>
        ))}
      </nav>

      <div className="mt-8 flex w-full max-w-[38rem] flex-col items-start gap-4 rounded-2xl bg-surface-card p-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary-container">
            <DumbbellIcon className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-body-md font-bold text-text-primary">
              {site.name} · {t.contacts.city}
            </span>
            <span className="text-body-sm text-text-muted">{address}</span>
          </span>
        </div>
        <a
          href={site.twoGis}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-body-sm text-text-primary underline underline-offset-2 transition-colors hover:text-primary-container"
        >
          <LocationOnSym className="h-4 w-4 shrink-0 text-primary-container" />
          {e.contacts2gis}
        </a>
      </div>
    </ErrorShell>
  );
}
