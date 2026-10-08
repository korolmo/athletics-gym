import type { Dictionary } from "@/dictionaries/ru";

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

/** Тексты блока «Цены» из словаря. */
export type PricesText = Dictionary["prices"];
