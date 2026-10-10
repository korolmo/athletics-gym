import { whatsappUrl } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons";
import type { SectionProps } from "@/components/site/sections/types";

// Плавающие кнопки: нижняя панель на телефоне и круглая кнопка WhatsApp на десктопе
export function MobileBar({ t, s }: SectionProps) {
  const trial = whatsappUrl(s.contacts.whatsapp, t.wa.trial);
  return (
    <>
      <div data-contact-source="mobile-bar" className="fixed inset-x-0 bottom-0 z-50 border-t border-surface-border bg-background/85 p-3 backdrop-blur-md md:hidden">
        <div className="flex gap-3">
          <a
            href={trial}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-primary-container px-4 text-[14px] font-bold uppercase tracking-wide text-on-primary transition-all hover:brightness-95 active:translate-y-px"
          >
            {t.cta.trial}
          </a>
          <a
            href={trial}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-whatsapp-green text-white"
          >
            <WhatsAppIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
      <a
        href={trial}
        target="_blank"
        rel="noopener noreferrer"
        title={`WhatsApp: ${s.contacts.whatsappDisplay}`}
        aria-label="WhatsApp"
        data-contact-source="floating"
        className="group fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp-green text-white shadow-wa transition-all hover:scale-110 active:scale-95 md:flex"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-surface-card px-3 py-1.5 text-body-sm text-text-primary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          WhatsApp: {s.contacts.whatsappDisplay}
        </span>
      </a>
    </>
  );
}
