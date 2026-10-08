import Image from "next/image";
import { site, whatsappUrl } from "@/lib/site";
import { ChatSym, CheckCircleSym, LockSym, PhotoCameraSym } from "@/components/symbols";
import { container, label, h2 } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";

// Женский зал
export function Women({ t }: SectionProps) {
  return (
    <section id="women" className="w-full py-4">
      <div className={container}>
        <div className="relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-surface-card via-surface-container-high to-surface-card p-8 shadow-2xl lg:flex lg:min-h-[480px] lg:p-12">
          <div className="relative z-10 grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-start gap-4 lg:col-span-8 lg:self-start">
              <div className={`${label} inline-flex items-center gap-2 rounded-sm bg-primary-container/10 px-3 py-1 text-primary-container`}>
                <LockSym className="h-4 w-4 shrink-0" />
                {t.about.items[1].text}
              </div>
              <h2 className={h2}>{t.women.title}</h2>
              <p className="max-w-[640px] text-body-lg text-text-muted">{t.women.text}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-body-md text-text-primary">
                {[t.prices.trialNote, t.prices.payment].map((x) => (
                  <div key={x} className="flex items-center gap-2">
                    <CheckCircleSym className="h-5 w-5 shrink-0 text-primary-container" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href={site.instagramWomen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-2 rounded-xl bg-surface-container px-6 text-[14px] text-text-primary shadow-xs transition-colors hover:text-primary-container"
                >
                  <PhotoCameraSym className="h-[18px] w-[18px]" />
                  <span>{t.women.link}</span>
                </a>
                <a
                  href={whatsappUrl(t.wa.trial)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-2 rounded-xl bg-whatsapp-green px-6 text-[14px] text-white shadow-md transition-all hover:brightness-105"
                >
                  <ChatSym className="h-[18px] w-[18px]" />
                  <span>{t.cta.trial}</span>
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center lg:col-span-4">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-surface-dim p-4 shadow-inner">
                <Image
                  src="/logo-women.png"
                  alt={t.women.title}
                  width={176}
                  height={176}
                  className="h-44 w-44 rounded-full object-contain shadow-lg"
                />
                <div className={`${label} absolute -bottom-2 rounded-full bg-primary-container px-3 py-1 text-on-primary shadow-md`}>
                  {t.women.title}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
