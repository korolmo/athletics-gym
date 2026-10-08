import { whatsappUrl } from "@/lib/site";
import { ChatSym } from "@/components/symbols";
import { container, eyebrow, h2, sectionY } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";
import type { TariffView, TrainerView } from "@/components/site/halls/types";
import { PricesBoard } from "@/components/site/halls/PricesBoard";

// Цены
export function Prices({ t, tariffs, trainers }: SectionProps & { tariffs: TariffView[]; trainers: TrainerView[] }) {
  return (
    <section id="prices" className={`w-full ${sectionY}`}>
      <div className={container}>
        <div className="mx-auto mb-8 max-w-[680px] text-center">
          <div className={eyebrow}>{t.eyebrow.prices}</div>
          <h2 className={h2}>{t.prices.title}</h2>
          <p className="mt-2 text-body-md text-text-muted">{t.prices.payment}</p>
        </div>

        <PricesBoard t={t} tariffs={tariffs} trainers={trainers} />

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl bg-surface-card p-6 shadow-xs md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-whatsapp-green/20 text-whatsapp-green">
              <ChatSym className="h-[26px] w-[26px]" />
            </div>
            <div>
              <div className="text-headline-sm text-text-primary">{t.prices.trialNote}</div>
              <p className="text-body-sm text-text-muted">
                {t.contacts.city}, {t.contacts.address} · {t.contacts.hours}
              </p>
            </div>
          </div>
          <a
            href={whatsappUrl(t.wa.price)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-whatsapp-green px-6 text-[13px] uppercase text-white shadow-md transition-all hover:brightness-105 sm:w-auto"
          >
            <span>{t.cta.askPrice}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
