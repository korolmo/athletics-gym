"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/dictionaries/ru";
import { whatsappUrl } from "@/lib/site";
import { ChatSym, CloseSym, PersonSym, ZoomInSym } from "@/components/symbols";
import type { TrainerView } from "@/components/site/halls/types";
import { useHall } from "@/components/site/halls/hall-store";
import { HallSwitch } from "@/components/site/halls/HallSwitch";
import { TariffRows } from "@/components/site/halls/TariffRows";

/**
 * Плакат заполняет рамку 3:4 и прижат к верху. Плакат шире рамки обрезается по бокам, и если важное у края,
 * ему нужно своё прижатие: у Жанерке имя стоит вплотную к левому краю.
 */
const posterPosition: Record<string, string> = {
  "/trainers/zhanerke.jpg": "object-top-left",
};

/** Тренеры выбранного Зала: плакат в рамке 3:4 (по нажатию — целиком), Тарифы и запись в WhatsApp. */
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
        // Карточка занимает пять строк общей сетки (subgrid): плакат, имя, описание, цены, кнопка.
        // В ряду всё стоит на одной линии; строка описания общая: место под ним остаётся и у тех, у кого его нет,
        // а если описания нет ни у кого в ряду — строка схлопывается в ноль. Поэтому зазор между строками сетки
        // нулевой (иначе пустая строка не станет ниже зазора), а расстояние между рядами карточек — их нижний отступ.
        <div className="-mb-6 grid grid-cols-1 gap-x-6 gap-y-0 md:grid-cols-2 lg:grid-cols-3">
          {list.map((tr) => (
            <article
              key={tr.id}
              data-card
              className="row-span-5 mb-6 grid min-w-0 grid-rows-subgrid gap-y-0 overflow-hidden rounded-2xl bg-surface-card shadow-md"
            >
              {/* Рамка одной пропорции 3:4; плакат заполняет её и прижат к верху: обрезается только низ с контактами */}
              {tr.photo ? (
                <button
                  type="button"
                  data-slot="frame"
                  onClick={() => setZoomed(tr)}
                  aria-label={`${t.trainers.open}: ${tr.name}`}
                  className="group relative block aspect-[3/4] w-full cursor-zoom-in bg-surface-container"
                >
                  <Image
                    src={tr.photo}
                    alt={tr.name}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className={`object-cover ${posterPosition[tr.photo] ?? "object-top"}`}
                  />
                  {/* Лупа — в левом нижнем углу: там у плакатов контакты, а цены стоят справа */}
                  <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim/80 text-text-primary backdrop-blur-md transition-colors group-hover:text-primary-container">
                    <ZoomInSym className="h-5 w-5" />
                  </span>
                </button>
              ) : (
                <div
                  data-slot="frame"
                  className="flex aspect-[3/4] w-full items-center justify-center bg-surface-container text-surface-border"
                >
                  <PersonSym className="h-24 w-24" />
                </div>
              )}
              <h3 data-slot="title" className="px-6 pt-6 text-headline-md uppercase text-text-primary [overflow-wrap:anywhere]">
                {tr.name}
              </h3>
              {tr.description?.trim() ? (
                <p data-slot="text" className="px-6 pt-2 text-body-md text-text-muted">
                  {tr.description}
                </p>
              ) : (
                <div data-slot="text" />
              )}
              <div data-slot="list" className="px-6 pt-5">
                {tr.tariffs.length > 0 && <TariffRows p={t.prices} items={tr.tariffs} />}
              </div>
              <div className="self-end px-6 pb-6 pt-6">
                <a
                  data-slot="action"
                  href={whatsappUrl(t.wa.trainer.replace("{name}", tr.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-green text-[14px] uppercase text-white shadow-md transition-all hover:brightness-105"
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
