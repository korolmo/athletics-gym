import { CLIENT_SITE, labBannerText } from "@/lib/lab";

type Props = {
  texts: { label: string; full: string; short: string };
  /** Путь на боевом сайте, куда ведёт ссылка: /ru, /kk */
  path?: string;
};

/**
 * Плашка Лаборатории: «Демо-версия платформы · боевой сайт клиента — athleticsgym.kz».
 * Рисуется только при APP_ENV=lab (решает layout). Фиксирована сверху; высоту резервирует html[data-lab] в globals.css.
 * На телефоне — короткий текст, чтобы плашка оставалась в одну строку.
 */
export function LabBanner({ texts, path = "" }: Props) {
  return (
    <div
      role="note"
      aria-label={texts.label}
      data-lab-banner
      className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center bg-[#F5E642] px-4 text-center text-[13px] font-semibold leading-none text-[#131315]"
    >
      <a href={`${CLIENT_SITE.url}${path}`} className="underline underline-offset-2">
        <span className="sm:hidden">{labBannerText(texts.short)}</span>
        <span className="hidden sm:inline">{labBannerText(texts.full)}</span>
      </a>
    </div>
  );
}
