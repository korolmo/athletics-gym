import { beforeEach, describe, expect, it, vi } from "vitest";

// Сервис Записей без базы: Prisma, сессии, Тренеры и Окна подменены. Гонку на настоящей базе проверяет
// src/lib/mariadb.integration.test.ts («Записи: 50 параллельных записей на одно Окно»).

type Row = {
  id: string;
  clientId: string | null;
  trainerId: string | null;
  hallId: string;
  startAt: Date;
  endAt: Date;
  status: "ACTIVE" | "CANCELLED";
  activeTrainerId: string | null;
  idempotencyKey: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
};

const { state, db, mocks } = vi.hoisted(() => {
  const state = { rows: [] as Row[], seq: 0, client: "k1", windowFree: true, trainer: { id: "t1", name: "Арман", hallId: "general" } as object | null };
  const p2002 = (target: string[]) => Object.assign(new Error("unique"), { code: "P2002", meta: { target } });
  const pick = (r: Row, select?: Record<string, boolean>) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, r[k as keyof Row]])) : { ...r });
  const match = (r: Row, w: Record<string, unknown>) =>
    Object.entries(w).every(([k, v]) => {
      const val = r[k as keyof Row];
      if (v && typeof v === "object" && !(v instanceof Date)) {
        const o = v as { gt?: Date; lt?: Date; gte?: Date };
        return (!o.gt || (val as Date) > o.gt) && (!o.lt || (val as Date) < o.lt) && (!o.gte || (val as Date) >= o.gte);
      }
      return val === v;
    });
  const booking = {
    findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) =>
      state.rows.filter((r) => match(r, where)).sort((a, b) => b.startAt.getTime() - a.startAt.getTime()).map((r) => pick(r, select)),
    ),
    findFirst: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const r = state.rows.find((x) => match(x, where));
      return r ? pick(r, select) : null;
    }),
    findUnique: vi.fn(async ({ where, select }: { where: { idempotencyKey: string }; select?: Record<string, boolean> }) => {
      const r = state.rows.find((x) => x.idempotencyKey === where.idempotencyKey);
      return r ? pick(r, select) : null;
    }),
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.rows.filter((r) => match(r, where)).length),
    create: vi.fn(async ({ data, select }: { data: Omit<Row, "id" | "status" | "cancelledAt" | "cancelledBy">; select?: Record<string, boolean> }) => {
      if (state.rows.some((r) => r.idempotencyKey === data.idempotencyKey)) throw p2002(["idempotencyKey"]);
      if (state.rows.some((r) => r.activeTrainerId && r.activeTrainerId === data.activeTrainerId && r.startAt.getTime() === data.startAt.getTime())) {
        throw p2002(["activeTrainerId", "startAt"]);
      }
      const row: Row = { id: `b${++state.seq}`, status: "ACTIVE", cancelledAt: null, cancelledBy: null, ...data };
      state.rows.push(row);
      return pick(row, select);
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
      const hit = state.rows.filter((r) => match(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    }),
  };
  const db = { booking, $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ booking })) };
  const mocks = {
    requireOwner: vi.fn(async () => {}),
    lockClient: vi.fn(async () => {}),
    enqueue: vi.fn(async () => {}),
  };
  return { state, db, mocks };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/modules/owner", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/modules/clients", () => ({ requireClient: async () => ({ id: state.client, name: "К", phone: "+77000000001" }), lockClient: mocks.lockClient }));
vi.mock("@/modules/trainers", () => ({ getBookableTrainer: async () => state.trainer, getTrainerNames: async () => ({ t1: "Арман" }) }));
vi.mock("@/modules/notifications", () => ({ enqueue: mocks.enqueue }));
vi.mock("@/modules/schedule", () => ({
  BOOKING_HORIZON_DAYS: 14,
  isWindowFree: async () => state.windowFree,
  sessionMinutesOf: async () => 60,
}));

const { createBooking, cancelMyBooking, cancelBookingByOwner, listMyBookings } = await import("./bookings");

const now = new Date("2026-11-09T03:00:00Z");
const start = new Date("2026-11-11T14:00:00Z");
const key = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const input = (n = 1, startAt = start) => ({ trainerId: "t1", startAt, idempotencyKey: key(n) });

beforeEach(() => {
  state.rows = [];
  state.seq = 0;
  mocks.enqueue.mockClear();
  state.client = "k1";
  state.windowFree = true;
  state.trainer = { id: "t1", name: "Арман", hallId: "general" };
});

