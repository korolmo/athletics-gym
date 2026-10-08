"use client";

import type { Dictionary } from "@/dictionaries/ru";
import { HALLS } from "@/lib/domain/tariff";
import { label } from "@/components/ui/styles";
import { useHall, setHall } from "@/components/site/halls/hall-store";

/** Переключатель «Общий зал / Женский зал». */
export function HallSwitch({ halls, name }: { halls: Dictionary["halls"]; name: string }) {
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
