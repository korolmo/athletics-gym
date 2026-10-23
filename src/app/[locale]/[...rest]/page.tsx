import Link from "next/link";
import { ArrowRightIcon, DumbbellIcon } from "@/components/icons";
import { Art404 } from "@/components/site/errors/ErrorArt";
import { ErrorActions, ErrorChip, ErrorHeading, ErrorShell, errorButton } from "@/components/site/errors/ErrorShell";
import { label } from "@/components/ui/styles";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { toSiteContent } from "@/lib/domain/site-settings";
import { defaultLocale, getDictionary, isLocale } from "@/lib/i18n";
import { logError } from "@/lib/observability/log";
import { getSiteSettings } from "@/lib/services/site";
import { site } from "@/lib/site";

// Страница 404 сайта: любой адрес под /ru и /kk, для которого нет своей страницы. Код ответа 404 ставит middleware
// (src/lib/site-pages.ts) — notFound() здесь не годится: при двух корневых layout Next отрисовал бы её только в браузере.
// Заголовок вкладки — в not-found.tsx рядом. Динамическая: случайные адреса (боты) не должны оседать в кэше страниц на диске хостинга.

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; rest: string[] }>;

export default async function NotFound({ params }: { params: Params }) {
  const { locale: raw, rest } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const pathname = `/${raw}/${rest.join("/")}`;
  const t = getDictionary(locale);
  const e = t.errors;
  // Часы, адрес и показ Блоков — из Настроек сайта; не ответила база — начальные значения, 404 всё равно показываем
  const { settings, cards } = await getSiteSettings().catch((err: unknown) => {
    logError("404: Настройки сайта не прочитались", err, { route: pathname });
    return { settings: DEFAULT_SETTINGS, cards: DEFAULT_ABOUT_CARDS };
  });
  const s = toSiteContent(locale, settings, cards);
  const home = `/${locale}`;
  const quick = (["trainers", "women", "contacts"] as const).filter((block) => s.show[block]);

  return (
    <ErrorShell locale={locale} texts={e} path={`/${rest.join("/")}`}>
      <ErrorChip>{e.notFound.chip}</ErrorChip>
      <Art404 />
      <ErrorHeading heading={e.notFound.heading} text={e.notFound.text} />
      <ErrorActions>
        <Link href={home} prefetch={false} className={errorButton.primary}>
          {e.home}
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
        {s.show.prices && (
          <Link href={`${home}#prices`} prefetch={false} className={errorButton.secondary}>
            {e.notFound.prices}
          </Link>
        )}
      </ErrorActions>

      {quick.length > 0 && (
        <nav aria-label={e.notFound.quick} className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl bg-surface-card px-6 py-3 md:rounded-full">
          <span className={`${label} w-full tracking-wider text-text-muted md:w-auto`}>{e.notFound.quick}:</span>
          {quick.map((block) => (
            <Link key={block} href={`${home}#${block}`} prefetch={false} className="py-1 text-body-md text-text-primary underline underline-offset-2 transition-colors hover:text-primary-container">
              {t.nav[block]}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-8 flex w-full max-w-[38rem] flex-col items-start gap-4 rounded-2xl bg-surface-card p-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary-container">
            <DumbbellIcon className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-body-md font-bold text-text-primary">
              {site.name} · {t.contacts.city}
            </span>
            <span className="text-body-sm text-text-muted">{s.contacts.address}</span>
          </span>
        </div>
        <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-body-sm text-text-primary">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-whatsapp-green" />
          {s.contacts.hours}
        </p>
      </div>
    </ErrorShell>
  );
}
