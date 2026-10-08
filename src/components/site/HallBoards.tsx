"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/dictionaries/ru";
import { whatsappUrl } from "@/lib/site";
import { CATEGORY_ORDER, HALLS, isAccess, isAudience, type Category, type HallId } from "@/lib/domain/tariff";
import { formatNumber, formatTariffPrice, plural } from "@/lib/presentation/tariff-labels";
import { ArrowForwardSym, ChatSym, CheckCircleSym, CheckSym, CloseSym, ZoomInSym } from "@/components/symbols";

export type TariffView = {
  id: string;
  hallId: string;
  category: string;
  /** Уточнение уже на языке страницы */
  title: string | null;
  visitsPerMonth: number | null;
  durationMonths: number | null;
  access: string;
  audience: string;
  price: number;
  priceTo: number | null;
};

export type TrainerView = {
  id: string;
  name: string;
  hallId: string;
  photo: string | null;
  description: string | null;
  tariffs: TariffView[];
};

type P = Dictionary["prices"];

const label = "text-label-uppercase uppercase";

/* ───────── Выбранный Зал: один на «Цены» и «Тренеры» ───────── */

let currentHall: HallId = "general";
const listeners = new Set<() => void>();

function setHall(hall: HallId) {
  currentHall = hall;
  listeners.forEach((l) => l());
}

function useHall(): HallId {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentHall,
    () => "general" as HallId,
  );
}

function HallSwitch({ halls, name }: { halls: Dictionary["halls"]; name: string }) {
  const hall = useHall();
  return (
    <div role="tablist" aria-label={name} className="inline-flex rounded-xl bg-surface-card p-1 shadow-xs">
      {HALLS.map((h) => {
        const active = h === hall;
        return (
          <button
            key={h}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setHall(h)}
            className={`${label} h-11 rounded-lg px-4 transition-all sm:px-6 ${
              active ? "bg-primary-container text-on-primary" : "text-text-muted hover:text-primary-container"
            }`}
          >
            {halls[h]}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Подписи Тарифа ───────── */

function countPerMonth(p: P, n: number, words: readonly string[]): string {
  return p.countPerMonth.replace("{n}", String(n)).replace("{word}", plural(n, words));
}

function tariffLabel(p: P, t: TariffView): string {
  if (t.title) return t.title;
  switch (t.category) {
    case "SINGLE":
      return p.singleVisit;
    case "VISITS":
      return countPerMonth(p, t.visitsPerMonth ?? 0, p.visits);
    case "UNLIMITED":
      return `${t.durationMonths ?? 0} ${plural(t.durationMonths ?? 0, p.months)}`;
    default:
      return t.visitsPerMonth ? countPerMonth(p, t.visitsPerMonth, p.sessions) : p.singleSession;
  }
}

/** Пометки Аудитории и Времени доступа. */
function tariffTags(p: P, t: TariffView): string[] {
  const tags: string[] = [];
  if (isAudience(t.audience) && p.audience[t.audience]) tags.push(p.audience[t.audience]);
  if (t.category === "VISITS" && isAccess(t.access)) tags.push(p.access[t.access]);
  return tags;
}

function TariffRows({ p, items, accent }: { p: P; items: TariffView[]; accent?: boolean }) {
  const Check = accent ? CheckCircleSym : CheckSym;
  return (
    <ul className="flex flex-col gap-3 text-body-md text-text-primary">
      {items.map((x) => {
        const tags = tariffTags(p, x);
        return (
          <li key={x.id} className="flex items-start gap-2">
            <Check className="mt-px h-[18px] w-[18px] shrink-0 text-primary-container" />
            <span className="min-w-0 grow">
              {tariffLabel(p, x)}
              {tags.length > 0 && <span className="block text-body-sm text-text-muted">{tags.join(" · ")}</span>}
            </span>
            <span className="shrink-0 whitespace-nowrap font-bold">{formatTariffPrice(x)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FromPrice({ p, value, accent, caption }: { p: P; value: number | null; accent?: boolean; caption?: string }) {
  const [before, after] = p.fromTemplate.split("{price}");
  if (value === null) return <div className="my-6 text-price-numeral text-text-muted">{p.ask}</div>;
  return (
    <div className="my-6">
      <div className="flex items-baseline gap-1">
        {before.trim() && <span className="text-body-sm text-text-muted">{before.trim()}</span>}
        <span
          className={
            accent
              ? "text-[36px] font-extrabold leading-8 tracking-[-0.01em] text-primary-container"
              : "text-price-numeral text-text-primary"
          }
        >
          {formatNumber(value)}
        </span>
        <span className="text-headline-sm text-primary-container">₸</span>
        {after.trim() && <span className="text-body-sm text-text-muted">{after.trim()}</span>}
      </div>
      {caption && <span className="text-body-sm text-text-muted">{caption}</span>}
    </div>
  );
}

/* ───────── Цены ───────── */

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

/* ───────── Тренеры ───────── */

export function TrainersBoard({ t, trainers }: { t: Dictionary; trainers: TrainerView[] }) {
  const hall = useHall();
  const [zoomed, setZoomed] = useState<TrainerView | null>(null);
  const list = trainers.filter((x) => x.hallId === hall);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  return (
    <>
      <div className="mb-8">
        <HallSwitch halls={t.halls} name={t.trainers.title} />
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl bg-surface-card p-6 text-body-md text-text-muted">{t.trainers.empty}</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((tr) => (
            <article key={tr.id} className="flex flex-col overflow-hidden rounded-2xl bg-surface-card shadow-md">
              {tr.photo && (
                <button
                  type="button"
                  onClick={() => setZoomed(tr)}
                  aria-label={`${t.trainers.open}: ${tr.name}`}
                  className="group relative block w-full cursor-zoom-in bg-surface-container"
                >
                  {/* Карточка-плакат от Владельца показывается целиком, без обрезки */}
                  <Image
                    src={tr.photo}
                    alt={tr.name}
                    width={900}
                    height={1300}
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="h-auto w-full"
                  />
                  <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim/80 text-text-primary backdrop-blur-md transition-colors group-hover:text-primary-container">
                    <ZoomInSym className="h-5 w-5" />
                  </span>
                </button>
              )}
              <div className="flex grow flex-col p-6">
                <h3 className="text-headline-md uppercase text-text-primary">{tr.name}</h3>
                {tr.description && <p className="mt-2 text-body-md text-text-muted">{tr.description}</p>}
                {tr.tariffs.length > 0 && (
                  <div className="mt-5">
                    <TariffRows p={t.prices} items={tr.tariffs} />
                  </div>
                )}
                <a
                  href={whatsappUrl(t.wa.trainer.replace("{name}", tr.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-green text-[14px] uppercase text-white shadow-md transition-all hover:brightness-105"
                >
                  <ChatSym className="h-5 w-5" />
                  {t.trainers.book}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {zoomed?.photo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomed.name}
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-background/90 p-3 backdrop-blur-md"
        >
          <Image
            src={zoomed.photo}
            alt={zoomed.name}
            width={1200}
            height={1700}
            sizes="100vw"
            className="h-auto max-h-[94dvh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />
          <button
            type="button"
            aria-label={t.trainers.close}
            onClick={() => setZoomed(null)}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-card text-text-primary shadow-lg hover:text-primary-container"
          >
            <CloseSym className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
