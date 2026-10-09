import { site, whatsappUrl } from "@/lib/site";
import { container, label } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";

// Подвал
export function Footer({ t, s }: SectionProps) {
  const links = (["about", "prices", "contacts"] as const)
    .filter((block) => s.show[block])
    .map((block): [string, string] => [`#${block}`, t.nav[block]]);
  return (
    <footer className="mt-10 w-full bg-surface-container-lowest py-10 pb-28 md:pb-10">
      <div className={container}>
        <div className="flex flex-col items-start justify-between gap-6 pb-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-headline-sm uppercase text-text-primary">{site.name}</span>
              <span className={`${label} rounded-sm bg-primary-container/10 px-1 py-0.5 text-primary-container`}>
                {s.about[3].title}
              </span>
            </div>
            <p className="text-body-sm text-text-muted">
              {t.contacts.city} · {s.contacts.address}
            </p>
          </div>
          <div className={`${label} flex flex-wrap items-center gap-6 text-text-muted`}>
            {links.map(([href, text]) => (
              <a key={href} href={href} className="transition-colors hover:text-primary-container">
                {text}
              </a>
            ))}
            <a href={whatsappUrl(s.contacts.whatsapp, t.wa.trial)} target="_blank" rel="noopener noreferrer" className="text-whatsapp-green">
              {t.cta.whatsapp}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 pt-4 text-body-sm text-text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t.footer.rights} ·{" "}
            <a href={s.contacts.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary-container">
              {t.contacts.instagram}
            </a>{" "}
            ·{" "}
            <a href={site.twoGis} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary-container">
              2ГИС
            </a>
          </p>
          <p className={`${label} tracking-widest text-text-muted/60`}>{s.hero.title}</p>
        </div>
      </div>
    </footer>
  );
}
