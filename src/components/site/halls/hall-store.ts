"use client";

import { useSyncExternalStore } from "react";
import type { HallId } from "@/lib/domain/tariff";

// Выбранный Зал: один на блоки «Цены» и «Тренеры»

let currentHall: HallId = "general";
const listeners = new Set<() => void>();

export function setHall(hall: HallId) {
  currentHall = hall;
  listeners.forEach((l) => l());
}

export function useHall(): HallId {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentHall,
    () => "general" as HallId,
  );
}
