import { whatsappUrl } from "@/lib/site";
import { CallSym, ChatSym, LocationOnSym, ScheduleSym } from "@/components/symbols";
import { container, eyebrow, h2, sectionY } from "@/components/ui/styles";
import { MapPanel } from "@/components/site/contacts/MapPanel";
import type { SectionProps } from "@/components/site/sections/types";

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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-green text-[14px] uppercase text-on-whatsapp shadow-md transition-all hover:brightness-105"
              >
                <ChatSym className="h-5 w-5" />
                <span>{t.cta.whatsapp}</span>
              </a>
            </div>
          </div>

          {/* Карта грузится только по нажатию «Показать карту»: до него сайт к сервису карты не обращается */}
          <MapPanel
            labels={{ show: t.contacts.showMap, open2gis: t.contacts.open2gis, note: t.contacts.mapNote, route: t.contacts.route, mapTitle: t.contacts.mapTitle }}
            address={c.address}
            city={t.contacts.city}
            rating={s.rating.value}
          />
        </div>
      </div>
    </section>
  );
}