describe("создание Записи", () => {
  it("создаёт Запись на длительность тренировки, в Зале Тренера, под блокировкой Клиента", async () => {
    const r = await createBooking(input(), now);
    expect(r).toMatchObject({ ok: true, repeated: false, booking: { trainerId: "t1", hallId: "general", startAt: start, endAt: new Date("2026-11-11T15:00:00Z") } });
    expect(state.rows[0]).toMatchObject({ clientId: "k1", activeTrainerId: "t1", status: "ACTIVE" });
    expect(mocks.lockClient).toHaveBeenCalledWith(expect.anything(), "k1");
  });

  it("повтор с тем же ключом возвращает ту же Запись", async () => {
    const a = await createBooking(input(), now);
    state.windowFree = false; // Окно уже занято самой этой Записью
    const b = await createBooking(input(), now);
    expect(b).toMatchObject({ ok: true, repeated: true });
    expect(a.ok && b.ok && a.booking.id === b.booking.id).toBe(true);
    expect(state.rows).toHaveLength(1);
  });

  it("чужой ключ повтора не отдаёт чужую Запись", async () => {
    await createBooking(input(), now);
    state.client = "k2";
    expect(await createBooking({ ...input(), startAt: new Date("2026-11-12T14:00:00Z") }, now)).toEqual({ ok: false, error: "badRequest" });
  });

  it("скрытый или удалённый Тренер — noTrainer; занятое Окно — taken", async () => {
    state.trainer = null;
    expect(await createBooking(input(), now)).toEqual({ ok: false, error: "noTrainer" });
    state.trainer = { id: "t1", name: "Арман", hallId: "general" };
    state.windowFree = false;
    expect(await createBooking(input(), now)).toEqual({ ok: false, error: "taken" });
  });

  it("гонка: проверка пропустила, а индекс базы отказал — taken, а не ошибка", async () => {
    await createBooking(input(1), now);
    state.client = "k2";
    expect(await createBooking(input(2), now)).toEqual({ ok: false, error: "taken" });
  });

  it("не больше 3 будущих Записей; отменённые и прошедшие не считаются", async () => {
    for (let i = 0; i < 3; i++) expect((await createBooking(input(i + 1, new Date(start.getTime() + i * 3_600_000)), now)).ok).toBe(true);
    expect(await createBooking(input(9, new Date(start.getTime() + 5 * 3_600_000)), now)).toEqual({ ok: false, error: "limit" });
    state.rows[0].status = "CANCELLED";
    expect((await createBooking(input(10, new Date(start.getTime() + 5 * 3_600_000)), now)).ok).toBe(true);
  });
});

describe("отмена", () => {
  it("Клиент отменяет свою Запись заранее — Окно освобождается", async () => {
    await createBooking(input(), now);
    expect(await cancelMyBooking("b1", now)).toEqual({ ok: true });
    expect(state.rows[0]).toMatchObject({ status: "CANCELLED", activeTrainerId: null, cancelledBy: "client" });
    expect(await cancelMyBooking("b1", now)).toEqual({ ok: false, error: "notFound" });
  });

  it("позже чем за 12 часов — только через зал; чужую — notFound", async () => {
    await createBooking(input(), now);
    expect(await cancelMyBooking("b1", new Date(start.getTime() - 11 * 3_600_000))).toEqual({ ok: false, error: "tooLate" });
    state.client = "k2";
    expect(await cancelMyBooking("b1", now)).toEqual({ ok: false, error: "notFound" });
  });

  it("Владелец отменяет любую действующую — в любое время, с проверкой сессии", async () => {
    await createBooking(input(), now);
    expect(await cancelBookingByOwner("b1", new Date(start.getTime() - 60_000))).toBe(true);
    expect(mocks.requireOwner).toHaveBeenCalled();
    expect(state.rows[0].cancelledBy).toBe("owner");
    expect(await cancelBookingByOwner("b1")).toBe(false);
  });
});

describe("Мои Записи", () => {
  it("будущие — ближайшими первыми, потом прошедшие и отменённые; у каждой — можно ли отменить", async () => {
    await createBooking(input(1, new Date("2026-11-12T14:00:00Z")), now);
    await createBooking(input(2, new Date("2026-11-09T12:00:00Z")), now);
    state.rows.push({ ...state.rows[0], id: "old", idempotencyKey: null, startAt: new Date("2026-11-01T10:00:00Z"), endAt: new Date("2026-11-01T11:00:00Z") });
    const list = await listMyBookings(now);
    expect(list.map((b) => [b.id, b.view, b.canCancel])).toEqual([
      ["b2", "upcoming", false],
      ["b1", "upcoming", true],
      ["old", "past", false],
    ]);
  });
});

describe("уведомления Владельцу (outbox)", () => {
  it("новая Запись пишет событие в той же транзакции, с именами и временем", async () => {
    await createBooking(input(), now);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ booking: expect.anything() }),
      expect.objectContaining({ type: "booking.created", clientName: "К", trainerName: "Арман", hallName: "Общий зал", startAt: start.toISOString() }),
      now,
    );
  });

  it("повтор формы и отказ по лимиту события не пишут", async () => {
    await createBooking(input(), now);
    await createBooking(input(), now);
    for (let i = 2; i <= 4; i++) await createBooking(input(i, new Date(start.getTime() + i * 3_600_000)), now);
    // 1 + 2 успешных (лимит 3), повтор и четвёртая — без события
    expect(mocks.enqueue).toHaveBeenCalledTimes(3);
  });

  it("отмена Клиентом пишет событие отмены; неудачная отмена — нет", async () => {
    await createBooking(input(), now);
    mocks.enqueue.mockClear();
    await cancelMyBooking("b1", now);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "booking.cancelled", trainerName: "Арман" }), now);
    await cancelMyBooking("b1", now);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
  });
});
