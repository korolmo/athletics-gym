import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
const { isClubModel, scopeArgs } = await import("./tenant-db");

const A = "club";

describe("dbFor: какие таблицы — Клуба", () => {
  it("19 таблиц Клуба; Club и LoginAttempt — нет", () => {
    for (const m of ["Hall", "Tariff", "Trainer", "Owner", "SiteSettings", "AboutCard", "GalleryPhoto", "Review", "ReviewSubmission",
      "ContactClick", "Direction", "Client", "ClientLoginCode", "TrainerSchedule", "TrainerWorkHours", "TrainerTimeOff", "Booking",
      "OutboxEvent", "DemoState"]) {
      expect(isClubModel(m), m).toBe(true);
    }
    expect(isClubModel("Club")).toBe(false);
    expect(isClubModel("LoginAttempt")).toBe(false);
  });
});

describe("dbFor: условие по Клубу", () => {
  it.each(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
    "update", "updateMany", "delete", "deleteMany"])("%s — clubId в условии", (op) => {
    expect(scopeArgs("Trainer", op, { where: { id: "t1" }, data: { name: "x" } }, A)).toEqual({ where: { id: "t1", clubId: A }, data: { name: "x" } });
  });

  it("без условия — только строки Клуба", () => {
    expect(scopeArgs("Hall", "findMany", undefined, A)).toEqual({ where: { clubId: A } });
    expect(scopeArgs("Hall", "count", {}, A)).toEqual({ where: { clubId: A } });
  });

  it("составной ключ (clubId, position) остаётся, Клуб добавляется рядом", () => {
    expect(scopeArgs("AboutCard", "findUnique", { where: { clubId_position: { clubId: A, position: 1 } } }, A)).toEqual({
      where: { clubId_position: { clubId: A, position: 1 }, clubId: A },
    });
  });

  it("условие по чужому Клубу — ошибка, а не тихая подмена", () => {
    expect(() => scopeArgs("Hall", "findMany", { where: { clubId: "iron" } }, A)).toThrow(/чужому Клубу/);
  });

  it("Club и LoginAttempt не трогаются", () => {
    expect(scopeArgs("Club", "findUnique", { where: { id: "club" } }, A)).toEqual({ where: { id: "club" } });
    expect(scopeArgs("LoginAttempt", "deleteMany", { where: { key: "k" } }, A)).toEqual({ where: { key: "k" } });
  });
});

describe("dbFor: новые строки — в Клубе", () => {
  it("create со скалярами — clubId", () => {
    expect(scopeArgs("Hall", "create", { data: { id: "h", nameRu: "Зал" } }, A)).toEqual({ data: { id: "h", nameRu: "Зал", clubId: A } });
  });

  it("create со связью — Клуб тоже связью (Prisma не смешивает скаляр clubId и connect)", () => {
    expect(scopeArgs("Tariff", "create", { data: { name: "x", hall: { connect: { id: "general" } } } }, A)).toEqual({
      data: { name: "x", hall: { connect: { id: "general" } }, club: { connect: { id: A } } },
    });
  });

  it("createMany — каждой строке", () => {
    expect(scopeArgs("TrainerWorkHours", "createMany", { data: [{ trainerId: "t" }, { trainerId: "u" }] }, A)).toEqual({
      data: [{ trainerId: "t", clubId: A }, { trainerId: "u", clubId: A }],
    });
  });

  it("upsert — условие по Клубу и Клуб в create; update не меняется", () => {
    expect(scopeArgs("DemoState", "upsert", { where: { clubId: A }, create: { snapshot: "s" }, update: { snapshot: "t" } }, A)).toEqual({
      where: { clubId: A },
      create: { snapshot: "s", clubId: A },
      update: { snapshot: "t" },
    });
  });

  it("строка чужого Клуба — ошибка", () => {
    expect(() => scopeArgs("Hall", "create", { data: { id: "h", clubId: "iron" } }, A)).toThrow(/чужого Клуба/);
    expect(() => scopeArgs("Hall", "create", { data: { id: "h", club: { connect: { id: "iron" } } } }, A)).toThrow(/чужого Клуба/);
  });

  it("свой clubId в данных не дублируется", () => {
    expect(scopeArgs("Hall", "create", { data: { id: "h", clubId: A } }, A)).toEqual({ data: { id: "h", clubId: A } });
  });

  it("неизвестная операция — ошибка, а не запрос без Клуба", () => {
    expect(() => scopeArgs("Hall", "findRaw", {}, A)).toThrow(/не поддержана/);
  });
});

/** Сырой SQL мимо dbFor (решение 20): только эти файлы, у каждого — почему он безопасен. */
const RAW_SQL_ALLOWED: Record<string, string> = {
  "src/lib/services/health.ts": "SELECT 1, версия базы и последняя миграция — данных Клуба нет",
  "src/modules/clients/service/for-modules.ts": "блокировка строки Клиента FOR UPDATE по id, внутри транзакции после проверки сессии Клиента",
};

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p.split(path.sep).join("/")] : [];
  });
}

describe("сырой SQL — только из списка исключений", () => {
  it("$queryRaw / $executeRaw вне списка нет", () => {
    const found = sources("src").filter((f) => /\$(queryRaw|executeRaw)/.test(fs.readFileSync(f, "utf8")));
    expect(found.filter((f) => !(f in RAW_SQL_ALLOWED))).toEqual([]);
    // список не держит файлов, где сырого SQL уже нет
    expect(Object.keys(RAW_SQL_ALLOWED).filter((f) => !found.includes(f))).toEqual([]);
  });
});
