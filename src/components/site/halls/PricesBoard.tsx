"use client";

import type { Dictionary } from "@/dictionaries/ru";
import { whatsappUrl } from "@/lib/site";
import { CATEGORY_ORDER, type Category } from "@/lib/domain/tariff";
import { ArrowForwardSym, ChatSym } from "@/components/symbols";
import { label } from "@/components/ui/styles";
import type { TariffView, TrainerView } from "@/components/site/halls/types";
import { useHall } from "@/components/site/halls/hall-store";
import { HallSwitch } from "@/components/site/halls/HallSwitch";
import { tariffLabel } from "@/components/site/halls/tariff-text";
import { TariffRows } from "@/components/site/halls/TariffRows";
import { FromPrice } from "@/components/site/halls/FromPrice";

// Кнопки внизу карточек — одного размера и высоты. WhatsApp — зелёная, как «Записаться» у Тренеров
// и остальные кнопки WhatsApp на сайте; «Выбрать тренера» — жёлтая, потому что ведёт не в WhatsApp, а к блоку Тренеров.
const actionBase =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] uppercase shadow-md transition-all";
const actionWhatsApp = `${actionBase} bg-whatsapp-green text-white hover:brightness-105`;
const actionTrainers = `${actionBase} bg-primary-container text-on-primary hover:brightness-95 active:translate-y-px`;

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
      {/* Карточка занимает пять строк общей сетки (subgrid): номер и бейдж, заголовок, цена «от …»,
          список, кнопка. Поэтому в ряду всё стоит на одной линии, а кнопки — на одной высоте внизу. */}
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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
              data-card
              className={`row-span-5 grid min-w-0 grid-rows-subgrid gap-y-0 rounded-2xl p-6 xl:p-7 ${
                accent
                  ? "bg-linear-to-b from-surface-card via-surface-container to-surface-card shadow-2xl outline-2 outline-primary-container"
                  : "bg-surface-card shadow-md"
              }`}
            >
              <div data-slot="top" className="flex min-h-5 items-center justify-between gap-2">
                <span className={`${label} ${accent ? "text-primary-container" : "text-text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {p.categoryNotes[cat] && (
                  <span
                    className={`rounded-sm px-2.5 py-0.5 text-right text-[11px] uppercase ${
                      accent ? "bg-primary-container/20 text-primary-container" : "bg-surface-container text-text-muted"
                    }`}
                  >
                    {p.categoryNotes[cat]}
                  </span>
                )}
              </div>
              <h3 data-slot="title" className="mt-4 text-headline-md uppercase text-text-primary [overflow-wrap:anywhere]">
                {p.categories[cat]}
              </h3>
              <div data-slot="price">
                <FromPrice p={p} value={cheapest ? cheapest.price : null} accent={accent} caption={caption} />
              </div>
              {/* Строка списка есть всегда — даже пустая, иначе кнопка съедет в чужую строку сетки */}
              <div data-slot="list">{list.length > 0 && <TariffRows p={p} items={list} accent={accent} />}</div>
              <div className="self-end pt-6">
                {personal ? (
                  <a data-slot="action" href="#trainers" className={actionTrainers}>
                    {p.toTrainers}
                    <ArrowForwardSym className="h-5 w-5 shrink-0" />
                  </a>
                ) : (
                  <a
                    data-slot="action"
                    href={whatsappUrl(t.wa.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={actionWhatsApp}
                  >
                    <ChatSym className="h-5 w-5 shrink-0" />
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
