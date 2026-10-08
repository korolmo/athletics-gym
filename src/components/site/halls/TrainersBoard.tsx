"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/dictionaries/ru";
import { whatsappUrl } from "@/lib/site";
import { ChatSym, CloseSym, ZoomInSym } from "@/components/symbols";
import type { TrainerView } from "@/components/site/halls/types";
import { useHall } from "@/components/site/halls/hall-store";
import { HallSwitch } from "@/components/site/halls/HallSwitch";
import { TariffRows } from "@/components/site/halls/TariffRows";

/** Тренеры выбранного Зала: плакат целиком (по нажатию — крупно), Тарифы и запись в WhatsApp. */
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
