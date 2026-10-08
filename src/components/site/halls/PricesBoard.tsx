"use client";

import type { Dictionary } from "@/dictionaries/ru";
import { whatsappUrl } from "@/lib/site";
import { CATEGORY_ORDER, type Category } from "@/lib/domain/tariff";
import { ArrowForwardSym } from "@/components/symbols";
import { label } from "@/components/ui/styles";
import type { TariffView, TrainerView } from "@/components/site/halls/types";
import { useHall } from "@/components/site/halls/hall-store";
import { HallSwitch } from "@/components/site/halls/HallSwitch";
import { tariffLabel } from "@/components/site/halls/tariff-text";
import { TariffRows } from "@/components/site/halls/TariffRows";
import { FromPrice } from "@/components/site/halls/FromPrice";

/** Карточки цен по Категориям для выбранного Зала. */
export function PricesBoard({
  t,
  tariffs,
  trainers,
}: {
  t: Dictionary;
  /** Позиции прайса Залов (без Тарифов Тренеров) */
  tariffs: TariffView[];
  trainers: TrainerView[];
}) {
  const hall = useHall();
  const p = t.prices;
  const own = tariffs.filter((x) => x.hallId === hall);
  const ofTrainers = trainers.filter((x) => x.hallId === hall).flatMap((x) => x.tariffs);

  return (
    <>
      <div className="mb-8 flex justify-center">
        <HallSwitch halls={t.halls} name={p.title} />
      </div>
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_ORDER.map((cat: Category, i) => {
          const list = own.filter((x) => x.category === cat);
          const personal = cat === "PERSONAL";
          // «от» — минимум по Категории; у персональных считаем и Тарифы Тренеров Зала
          const pool = personal ? [...list, ...ofTrainers] : list;
          const cheapest = pool.length ? pool.reduce((a, b) => (b.price < a.price ? b : a)) : null;
          const accent = cat === "UNLIMITED" && cheapest !== null;
          const caption = !cheapest
            ? undefined
            : personal
              ? cheapest.visitsPerMonth
                ? tariffLabel(p, { ...cheapest, title: null })
                : p.perSession
              : undefined;
          return (
            <div
              key={cat}
              className={
                accent
                  ? "flex flex-col justify-between rounded-2xl bg-linear-to-b from-surface-card via-surface-container to-surface-card p-6 shadow-2xl outline-2 outline-primary-container xl:p-7"
                  : "flex flex-col justify-between rounded-2xl bg-surface-card p-6 shadow-md xl:p-7"
              }
            >
              <div>
                <div className="mb-4 flex min-h-5 items-center justify-between gap-2">
                  <span className={`${label} ${accent ? "text-primary-container" : "text-text-muted"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {p.categoryNotes[cat] && (
                    <span
                      className={`rounded-sm px-2.5 py-0.5 text-[11px] uppercase ${
                        accent ? "bg-primary-container/20 text-primary-container" : "bg-surface-container text-text-muted"
                      }`}
                    >
                      {p.categoryNotes[cat]}
                    </span>
                  )}
                </div>
                <h3 className="text-headline-md uppercase text-text-primary">{p.categories[cat]}</h3>
                <FromPrice p={p} value={cheapest ? cheapest.price : null} accent={accent} caption={caption} />
                {list.length > 0 && <TariffRows p={p} items={list} accent={accent} />}
              </div>
              <div className="pt-6">
                {personal ? (
                  <a
                    href="#trainers"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-[14px] text-on-primary shadow-md transition-all hover:brightness-95"
                  >
                    {p.toTrainers}
                    <ArrowForwardSym className="h-4 w-4" />
                  </a>
                ) : (
                  <a
                    href={whatsappUrl(t.wa.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-container text-[14px] text-text-primary transition-colors hover:text-primary-container"
                  >
                    {t.cta.whatsapp}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
