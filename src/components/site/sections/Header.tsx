import Image from "next/image";
import Link from "next/link";
import { locales } from "@/lib/i18n";
import { site, whatsappUrl } from "@/lib/site";
import { container, label } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";
import { logo } from "@/lib/brand";

// Шапка
export function Header({ locale, t, s, hasDirections = true }: SectionProps & { /** Есть ли на странице блок Направлений */ hasDirections?: boolean }) {
  // Ссылки только на те Блоки, которые Владелец оставил на сайте
  const links = (["about", "directions", "prices", "trainers", "contacts"] as const)
    .filter((block) => s.show[block] && (block !== "directions" || hasDirections))
    .map((block): [string, string] => [`#${block}`, t.nav[block]]);
  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full bg-background/85 shadow-header backdrop-blur-xl">
      <div className={`${container} flex h-16 items-center justify-between gap-3 md:h-20 md:gap-6`}>
        <a href="#top" className="flex min-w-0 items-center gap-2 md:gap-4">
          <Image src={logo} alt={site.name} width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
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
