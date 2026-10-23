import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons";
import { CallSym, LocationOnSym } from "@/components/symbols";
import { Art503 } from "@/components/site/errors/ErrorArt";
import { ErrorActions, ErrorChip, ErrorHeading, ErrorShell, errorButton } from "@/components/site/errors/ErrorShell";
import { toSiteContent, type SiteContent } from "@/lib/domain/site-settings";
import { getDictionary, isLocale } from "@/lib/i18n";
import { isMaintenance } from "@/lib/maintenance";
import { logError } from "@/lib/observability/log";
import { getSiteSettings } from "@/lib/services/site";
import { site, whatsappUrl } from "@/lib/site";

// Страница 503 «Идут технические работы». Сюда middleware переписывает любую страницу сайта при MAINTENANCE_MODE=1
// (src/lib/maintenance.ts), код ответа 503 ставит он же. Без режима работ адрес ведёт на главную.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : "ru").errors.maintenance.title, robots: { index: false, follow: false } };
}

export default async function Maintenance({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "ru";
  if (!isMaintenance()) redirect(`/${locale}`);
  const t = getDictionary(locale);
  const e = t.errors;
  // Работы бывают и с базой (восстановление из копии): нет Настроек — нет и номера, ведём в карточку зала в 2ГИС
  const s: SiteContent | null = await getSiteSettings()
    .then(({ settings, cards }) => toSiteContent(locale, settings, cards))
    .catch((err: unknown) => {
      logError("503: Настройки сайта не прочитались", err, { route: `/${locale}/maintenance` });
      return null;
    });

  return (
    <ErrorShell locale={locale} texts={e}>
      <ErrorChip>{e.maintenance.chip}</ErrorChip>
      <Art503 />
      <ErrorHeading heading={e.maintenance.heading} text={e.maintenance.text} />
      <ErrorActions>
        {s ? (
          <>
            <a href={whatsappUrl(s.contacts.whatsapp, t.wa.trial)} target="_blank" rel="noopener noreferrer" className={errorButton.whatsapp}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              {e.maintenance.whatsapp}
            </a>
            <a href={`tel:${s.contacts.phoneTel}`} className={errorButton.secondary}>
              <CallSym className="h-5 w-5 shrink-0 text-primary-container" />
              {e.maintenance.call}
            </a>
          </>
        ) : (
          <a href={site.twoGis} target="_blank" rel="noopener noreferrer" className={errorButton.secondary}>
            <LocationOnSym className="h-5 w-5 shrink-0 text-primary-container" />
            {e.contacts2gis}
          </a>
        )}
      </ErrorActions>

      {s && (
        <dl className="mt-8 grid w-full max-w-[34rem] gap-3 rounded-2xl bg-surface-card p-4 text-left sm:grid-cols-2">
          <div>
            <dt className="text-label-uppercase uppercase tracking-wider text-text-muted">{e.hours}</dt>
            <dd className="mt-1 flex items-center gap-2 text-body-md text-text-primary">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-whatsapp-green" />
              {s.contacts.hours}
            </dd>
          </div>
          <div>
            <dt className="text-label-uppercase uppercase tracking-wider text-text-muted">{e.address}</dt>
            <dd className="mt-1 text-body-md text-text-primary">
              {t.contacts.city}, {s.contacts.address}
            </dd>
          </div>
        </dl>
      )}
    </ErrorShell>
  );
}
