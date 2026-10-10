"use client";

import type { Dictionary } from "@/dictionaries/ru";
import { HALLS } from "@/lib/domain/tariff";
import { label } from "@/components/ui/styles";
import { useHall, setHall } from "@/components/site/halls/hall-store";

/** Переключатель «Общий зал / Женский зал». */
export function HallSwitch({ halls, name }: { halls: Dictionary["halls"]; name: string }) {
  const hall = useHall();
  return (
    <div role="tablist" aria-label={name} className="relative inline-grid grid-cols-2 rounded-xl bg-surface-card p-1 shadow-xs">
      {/* Жёлтая подложка шириной в одну кнопку: едет под активную (transform), кнопки одинаковой ширины */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-primary-container transition-transform duration-300 ease-out motion-reduce:transition-none ${
          HALLS.indexOf(hall) === 1 ? "translate-x-full" : "translate-x-0"
        }`}
      />
      {HALLS.map((h) => {
        const active = h === hall;
        return (
          <button
            key={h}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setHall(h)}
            className={`${label} relative z-10 h-11 rounded-lg px-4 transition-colors duration-300 sm:px-6 ${
              active ? "text-on-primary" : "text-text-muted hover:text-primary-container"
            }`}
          >
            {halls[h]}
          </button>
        );
      })}
    </div>
  );
}
