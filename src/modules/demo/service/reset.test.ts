import { beforeEach, describe, expect, it, vi } from "vitest";

// Суточный сброс демо (этап П1): снимок, раз в сутки, порядок модулей, блокировка. База и модули — подделки.

type State = { snapshot: string | null; snapshotAt: Date | null; lastResetAt: Date | null; lastResetMs: number | null; lockedUntil: Date | null };

const h = vi.hoisted(() => {
  const st = { row: null as State | null, calls: [] as string[] };
  const where = (w: { OR: { lastResetAt: null | { lt: Date } }[]; AND: { OR: { lockedUntil: null | { lt: Date } }[] }[] }, r: State) => {
    const lastOk = w.OR.some((c) => (c.lastResetAt === null ? r.lastResetAt === null : r.lastResetAt !== null && r.lastResetAt < c.lastResetAt.lt));
    const lockOk = w.AND[0].OR.some((c) => (c.lockedUntil === null ? r.lockedUntil === null : r.lockedUntil !== null && r.lockedUntil < c.lockedUntil.lt));
    return lastOk && lockOk;
  };
  const db = {
    demoState: {
      upsert: vi.fn(async () => {
        st.row ??= { snapshot: null, snapshotAt: null, lastResetAt: null, lastResetMs: null, lockedUntil: null };
      }),
      updateMany: vi.fn(async ({ where: w, data }: { where: Parameters<typeof where>[0]; data: Partial<State> }) => {
        if (!st.row || !where(w, st.row)) return { count: 0 };
        Object.assign(st.row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: { data: Partial<State> }) => void Object.assign(st.row!, data)),
      findUniqueOrThrow: vi.fn(async () => ({ snapshot: st.row!.snapshot })),
    },
  };
  const part = (name: string) => ({
    snap: vi.fn(async () => {
      st.calls.push(`snap:${name}`);
      return { name };
    }),
    restore: vi.fn(async () => void st.calls.push(`restore:${name}`)),
  });
  return { st, db, parts: Object.fromEntries(["club", "site", "trainers", "tariffs", "directions", "reviews", "photos"].map((n) => [n, part(n)])) };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/observability/log", () => ({ log: vi.fn() }));
for (const [mod, key, cap] of [
  ["@/modules/club", "club", "Club"],
  ["@/modules/site", "site", "Site"],
  ["@/modules/trainers", "trainers", "Trainers"],
  ["@/modules/tariffs", "tariffs", "Tariffs"],
  ["@/modules/directions", "directions", "Directions"],
  ["@/modules/reviews", "reviews", "Reviews"],
  ["@/modules/photos", "photos", "Photos"],
] as const) {
  vi.doMock(mod, () => ({
    [`snapshot${cap}Demo`]: h.parts[key].snap,
    [`restore${cap}Demo`]: h.parts[key].restore,
    // Пояс Клуба для границы сброса — Кызылорда, UTC+5
    ...(key === "club" ? { getClub: async () => ({ timeZone: "Asia/Qyzylorda" }) } : {}),
  }));
}

const { runDailyDemoReset } = await import("./reset");

beforeEach(() => {
  h.st.row = null;
  h.st.calls = [];
});

// 10:00 по времени Клуба (UTC+5) — после 04:00
const day1 = new Date("2026-11-11T05:00:00Z");
const day1later = new Date("2026-11-11T12:00:00Z");
const day2 = new Date("2026-11-12T05:00:00Z");

describe("суточный сброс демо", () => {
  it("первый раз — только снимок, ничего не возвращает; второй раз в те же сутки — ничего", async () => {
    expect(await runDailyDemoReset(day1)).toMatchObject({ ran: true, snapshotTaken: true });
    expect(h.st.calls.every((c) => c.startsWith("snap:"))).toBe(true);
    expect(h.st.row?.snapshot).toContain('"club"');
    h.st.calls = [];
    expect(await runDailyDemoReset(day1later)).toEqual({ ran: false });
    expect(h.st.calls).toEqual([]);
  });

  it("на следующие сутки — возврат по снимку, Тренеры раньше Тарифов; время сброса записано", async () => {
    await runDailyDemoReset(day1);
    h.st.calls = [];
    expect(await runDailyDemoReset(day2)).toMatchObject({ ran: true, snapshotTaken: false });
    expect(h.st.calls).toEqual(["restore:club", "restore:site", "restore:trainers", "restore:tariffs", "restore:directions", "restore:reviews", "restore:photos"]);
    expect(h.st.row).toMatchObject({ lastResetAt: day2, lockedUntil: null });
    expect(typeof h.st.row?.lastResetMs).toBe("number");
  });

  it("два запроса одновременно — сброс один", async () => {
    await runDailyDemoReset(day1);
    h.st.calls = [];
    const [a, b] = await Promise.all([runDailyDemoReset(day2), runDailyDemoReset(day2)]);
    expect([a.ran, b.ran].filter(Boolean)).toHaveLength(1);
    expect(h.st.calls.filter((c) => c === "restore:club")).toHaveLength(1);
  });

  it("сбой посередине — блокировка держится, повтор не идёт по кругу", async () => {
    await runDailyDemoReset(day1);
    h.parts.tariffs.restore.mockRejectedValueOnce(new Error("база"));
    await expect(runDailyDemoReset(day2)).rejects.toThrow("база");
    expect(await runDailyDemoReset(new Date(day2.getTime() + 60_000))).toEqual({ ran: false });
    expect((await runDailyDemoReset(new Date(day2.getTime() + 6 * 60_000))).ran).toBe(true);
  });
});
