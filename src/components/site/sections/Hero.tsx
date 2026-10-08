import Image from "next/image";
import { site, whatsappUrl } from "@/lib/site";
import { AirSym, CallSym, FitnessCenterSym, LocationOnSym, ScheduleSym } from "@/components/symbols";
import { container, label } from "@/components/ui/styles";
import type { SectionProps } from "@/components/site/sections/types";
import { logoWomen } from "@/lib/brand";

// Полоса с адресом и первый экран
export function Hero({ t }: SectionProps) {
  const [first, middle, ...rest] = t.hero.title.split(". ");
  const stats = [
    { Icon: ScheduleSym, title: t.about.items[3].title, text: t.about.items[3].text },
    { Icon: LocationOnSym, title: t.contacts.city, text: t.contacts.address },
    { Icon: AirSym, title: t.about.items[2].title, text: t.about.items[2].text },
  ];
  return (
    <>
      <section className="hidden w-full border-b border-surface-border bg-surface-container-lowest/90 px-gutter py-2 text-body-sm text-text-muted backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`${label} inline-flex items-center gap-1.5 text-primary-container`}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              {t.contacts.city} · {t.contacts.address}
            </span>
            <span className="text-surface-border">|</span>
            <span>{t.contacts.hours}</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={`tel:${site.phoneTel}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-text-primary transition-colors hover:text-primary-container"
            >
              <CallSym className="h-4 w-4 text-primary-container" />
              {site.phoneDisplay}
            </a>
            <a
              href={site.twoGisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm bg-surface-card px-2.5 py-0.5 text-[12px] text-on-surface"
            >
              <span className="text-star">★</span> {site.rating} · {t.rating.count}
            </a>
          </div>
        </div>
      </section>

      <section id="top" className="relative w-full overflow-hidden py-10 lg:py-16">
        <div className={`${container} grid grid-cols-1 items-center gap-8 lg:grid-cols-12`}>
          <div className="z-10 flex flex-col items-start gap-4 lg:col-span-7">
            <a
              href={site.twoGisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-surface-card px-3.5 py-1.5 shadow-xs"
            >
              <span className="text-[13px] text-primary-container">★ {site.rating}</span>
              <span className="text-surface-border">/</span>
              <span className={`${label} tracking-wider text-text-primary`}>405 {t.hero.rating}</span>
            </a>

            <div className="mt-2 flex flex-col gap-1">
              <span className={`${label} tracking-widest text-primary-container`}>{t.hero.kicker}</span>
              <h1 className="text-display-hero-mobile uppercase leading-[1.02] tracking-tight text-text-primary md:text-display-hero md:leading-[1.02] md:tracking-tight">
                {first}.{" "}
                <span className="bg-linear-to-r from-primary-container to-surface-tint bg-clip-text text-transparent">
                  {middle}.
                </span>{" "}
                {rest.join(". ")}
              </h1>
            </div>

            <p className="max-w-[580px] pt-1 text-body-lg leading-relaxed text-text-muted lg:min-h-[82px]">{t.hero.subtitle}</p>

            <div className="flex w-full flex-wrap items-center gap-4 pt-3 sm:w-auto lg:flex-col lg:items-start">
              <a
                href={whatsappUrl(t.wa.trial)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-2 text-[14px] font-bold uppercase leading-5 tracking-wide text-on-primary shadow-md transition-all hover:brightness-95 active:translate-y-px sm:w-auto md:px-8 md:text-headline-sm md:tracking-wide"
              >
                <span>{t.cta.trialLong}</span>
                <span className={`${label} shrink-0 rounded-sm bg-black/20 px-2 py-0.5 text-on-primary`}>0 ₸</span>
              </a>
              <a
                href="#prices"
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-surface-card px-6 text-headline-sm uppercase text-text-primary shadow-xs transition-all hover:text-primary-container sm:w-auto"
              >
                {t.cta.prices}
              </a>
            </div>

            <div className="mt-4 grid w-full max-w-[620px] grid-cols-1 gap-4 pt-6 sm:grid-cols-3 lg:max-w-none lg:grid-cols-[1fr_1.4fr_1fr]">
              {stats.map(({ Icon, title, text }) => (
                <div key={title} className="flex flex-col">
                  <span className="flex items-center gap-1 text-headline-sm uppercase text-text-primary">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary-container" />
                    {title}
                  </span>
                  <span className="text-body-sm text-text-muted">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative h-[360px] w-full overflow-hidden rounded-2xl bg-surface-card shadow-2xl md:h-[520px]">
              <Image
                src="/stitch/hero.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 500px, 100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-surface-dim/40 to-transparent" />
              <div className="absolute right-4 top-4 flex items-center gap-3 rounded-xl bg-surface-card/90 px-3.5 py-2 shadow-lg backdrop-blur-md">
                <Image
                  src={logoWomen}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full bg-background object-contain p-1"
                />
                <div className="flex flex-col">
                  <span className={`${label} text-primary-container`}>{t.women.title}</span>
                  <span className="text-body-sm font-bold text-text-primary">{t.about.items[1].title}</span>
                </div>
              </div>
              <div className="absolute bottom-5 left-5 flex max-w-[280px] items-center gap-4 rounded-xl bg-background/95 p-4 shadow-xl backdrop-blur-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                  <FitnessCenterSym className="h-[26px] w-[26px]" />
                </div>
                <div className="flex flex-col">
                  <span className={`${label} text-text-muted`}>{t.cta.trial}</span>
                  <span className="text-headline-sm text-text-primary">0 ₸</span>
                  <span className="text-[11px] leading-4 text-primary-container">{t.prices.trialNote}</span>
                </div>
              </div>
              <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-dim/80 text-[10px] text-text-muted backdrop-blur-xs">
                {"'22"}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
