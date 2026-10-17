// Общие данные seed: Залы и прайс Athletic's Gym от Владельца (7 октября 2026, docs/owner/prices-2026-10.md).
// Берут оба seed: обычный (prisma/seed.ts) и Лаборатории (prisma/seed-lab.ts, ADR 0007).
import type { Access, Audience, TariffCategory } from "@prisma/client";

export const HALLS = [
  { id: "general", nameRu: "Общий зал", nameKk: "Жалпы зал", sortOrder: 0 },
  { id: "women", nameRu: "Женский зал", nameKk: "Әйелдер залы", sortOrder: 1 },
] as const;

export type HallId = "general" | "women";

export type TariffSeed = {
  category: TariffCategory;
  price: number;
  priceTo?: number;
  visitsPerMonth?: number;
  durationMonths?: number;
  access?: Access;
  audience?: Audience;
  titleRu?: string;
};

// Позиции прайса Зала — в порядке плаката
export const hallTariffs: Record<HallId, TariffSeed[]> = {
  general: [
    { category: "SINGLE", price: 3000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "STUDENTS", price: 10000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "STUDENTS", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "ALL", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "WOMEN", price: 15000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "MEN", price: 17000 },
    { category: "UNLIMITED", durationMonths: 1, price: 25000 },
    { category: "UNLIMITED", durationMonths: 3, price: 60000 },
    { category: "UNLIMITED", durationMonths: 6, price: 120000 },
    { category: "UNLIMITED", durationMonths: 12, price: 170000 },
    // Строку «Жеке жаттықтырушы 15 000 – 25 000» не заводим: персональные цены — только у Тренеров
  ],
  women: [
    { category: "SINGLE", price: 3000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "STUDENTS", price: 10000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "STUDENTS", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "ALL", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "ALL", price: 15000 },
    { category: "UNLIMITED", durationMonths: 1, price: 20000 },
    { category: "UNLIMITED", durationMonths: 3, price: 50000 },
    { category: "UNLIMITED", durationMonths: 6, price: 105000 },
    { category: "UNLIMITED", durationMonths: 12, price: 140000 },
  ],
};

// «Месяц» персональных = 12 тренировок в месяц (так на карточках Тренеров)
export const MONTH = { category: "PERSONAL" as const, visitsPerMonth: 12 };
export const ONCE = { category: "PERSONAL" as const };

/**
 * Контакты Лаборатории — вымышленные и нерабочие: +7 700 000 00 00; в Instagram имя с двумя точками подряд
 * (Instagram такие не выдаёт, а наша форма их принимает); почта на зарезервированном домене example.com (RFC 2606).
 */
export const LAB_CONTACTS = {
  phone: "+77000000000",
  whatsapp: "77000000000",
  instagram: "https://instagram.com/athletics.gym..demo",
  womenInstagram: "https://instagram.com/athletics.women..demo",
  privacyEmail: "demo@example.com",
};
