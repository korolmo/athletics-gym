import { beforeEach, describe, expect, it, vi } from "vitest";

// Сервис Отзывов проверяем без базы: Prisma и проверка сессии подменены.

type Row = {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  hallId: string | null;
  source: string;
  sourceUrl: string | null;
  reviewedAt: Date;
  status: string;
  fromVisitor: boolean;
  createdAt: Date;
};

const { state, db, requireOwner } = vi.hoisted(() => {
  const state = { reviews: [] as Row[], submissions: [] as { ipHash: string; createdAt: Date }[], clock: 0, now: 0 };
  const matches = (row: Row, where?: Partial<Row>) => !where || Object.entries(where).every(([k, v]) => row[k as keyof Row] === v);
  const db = {
    review: {
      findMany: vi.fn(async (args?: { where?: Partial<Row>; select?: Record<string, boolean> }) => {
        const rows = state.reviews.filter((r) => matches(r, args?.where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (!args?.select) return rows.map((r) => ({ ...r }));
        return rows.map((r) => Object.fromEntries(Object.keys(args.select!).map((k) => [k, r[k as keyof Row]])));
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.reviews.find((r) => r.id === where.id) ?? null),
      count: vi.fn(async ({ where }: { where?: Partial<Row> }) => state.reviews.filter((r) => matches(r, where)).length),
      groupBy: vi.fn(async () => {
        const by = new Map<string, number>();
        for (const r of state.reviews) by.set(r.status, (by.get(r.status) ?? 0) + 1);
        return [...by].map(([status, n]) => ({ status, _count: { _all: n } }));
      }),
      create: vi.fn(async ({ data }: { data: Omit<Row, "id" | "createdAt"> }) => {
        const row = { id: `r${state.reviews.length + 1}`, createdAt: new Date(1_800_000_000_000 + state.clock++ * 1000), ...data } as Row;
        state.reviews.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = state.reviews.find((r) => r.id === where.id);
        if (!row) throw Object.assign(new Error("not found"), { code: "P2025" });
        Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        state.reviews.filter((r) => r.id === where.id).forEach((r) => Object.assign(r, data));
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.reviews = state.reviews.filter((r) => r.id !== where.id);
      }),
    },
    reviewSubmission: {
      findMany: vi.fn(async ({ where }: { where: { ipHash: string; createdAt: { gt: Date } } }) =>
        state.submissions.filter((s) => s.ipHash === where.ipHash && s.createdAt > where.createdAt.gt),
      ),
      create: vi.fn(async ({ data }: { data: { ipHash: string } }) => {
        state.submissions.push({ ipHash: data.ipHash, createdAt: new Date(state.now) });
      }),
      deleteMany: vi.fn(async ({ where }: { where: { createdAt: { lt: Date } } }) => {
        state.submissions = state.submissions.filter((s) => !(s.createdAt < where.createdAt.lt));
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const requireOwner = vi.fn(async () => {});
  return { state, db, requireOwner };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/admin/guard", () => ({ requireOwner }));

import * as reviews from "./reviews";

const NOW = new Date("2026-10-10T09:00:00Z");
const HOUR = 60 * 60 * 1000;
const visitor = { authorName: "Айгерим", rating: 5, text: "Отличный зал, хожу второй год.", hallId: null };
const manual = {
  id: null,
  authorName: "Данияр",
  text: "Топ зал!",
  rating: 5,
  hallId: "general" as const,
  source: "TWOGIS" as const,
  sourceUrl: null,
  reviewedAt: new Date("2026-09-30T00:00:00Z"),
  status: "PUBLISHED" as const,
};
const human = (ipHash = "ip-1") => ({ honeypot: "", elapsedMs: 20_000, ipHash });

beforeEach(() => {
  vi.clearAllMocks();
  requireOwner.mockImplementation(async () => {});
  state.reviews = [];
  state.submissions = [];
  state.clock = 0;
  state.now = NOW.getTime();
});

describe("отзыв Посетителя с сайта", () => {
  it("принятый отзыв — «Новый», источник «сайт», помечен как отзыв Посетителя; дата — сегодня в зале", async () => {
    expect(await reviews.checkVisitorSubmission(human(), NOW)).toEqual({ verdict: "accept" });
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    expect(state.reviews).toHaveLength(1);
    expect(state.reviews[0]).toMatchObject({
      ...visitor,
      status: "NEW",
      source: "SITE",
      sourceUrl: null,
      fromVisitor: true,
      reviewedAt: new Date("2026-10-10T00:00:00.000Z"),
    });
  });

  it("до одобрения на сайте его нет", async () => {
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    expect(await reviews.listPublishedReviews()).toEqual([]);
  });

  it("ловушка сработала — в базу не ходим и ничего не пишем", async () => {
    const check = await reviews.checkVisitorSubmission({ honeypot: "http://spam.example", elapsedMs: 20_000, ipHash: "ip-1" }, NOW);
    expect(check).toEqual({ verdict: "trap" });
    expect(db.reviewSubmission.findMany).not.toHaveBeenCalled();
    expect(db.review.create).not.toHaveBeenCalled();
    expect(state.reviews).toEqual([]);
    expect(state.submissions).toEqual([]);
  });

  it("быстрее трёх секунд или без метки времени — не принимаем", async () => {
    expect(await reviews.checkVisitorSubmission({ ...human(), elapsedMs: 1_500 }, NOW)).toEqual({ verdict: "too-fast" });
    expect(await reviews.checkVisitorSubmission({ ...human(), elapsedMs: null }, NOW)).toEqual({ verdict: "stale" });
  });

  it("лимит: три отзыва с одного адреса за сутки, четвёртый — отказ; с другого адреса — можно", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await reviews.checkVisitorSubmission(human(), NOW)).toEqual({ verdict: "accept" });
      await reviews.createVisitorReview(visitor, "ip-1", NOW);
    }
    expect(await reviews.checkVisitorSubmission(human(), NOW)).toEqual({ verdict: "limit" });
    expect(await reviews.checkVisitorSubmission(human("ip-2"), NOW)).toEqual({ verdict: "accept" });
    expect(state.reviews).toHaveLength(3);
  });

  it("через сутки лимит снова свободен", async () => {
    for (let i = 0; i < 3; i++) await reviews.createVisitorReview(visitor, "ip-1", NOW);
    const tomorrow = new Date(NOW.getTime() + 25 * HOUR);
    expect(await reviews.checkVisitorSubmission(human(), tomorrow)).toEqual({ verdict: "accept" });
  });

  it("в записи об отправке — только хэш адреса", async () => {
    await reviews.createVisitorReview(visitor, "ip-hash-abc", NOW);
    expect(state.submissions).toEqual([{ ipHash: "ip-hash-abc", createdAt: NOW }]);
    expect(JSON.stringify(state.reviews)).not.toContain("ip-hash-abc");
  });

  it("старые записи об отправках вычищаются", async () => {
    state.submissions.push({ ipHash: "old", createdAt: new Date(NOW.getTime() - 72 * HOUR) });
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    expect(state.submissions.map((s) => s.ipHash)).toEqual(["ip-1"]);
  });
});

describe("на сайте видны только опубликованные", () => {
  beforeEach(async () => {
    await reviews.saveOwnerReview({ ...manual, authorName: "Опубликован" });
    await reviews.saveOwnerReview({ ...manual, authorName: "Скрыт", status: "HIDDEN" });
    await reviews.createVisitorReview({ ...visitor, authorName: "Новый" }, "ip-1", NOW);
  });

  it("новые и скрытые не попадают в выдачу сайта", async () => {
    const shown = await reviews.listPublishedReviews();
    expect(shown.map((r) => r.authorName)).toEqual(["Опубликован"]);
    expect(db.review.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { status: "PUBLISHED" } }));
  });

  it("сайту не отдаются служебные поля", async () => {
    const [shown] = await reviews.listPublishedReviews();
    expect(Object.keys(shown).sort()).toEqual(["authorName", "id", "rating", "reviewedAt", "source", "sourceUrl", "text"]);
  });

  it("опубликовали отзыв Посетителя — появился; скрыли — пропал", async () => {
    const fresh = state.reviews.find((r) => r.authorName === "Новый")!;
    await reviews.setReviewStatus(fresh.id, "PUBLISHED");
    expect((await reviews.listPublishedReviews()).map((r) => r.authorName).sort()).toEqual(["Новый", "Опубликован"]);
    await reviews.setReviewStatus(fresh.id, "HIDDEN");
    expect((await reviews.listPublishedReviews()).map((r) => r.authorName)).toEqual(["Опубликован"]);
  });

  it("удалённый отзыв пропадает", async () => {
    await reviews.deleteReview(state.reviews.find((r) => r.authorName === "Опубликован")!.id);
    expect(await reviews.listPublishedReviews()).toEqual([]);
  });
});

describe("админка", () => {
  it("ручной отзыв сразу опубликован и не считается отзывом Посетителя", async () => {
    const r = await reviews.saveOwnerReview(manual);
    expect(r.ok).toBe(true);
    expect(state.reviews[0]).toMatchObject({ status: "PUBLISHED", fromVisitor: false, source: "TWOGIS" });
  });

  it("ручной отзыв можно править", async () => {
    const created = await reviews.saveOwnerReview(manual);
    if (!created.ok) throw new Error(created.error);
    expect(await reviews.saveOwnerReview({ ...manual, id: created.id, text: "Топ зал, советую!", rating: 4 })).toEqual({ ok: true, id: created.id });
    expect(state.reviews[0]).toMatchObject({ text: "Топ зал, советую!", rating: 4 });
  });

  it("текст отзыва Посетителя править нельзя — ни текст, ни имя, ни оценку", async () => {
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    const id = state.reviews[0].id;
    const r = await reviews.saveOwnerReview({ ...manual, id, text: "Исправленный текст", authorName: "Другой", rating: 1 });
    expect(r.ok === false && r.error).toMatch(/править нельзя/);
    expect(state.reviews[0]).toMatchObject({ ...visitor, status: "NEW", fromVisitor: true });
    expect(db.review.update).not.toHaveBeenCalled();
  });

  it("правка удалённого отзыва — понятная ошибка", async () => {
    const r = await reviews.saveOwnerReview({ ...manual, id: "ghost" });
    expect(r.ok === false && r.error).toMatch(/не найдена/);
  });

  it("новые идут первыми, дальше — по времени добавления", async () => {
    await reviews.saveOwnerReview({ ...manual, authorName: "ручной-1" });
    await reviews.createVisitorReview({ ...visitor, authorName: "новый-1" }, "ip-1", NOW);
    await reviews.saveOwnerReview({ ...manual, authorName: "ручной-2" });
    await reviews.createVisitorReview({ ...visitor, authorName: "новый-2" }, "ip-2", NOW);
    expect((await reviews.listReviews()).map((r) => r.authorName)).toEqual(["новый-2", "новый-1", "ручной-2", "ручной-1"]);
  });

  it("фильтр по статусу и счётчики; счётчик новых — для меню", async () => {
    await reviews.saveOwnerReview(manual);
    await reviews.saveOwnerReview({ ...manual, status: "HIDDEN" });
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    await reviews.createVisitorReview(visitor, "ip-2", NOW);
    expect((await reviews.listReviews("NEW")).every((r) => r.status === "NEW")).toBe(true);
    expect(await reviews.listReviews("HIDDEN")).toHaveLength(1);
    expect(await reviews.countReviewsByStatus()).toEqual({ NEW: 2, PUBLISHED: 1, HIDDEN: 1 });
    expect(await reviews.countNewReviews()).toBe(2);
    await reviews.setReviewStatus(state.reviews.find((r) => r.status === "NEW")!.id, "PUBLISHED");
    expect(await reviews.countNewReviews()).toBe(1);
  });
});

describe("права: без сессии Владельца нельзя одобрять, править и удалять", () => {
  const NO_SESSION = new Error("NEXT_REDIRECT;/admin/login");

  const owner: [string, () => Promise<unknown>][] = [
    ["listReviews", () => reviews.listReviews()],
    ["countReviewsByStatus", () => reviews.countReviewsByStatus()],
    ["countNewReviews", () => reviews.countNewReviews()],
    ["getReview", () => reviews.getReview("r1")],
    ["saveOwnerReview", () => reviews.saveOwnerReview({ ...manual, id: "r1", text: "подмена" })],
    ["setReviewStatus", () => reviews.setReviewStatus("r1", "PUBLISHED")],
    ["deleteReview", () => reviews.deleteReview("r1")],
  ];
  // Эти три — для сайта: работают без сессии, но ничего, кроме приёма «Нового» отзыва и чтения опубликованных, не умеют
  const publicFunctions = ["listPublishedReviews", "checkVisitorSubmission", "createVisitorReview"];

  it("каждая функция сервиса либо требует сессию, либо в списке функций сайта", () => {
    const exported = Object.entries(reviews).filter(([, v]) => typeof v === "function").map(([k]) => k);
    expect([...owner.map(([name]) => name), ...publicFunctions].sort()).toEqual(exported.sort());
  });

  it.each(owner)("%s: отказ, база не тронута", async (_name, call) => {
    await reviews.createVisitorReview(visitor, "ip-1", NOW);
    const before = JSON.stringify(state.reviews);
    vi.clearAllMocks();
    requireOwner.mockRejectedValue(NO_SESSION);

    await expect(call()).rejects.toBe(NO_SESSION);

    expect(JSON.stringify(state.reviews)).toBe(before);
    expect(state.reviews[0].status).toBe("NEW");
    for (const fn of Object.values(db.review)) expect(fn).not.toHaveBeenCalled();
  });

  it("функции сайта сессию не спрашивают, но опубликовать отзыв через них нельзя", async () => {
    requireOwner.mockRejectedValue(NO_SESSION);
    await reviews.createVisitorReview({ ...visitor, ...({ status: "PUBLISHED", fromVisitor: false } as object) }, "ip-1", NOW);
    expect(state.reviews[0]).toMatchObject({ status: "NEW", fromVisitor: true, source: "SITE" });
    expect(await reviews.listPublishedReviews()).toEqual([]);
    expect(requireOwner).not.toHaveBeenCalled();
  });
});
