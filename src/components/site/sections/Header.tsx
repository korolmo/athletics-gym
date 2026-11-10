import Image from "next/image";
import Link from "next/link";
import { locales } from "@/lib/i18n";
import { whatsappUrl } from "@/lib/site";
import { NavLink } from "@/components/ui/NavLink";
import { container, label } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";
import { logo } from "@/lib/brand";
import { PersonSym } from "@/components/symbols";

// Шапка
export function Header({
  locale,
  t,
  s,
  hasDirections = true,
  home = "",
  path = "",
  cabinet = false,
}: SectionProps & {
  /** Есть ли на странице блок Направлений */
  hasDirections?: boolean;
  /** Адрес главной перед якорями: на главной пусто, на юридических страницах — «/ru» */
  home?: string;
  /** Страница внутри языка: переключатель языка ведёт на неё же («/privacy»), а не на главную */
  path?: string;
  /**
   * Есть ли кабинет Клиента (этап 1): кнопка «Кабинет» только там, где вход работает — в Лаборатории.
   * На боевом сайте канала доставки кода нет, кнопки нет. Ссылка ведёт на /cabinet: вошедший попадает в «Мои записи»,
   * остальных middleware отправит на вход. Страница статическая, поэтому сайт не знает, вошёл ли Посетитель.
   */
  cabinet?: boolean;
}) {
  // Ссылки только на те Блоки, которые Владелец оставил на сайте
  const links = (["about", "directions", "prices", "trainers", "contacts"] as const)
    .filter((block) => s.show[block] && (block !== "directions" || hasDirections))
    .map((block): [string, string] => [`${home}#${block}`, t.nav[block]]);
  return (
    <header data-site-header className="fixed inset-x-0 top-0 z-50 w-full">
      {/* Тёмная подложка — отдельным слоем: в самом верху страницы скрипт движения её гасит (opacity).
          Размытие фона (backdrop-filter) — только с планшета: на телефоне оно пересчитывается при каждой прокрутке,
          поэтому там подложка просто плотнее */}
      <div data-header-bg aria-hidden="true" className="absolute inset-0 -z-10 bg-background/95 shadow-header md:bg-background/85 md:backdrop-blur-xl" />
      <div className={`${container} flex h-16 items-center justify-between gap-3 md:h-20 md:gap-6`}>
        <NavLink href={home || "#top"} className="flex min-w-0 items-center gap-2 md:gap-4">
          <Image src={logo} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
          <span className="whitespace-nowrap text-[15px] font-bold uppercase leading-6 tracking-wide text-text-primary md:text-headline-sm md:tracking-wider">{t.brand.name}</span>
        </NavLink>
        <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
          {links.map(([href, text]) => (
            <NavLink key={href} href={href} className={`${label} text-on-surface-variant transition-colors hover:text-on-surface`}>
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-4">
          <div className={`${label} flex items-center gap-1 text-text-muted`}>
            {locales.map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">|</span>}
                {/* Без предзагрузки: иначе браузер при каждом визите качал бы вторую языковую версию страницы */}
                <Link
                  href={`/${l}${path}`}
                  prefetch={false}
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
          {cabinet && (
            <Link
              href={`/${locale}/cabinet`}
              prefetch={false}
              aria-label={t.nav.cabinet}
              className={`${label} flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-surface-border text-text-primary transition-colors hover:border-primary-container hover:text-primary-container md:h-auto md:w-auto md:rounded-sm md:px-4 md:py-2`}
            >
              <PersonSym className="h-5 w-5" />
              <span className="hidden md:inline">{t.nav.cabinet}</span>
            </Link>
          )}
          <a
            href={whatsappUrl(s.contacts.whatsapp, t.wa.trial)}
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
