import Image from "next/image";
import { mapEmbedUrl, site, whatsappUrl } from "@/lib/site";
import { CallSym, ChatSym, LocationOnSym, OpenInNewSym, ScheduleSym } from "@/components/symbols";
import { container, eyebrow, h2, sectionY } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";
import { logo } from "@/lib/brand";

// Контакты
export function Contacts({ t, s }: SectionProps) {
  const c = s.contacts;
  // Подпись «WhatsApp» под телефоном — только если это один и тот же номер
  const phoneNote = c.phoneTel === `+${c.whatsapp}` ? t.cta.whatsapp : "";
  const rows = [
    { Icon: LocationOnSym, title: c.address, text: t.contacts.city, href: undefined },
    { Icon: ScheduleSym, title: c.hours, text: s.about[3].text, href: undefined },
    { Icon: CallSym, title: c.phoneDisplay, text: phoneNote, href: `tel:${c.phoneTel}` },
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
                href={whatsappUrl(c.whatsapp, t.wa.trial)}
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
              <Image src={logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              <div>
                <div className="text-[13px] uppercase leading-5 text-text-primary">{site.name}</div>
                <div className="text-[11px] leading-4 text-primary-container">
                  {c.address} · 2ГИС ★ {s.rating.value}
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
