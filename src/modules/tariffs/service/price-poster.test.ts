import { beforeEach, describe, expect, it, vi } from "vitest";

// Место «Плакат прайса» (этап 6, ADR 0015): путь хранится у Зала, файл ведёт модуль Фото.
const { halls, db } = vi.hoisted(() => {
  const halls = [
    { id: "general", sortOrder: 0, pricePoster: null as string | null },
    { id: "women", sortOrder: 1, pricePoster: null as string | null },
  ];
  const db = {
    hall: {
      count: vi.fn(async ({ where }: { where: { id: string } }) => halls.filter((h) => h.id === where.id).length),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const h = halls.find((x) => x.id === where.id);
        return h ? { ...h } : null; // как Prisma: копия, а не ссылка на строку
      }),
      findMany: vi.fn(async () => halls.map((h) => ({ ...h }))),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { pricePoster: string | null } }) => {
        Object.assign(halls.find((h) => h.id === where.id)!, data);
      }),
    },
  };
  return { halls, db };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/modules/owner", () => ({ requireOwner: vi.fn(async () => {}) }));
vi.mock("@/modules/photos", () => ({ mediaUrl: (p: string | null) => (p ? `/media/${p}` : null) }));

import { listPricePosters, pricePosterSlot } from "./price-poster";

beforeEach(() => {
  vi.clearAllMocks();
  halls.forEach((h) => (h.pricePoster = null));
});

describe("место «Плакат прайса»", () => {
  it("есть только у Залов из списка: чужой id в базу не идёт", async () => {
    expect(await pricePosterSlot.exists("general")).toBe(true);
    expect(await pricePosterSlot.exists("vip")).toBe(false);
    expect(await pricePosterSlot.exists(undefined)).toBe(false);
    expect(db.hall.count).toHaveBeenCalledTimes(1);
  });

  it("записывает путь и отдаёт прежний; снятие отдаёт прежний и очищает", async () => {
    expect(await pricePosterSlot.set("women", "hall/a.webp")).toBeNull();
    expect(await pricePosterSlot.set("women", "hall/b.webp")).toBe("hall/a.webp");
    expect(await pricePosterSlot.paths()).toEqual([null, "hall/b.webp"]);
    expect(await pricePosterSlot.clear("women")).toBe("hall/b.webp");
    expect(await pricePosterSlot.clear("women")).toBeNull();
    expect(halls[1].pricePoster).toBeNull();
  });

  it("список для админки — по всем Залам, со ссылками", async () => {
    await pricePosterSlot.set("general", "hall/c.webp");
    expect(await listPricePosters()).toEqual({ general: "/media/hall/c.webp", women: null });
  });
});
