import { beforeEach, describe, expect, it, vi } from "vitest";

// Сервис Обращений проверяем без базы: Prisma и проверка сессии подменены.
const { rows, db, requireOwner } = vi.hoisted(() => {
  const rows: { channel: string; source: string; locale: string; createdAt: Date }[] = [];
  const db = {
    contactClick: {
      create: vi.fn(async ({ data }: { data: { channel: string; source: string; locale: string } }) => {
        rows.push({ ...data, createdAt: new Date() });
      }),
      findMany: vi.fn(async ({ where }: { where: { createdAt: { gte: Date } } }) => rows.filter((r) => r.createdAt >= where.createdAt.gte)),
    },
  };
  return { rows, db, requireOwner: vi.fn(async () => {}) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/admin/guard", () => ({ requireOwner }));

import { getContactStats, recordContact } from "@/lib/services/contacts";
import { CONTACT_CHANNEL_LABEL_RU, CONTACT_SOURCE_LABEL_RU } from "@/lib/presentation/contact-labels";
import {
  CONTACT_CHANNELS,
  CONTACT_RATE,
  CONTACT_SOURCES,
  acceptContact,
  channelOfHref,
  createRateLimiter,
  gymDay,
  parseContact,
  statsSince,
  summarizeContacts,
} from "./contact";

const ok = { channel: "whatsapp", source: "hero", locale: "ru" };

beforeEach(() => {
  vi.clearAllMocks();
  requireOwner.mockImplementation(async () => {});
  rows.length = 0;
});

describe("Обращение: что принимаем", () => {
  it("канал, источник и язык из списков", () => {
    expect(parseContact(ok)).toEqual(ok);
    expect(parseContact({ channel: "phone", source: "mobile-bar", locale: "kk" })).toEqual({ channel: "phone", source: "mobile-bar", locale: "kk" });
    expect(parseContact({ channel: "instagram", source: "women", locale: "ru" })).not.toBeNull();
  });

  it("каналы — WhatsApp, телефон, Instagram; источники — все места с кнопками связи", () => {
    expect([...CONTACT_CHANNELS]).toEqual(["whatsapp", "phone", "instagram"]);
    for (const s of ["hero", "prices", "trainer", "women", "reviews", "contacts", "mobile-bar", "header"]) expect(CONTACT_SOURCES).toContain(s);
    for (const c of CONTACT_CHANNELS) expect(CONTACT_CHANNEL_LABEL_RU[c]).toBeTruthy();
    for (const s of CONTACT_SOURCES) expect(CONTACT_SOURCE_LABEL_RU[s]).toBeTruthy();
  });

  it.each([
    ["неизвестный канал", { ...ok, channel: "telegram" }],
    ["неизвестный источник", { ...ok, source: "popup" }],
    ["неизвестный язык", { ...ok, locale: "en" }],
    ["канал не строкой", { ...ok, channel: ["whatsapp"] }],
    ["источник — разметка", { ...ok, source: "<script>alert(1)</script>" }],
    ["нет полей", {}],
    ["не объект", "whatsapp"],
    ["null", null],
    ["массив", [ok]],
  ])("%s — отбрасываем", (_name, body) => {
    expect(parseContact(body)).toBeNull();
  });

  it("лишние поля в запись не попадают: ни IP, ни адрес страницы, ни что-либо о Посетителе", () => {
    const parsed = parseContact({ ...ok, ip: "1.2.3.4", userAgent: "x", phone: "+77001112233", referrer: "https://x", createdAt: "2020-01-01" });
    expect(parsed).toEqual(ok);
    expect(Object.keys(parsed ?? {}).sort()).toEqual(["channel", "locale", "source"]);
  });

  it("канал определяется по адресу ссылки", () => {
    expect(channelOfHref("https://wa.me/77714846344?text=hi")).toBe("whatsapp");
    expect(channelOfHref("tel:+77714846344")).toBe("phone");
    expect(channelOfHref("https://instagram.com/athletics_gym_qyzylorda")).toBe("instagram");
    expect(channelOfHref("https://www.instagram.com/p/x/")).toBe("instagram");
    for (const other of ["#prices", "/kk", "https://2gis.kz/kyzylorda/firm/1", "https://evil.example/wa.me/", "mailto:a@b.c", ""]) {
      expect(channelOfHref(other), other).toBeNull();
    }
  });
});

describe("лимит с одного адреса", () => {
  it("20 нажатий в минуту — можно, 21-е — нет; другой адрес не страдает", () => {
    expect(CONTACT_RATE).toEqual({ max: 20, windowMs: 60_000 });
    const limiter = createRateLimiter(CONTACT_RATE);
    for (let i = 0; i < 20; i++) expect(limiter.allow("a", 1000 + i)).toBe(true);
    expect(limiter.allow("a", 1100)).toBe(false);
    expect(limiter.allow("b", 1100)).toBe(true);
  });

  it("через минуту лимит снова свободен", () => {
    const limiter = createRateLimiter(CONTACT_RATE);
    for (let i = 0; i < 20; i++) limiter.allow("a", 0);
    expect(limiter.allow("a", 59_999)).toBe(false);
    expect(limiter.allow("a", 60_000)).toBe(true);
  });

  it("отклонённые запросы лимит не продлевают", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
    limiter.allow("a", 0);
    limiter.allow("a", 0);
    for (let t = 100; t < 1000; t += 100) expect(limiter.allow("a", t)).toBe(false);
    expect(limiter.allow("a", 1000)).toBe(true);
  });
});

describe("приём Обращения", () => {
  const deps = (over: Partial<Parameters<typeof acceptContact>[1]> = {}) => ({
    ipHash: "hash-1",
    now: 1_000,
    limiter: createRateLimiter(CONTACT_RATE),
    isOwner: vi.fn(async () => false),
    save: vi.fn(async () => {}),
    ...over,
  });

  it("правильное нажатие Посетителя записывается", async () => {
    const d = deps();
    expect(await acceptContact(ok, d)).toBe("saved");
    expect(d.save).toHaveBeenCalledWith(ok);
  });

  it("мусор не записывается и до лимита, сессии и базы не доходит", async () => {
    const d = deps({ limiter: { allow: vi.fn(() => true) } });
    expect(await acceptContact({ ...ok, channel: "telegram" }, d)).toBe("invalid");
    expect(await acceptContact(null, d)).toBe("invalid");
    expect(d.limiter.allow).not.toHaveBeenCalled();
    expect(d.isOwner).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
  });

  it("сверх лимита с адреса — не записывается, в базу не ходим", async () => {
    const d = deps();
    for (let i = 0; i < 20; i++) expect(await acceptContact(ok, d)).toBe("saved");
    expect(await acceptContact(ok, d)).toBe("limited");
    expect(d.save).toHaveBeenCalledTimes(20);
    expect(d.isOwner).toHaveBeenCalledTimes(20);
  });

  it("нажатие Владельца с активной сессией админки не считается", async () => {
    const d = deps({ isOwner: vi.fn(async () => true) });
    expect(await acceptContact(ok, d)).toBe("owner");
    expect(d.save).not.toHaveBeenCalled();
  });

  it("в базу уходит только канал, источник и язык — хэш адреса не сохраняется", async () => {
    await acceptContact({ ...ok, ip: "1.2.3.4" }, deps({ ipHash: "secret-hash", save: recordContact }));
    expect(rows).toHaveLength(1);
    expect(Object.keys(db.contactClick.create.mock.calls[0][0].data).sort()).toEqual(["channel", "locale", "source"]);
    expect(JSON.stringify(rows)).not.toContain("secret-hash");
    expect(JSON.stringify(rows)).not.toContain("1.2.3.4");
  });
});

describe("подсчёт за периоды", () => {
  // 10 октября 2026, 15:00 в Кызылорде (UTC+5)
  const NOW = new Date("2026-10-10T10:00:00Z");
  const at = (iso: string, channel = "whatsapp", source = "hero") => ({ channel, source, createdAt: new Date(iso) });

  it("сутки считаются по времени зала, а не по UTC", () => {
    expect(gymDay(new Date("2026-10-09T18:59:59Z"))).toBe("2026-10-09");
    expect(gymDay(new Date("2026-10-09T19:00:00Z"))).toBe("2026-10-10");
    expect(statsSince(NOW)).toEqual(new Date("2026-09-10T19:00:00.000Z"));
  });

  it("сегодня, 7 дней и 30 дней — каждый период включает сегодня", () => {
    const stats = summarizeContacts(
      [
        at("2026-10-10T09:00:00Z"), // сегодня
        at("2026-10-09T19:00:00Z"), // сегодня: в Кызылорде уже 10-е, 00:00
        at("2026-10-09T18:59:00Z"), // вчера, 23:59
        at("2026-10-04T12:00:00Z"), // 6 дней назад — входит в 7 дней
        at("2026-10-03T12:00:00Z"), // 7 дней назад — уже не входит
        at("2026-09-11T12:00:00Z"), // 29 дней назад — входит в 30 дней
        at("2026-09-10T12:00:00Z"), // 30 дней назад — не входит
        at("2026-08-01T12:00:00Z"), // давно
      ],
      NOW,
    );
    expect([stats.today, stats.week, stats.month]).toEqual([2, 4, 6]);
  });

  it("ряд по дням: ровно 30 дней подряд, последний — сегодня, пустые дни — с нулём", () => {
    const stats = summarizeContacts([at("2026-10-10T09:00:00Z"), at("2026-10-08T09:00:00Z"), at("2026-10-08T10:00:00Z")], NOW);
    expect(stats.days).toHaveLength(30);
    expect(stats.days[0].day).toBe("2026-09-11");
    expect(stats.days.at(-1)).toEqual({ day: "2026-10-10", count: 1 });
    expect(stats.days.at(-3)).toEqual({ day: "2026-10-08", count: 2 });
    expect(stats.days.at(-2)).toEqual({ day: "2026-10-09", count: 0 });
    expect(stats.days.reduce((n, d) => n + d.count, 0)).toBe(stats.month);
  });

  it("разбивка по каналам (все три, даже с нулём) и по источникам (по убыванию) — за 30 дней", () => {
    const stats = summarizeContacts(
      [
        at("2026-10-10T09:00:00Z", "whatsapp", "hero"),
        at("2026-10-09T09:00:00Z", "whatsapp", "mobile-bar"),
        at("2026-10-08T09:00:00Z", "whatsapp", "mobile-bar"),
        at("2026-10-07T09:00:00Z", "phone", "contacts"),
        at("2026-08-01T09:00:00Z", "instagram", "women"), // старше 30 дней — не в разбивке
      ],
      NOW,
    );
    expect(stats.byChannel).toEqual([
      { channel: "whatsapp", count: 3 },
      { channel: "phone", count: 1 },
      { channel: "instagram", count: 0 },
    ]);
    expect(stats.bySource).toEqual([
      { source: "mobile-bar", count: 2 },
      { source: "contacts", count: 1 },
      { source: "hero", count: 1 },
    ]);
    expect(stats.byChannel.reduce((n, c) => n + c.count, 0)).toBe(stats.month);
  });

  it("Обращений нет — нули, а не ошибка; записи из будущего не считаются", () => {
    const empty = summarizeContacts([], NOW);
    expect([empty.today, empty.week, empty.month, empty.bySource.length]).toEqual([0, 0, 0, 0]);
    expect(summarizeContacts([at("2026-10-10T18:00:00Z")], NOW).today).toBe(0);
  });

  it("сводка в админке: только с сессией Владельца; из базы берутся записи за 30 дней", async () => {
    rows.push({ ...at("2026-10-10T09:00:00Z"), locale: "ru" }, { ...at("2026-08-01T09:00:00Z"), locale: "ru" });
    const stats = await getContactStats(NOW);
    expect([stats.today, stats.month]).toEqual([1, 1]);
    expect(db.contactClick.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdAt: { gte: statsSince(NOW) } } }));

    vi.clearAllMocks();
    const NO_SESSION = new Error("NEXT_REDIRECT;/admin/login");
    requireOwner.mockRejectedValue(NO_SESSION);
    await expect(getContactStats(NOW)).rejects.toBe(NO_SESSION);
    expect(db.contactClick.findMany).not.toHaveBeenCalled();
  });
});
