import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Сервис Направлений проверяем без базы и сети: Prisma, хранилище и проверка сессии подменены.

type Row = {
  id: string;
  titleRu: string;
  titleKk: string | null;
  descriptionRu: string | null;
  descriptionKk: string | null;
  icon: string;
  photo: string | null;
  isVisible: boolean;
  sortOrder: number;
  createdAt: Date;
};

const { state, db, storage, requireOwner } = vi.hoisted(() => {
  const state = { rows: [] as Row[], files: new Set<string>(), clock: 0 };
  const sorted = () => [...state.rows].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  const db = {
    direction: {
      findMany: vi.fn(async (args?: { where?: { isVisible?: boolean } }) =>
        sorted().filter((r) => args?.where?.isVisible === undefined || r.isVisible === args.where.isVisible).map((r) => ({ ...r })),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.rows.find((r) => r.id === where.id) ?? null),
      aggregate: vi.fn(async () => ({ _max: { sortOrder: state.rows.length ? Math.max(...state.rows.map((r) => r.sortOrder)) : null } })),
      create: vi.fn(async ({ data }: { data: Omit<Row, "id" | "createdAt" | "photo"> }) => {
        const row = { id: `d${state.rows.length + 1}`, photo: null, createdAt: new Date(1_800_000_000_000 + state.clock++), ...data } as Row;
        state.rows.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = state.rows.find((r) => r.id === where.id);
        if (!row) throw Object.assign(new Error("not found"), { code: "P2025" });
        Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        state.rows.filter((r) => r.id === where.id).forEach((r) => Object.assign(r, data));
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.rows = state.rows.filter((r) => r.id !== where.id);
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const storage = {
    mediaUrl: vi.fn((path: string | null | undefined) => (path ? `https://storage.test/${path}` : null)),
    removeObjects: vi.fn(async (paths: string[]) => paths.forEach((p) => state.files.delete(p))),
  };
  return { state, db, storage, requireOwner: vi.fn(async () => {}) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/storage/client", () => storage);
vi.mock("@/lib/admin/guard", () => ({ requireOwner }));

import { DIRECTION_ICONS, DIRECTION_LIMITS, toDirectionViews } from "@/lib/domain/direction";
import { DEFAULT_DIRECTIONS } from "@/lib/domain/direction.defaults";
import { parsePhotoTarget, pathMatchesKind } from "@/lib/domain/photo";
import { DIRECTION_ICON_LABEL_RU } from "@/lib/presentation/direction-labels";
import { parseDirectionForm } from "@/lib/validation/direction";
import * as directions from "./directions";

const input = { id: null, titleRu: "Бег", titleKk: null, descriptionRu: null, descriptionKk: null, icon: "run" as const, isVisible: true };
const PHOTO = "direction/3f2b8c1e-9a4d-4e7b-8c21-0a1b2c3d4e5f.webp";
const media = (path: string | null) => (path ? `https://storage.test/${path}` : null);
const add = async (titleRu: string, over: Partial<typeof input> = {}) => {
  const r = await directions.saveDirection({ ...input, titleRu, ...over });
  if (!r.ok) throw new Error(r.error);
  return r.id;
};

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}
const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

beforeEach(() => {
  vi.clearAllMocks();
  requireOwner.mockImplementation(async () => {});
  state.rows = [];
  state.files = new Set();
  state.clock = 0;
});

describe("Направление из формы", () => {
  const ok = { id: "", titleRu: " Набор массы ", titleKk: "", descriptionRu: "", descriptionKk: "", icon: "exercise", isVisible: "on" };

  it("название на русском обязательно; KZ и описание необязательны: пусто → null", () => {
    expect(parseDirectionForm(form(ok))).toEqual({
      ok: true,
      data: { id: null, titleRu: "Набор массы", titleKk: null, descriptionRu: null, descriptionKk: null, icon: "exercise", isVisible: true },
    });
    expect(error(parseDirectionForm(form({ ...ok, titleRu: "   " })))).toBe("Заполните название на русском");
  });

  it("длина: название до 60, описание до 200 — на обоих языках", () => {
    expect(DIRECTION_LIMITS).toEqual({ title: 60, description: 200 });
    expect(parseDirectionForm(form({ ...ok, titleRu: "я".repeat(60), descriptionRu: "я".repeat(200), descriptionKk: "я".repeat(200) })).ok).toBe(true);
    expect(error(parseDirectionForm(form({ ...ok, titleRu: "я".repeat(61) })))).toMatch(/Название — не длиннее 60/);
    expect(error(parseDirectionForm(form({ ...ok, titleKk: "я".repeat(61) })))).toMatch(/Название \(KZ\)/);
    expect(error(parseDirectionForm(form({ ...ok, descriptionRu: "я".repeat(201) })))).toMatch(/Описание — не длиннее 200/);
    expect(error(parseDirectionForm(form({ ...ok, descriptionKk: "я".repeat(201) })))).toMatch(/Описание \(KZ\)/);
  });

  it("иконка — только из набора; галочка снята — Направление скрыто", () => {
    expect(error(parseDirectionForm(form({ ...ok, icon: "rocket" })))).toBe("Выберите иконку из набора");
    expect(error(parseDirectionForm(form({ ...ok, icon: "" })))).toBe("Выберите иконку из набора");
    const hidden = Object.fromEntries(Object.entries(ok).filter(([k]) => k !== "isVisible"));
    expect(parseDirectionForm(form(hidden))).toMatchObject({ ok: true, data: { isVisible: false } });
  });

  it("путь к фото через форму не задаётся", () => {
    const r = parseDirectionForm(form({ ...ok, photo: "direction/x.webp", sortOrder: "99" }));
    expect(r.ok && Object.keys(r.data).sort()).toEqual(["descriptionKk", "descriptionRu", "icon", "id", "isVisible", "titleKk", "titleRu"]);
  });
});

describe("набор иконок", () => {
  it("прежние пять и новые спортивные — у каждой есть подпись (рисунок для каждого ключа требует компилятор)", () => {
    for (const key of ["exercise", "weight", "accessibility", "barbell", "boxing", "run", "stretch", "rehab", "nutrition"]) expect(DIRECTION_ICONS).toContain(key);
    expect(DIRECTION_ICONS.length).toBeGreaterThanOrEqual(11);
    for (const key of DIRECTION_ICONS) expect(DIRECTION_ICON_LABEL_RU[key], key).toBeTruthy();
    expect(new Set(DIRECTION_ICONS.map((k) => DIRECTION_ICON_LABEL_RU[k])).size).toBe(DIRECTION_ICONS.length);
  });
});

describe("на сайте — только не скрытые и в заданном порядке", () => {
  it("скрытое Направление на сайт не попадает; порядок — как задал Владелец", async () => {
    await add("Первое");
    const second = await add("Второе");
    await add("Третье");
    await directions.toggleDirection(second);

    const rows = await directions.listVisibleDirections();
    expect(db.direction.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { isVisible: true } }));
    expect(toDirectionViews("ru", rows, media).map((d) => d.title)).toEqual(["Первое", "Третье"]);

    await directions.toggleDirection(second);
    expect(toDirectionViews("ru", await directions.listVisibleDirections(), media).map((d) => d.title)).toEqual(["Первое", "Второе", "Третье"]);
  });

  it("кнопки «выше» и «ниже» меняют порядок на сайте; крайние двигать некуда", async () => {
    const a = await add("А");
    await add("Б");
    const c = await add("В");
    const order = async () => toDirectionViews("ru", await directions.listVisibleDirections(), media).map((d) => d.title);

    await directions.moveDirection(c, "up");
    expect(await order()).toEqual(["А", "В", "Б"]);
    await directions.moveDirection(a, "down");
    expect(await order()).toEqual(["В", "А", "Б"]);
    await directions.moveDirection(c, "up");
    await directions.moveDirection("ghost", "down");
    expect(await order()).toEqual(["В", "А", "Б"]);
    expect(state.rows.map((r) => r.sortOrder).sort()).toEqual([0, 1, 2]);
  });

  it("само отображение тоже отсекает скрытые и сортирует — даже если строки пришли вперемешку", () => {
    const row = (id: string, sortOrder: number, isVisible = true) => ({ id, titleRu: id, titleKk: null, descriptionRu: null, descriptionKk: null, icon: "run", photo: null, isVisible, sortOrder });
    expect(toDirectionViews("ru", [row("c", 2), row("hidden", 1, false), row("a", 0)], media).map((d) => d.id)).toEqual(["a", "c"]);
  });

  it("язык: KZ есть — показываем его, пусто — русский; описание из пробелов описанием не считается", () => {
    const rows = [{ id: "1", titleRu: "Бег", titleKk: "Жүгіру", descriptionRu: "Кардио", descriptionKk: null, icon: "run", photo: null, isVisible: true, sortOrder: 0 },
      { id: "2", titleRu: "Бокс", titleKk: null, descriptionRu: "   ", descriptionKk: "x", icon: "boxing", photo: null, isVisible: true, sortOrder: 1 }];
    expect(toDirectionViews("kk", rows, media)).toMatchObject([{ title: "Жүгіру", description: "Кардио" }, { title: "Бокс", description: null }]);
  });

  it("своё Фото — ссылкой; нет Фото — иконка; неизвестная иконка не ломает карточку", () => {
    const rows = [{ id: "1", titleRu: "Бег", titleKk: null, descriptionRu: null, descriptionKk: null, icon: "rocket", photo: PHOTO, isVisible: true, sortOrder: 0 }];
    expect(toDirectionViews("ru", rows, media)[0]).toMatchObject({ icon: DIRECTION_ICONS[0], photoUrl: `https://storage.test/${PHOTO}` });
    expect(toDirectionViews("ru", [{ ...rows[0], photo: null }], media)[0].photoUrl).toBeNull();
  });

  it("Направлений нет или все скрыты — показывать нечего (блок на сайте не выводится)", async () => {
    expect(toDirectionViews("ru", await directions.listVisibleDirections(), media)).toEqual([]);
    const id = await add("Одно");
    await directions.toggleDirection(id);
    expect(toDirectionViews("ru", await directions.listVisibleDirections(), media)).toEqual([]);
  });
});

describe("админка", () => {
  it("новое Направление встаёт в конец; правка меняет поля, но не порядок и не Фото", async () => {
    await add("Первое");
    const id = await add("Второе");
    state.rows[1].photo = PHOTO;
    expect(await directions.saveDirection({ ...input, id, titleRu: "Второе, новое", descriptionRu: "Описание", icon: "cardio" })).toEqual({ ok: true, id });
    expect(state.rows[1]).toMatchObject({ titleRu: "Второе, новое", descriptionRu: "Описание", icon: "cardio", sortOrder: 1, photo: PHOTO });
  });

  it("правка удалённого Направления — понятная ошибка", async () => {
    const r = await directions.saveDirection({ ...input, id: "ghost" });
    expect(error(r)).toMatch(/не найдена/);
  });

  it("в списке админки — все, включая скрытые, со ссылкой на Фото", async () => {
    const id = await add("Скрытое", { isVisible: false });
    state.rows[0].photo = PHOTO;
    expect(await directions.listDirections()).toMatchObject([{ id, isVisible: false, photoUrl: `https://storage.test/${PHOTO}` }]);
  });
});

describe("удаление Фото вместе с файлом", () => {
  it("удалили Направление — его Фото удалено из хранилища", async () => {
    const id = await add("С фото");
    state.rows[0].photo = PHOTO;
    state.files.add(PHOTO);
    state.files.add("gallery/other.webp");

    await directions.deleteDirection(id);

    expect(state.rows).toEqual([]);
    expect(storage.removeObjects).toHaveBeenCalledWith([PHOTO]);
    expect([...state.files]).toEqual(["gallery/other.webp"]);
  });

  it("у Направления без Фото в хранилище ничего не трогаем", async () => {
    await directions.deleteDirection(await add("Без фото"));
    expect(storage.removeObjects).not.toHaveBeenCalled();
  });

  it("хранилище не ответило — Направление всё равно удалено (файл подберёт уборка)", async () => {
    const id = await add("С фото");
    state.rows[0].photo = PHOTO;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.removeObjects.mockRejectedValueOnce(new Error("storage down"));
    await expect(directions.deleteDirection(id)).resolves.toBeUndefined();
    expect(state.rows).toEqual([]);
    log.mockRestore();
  });

  it("Фото Направления загружается общим механизмом: место «direction:<id>», папка direction/", () => {
    expect(parsePhotoTarget("direction:dir_mass")).toEqual({ kind: "direction", id: "dir_mass" });
    expect(parsePhotoTarget("direction:cmabc123")).toEqual({ kind: "direction", id: "cmabc123" });
    expect(parsePhotoTarget("direction")).toBeNull();
    expect(parsePhotoTarget("direction:../x")).toBeNull();
    expect(pathMatchesKind(PHOTO, "direction")).toBe(true);
    expect(pathMatchesKind(PHOTO, "gallery")).toBe(false);
  });
});

describe("права: без сессии Владельца — отказ", () => {
  const NO_SESSION = new Error("NEXT_REDIRECT;/admin/login");
  const owner: [string, () => Promise<unknown>][] = [
    ["listDirections", () => directions.listDirections()],
    ["getDirection", () => directions.getDirection("d1")],
    ["saveDirection (новое)", () => directions.saveDirection(input)],
    ["saveDirection (правка)", () => directions.saveDirection({ ...input, id: "d1", titleRu: "подмена" })],
    ["toggleDirection", () => directions.toggleDirection("d1")],
    ["moveDirection", () => directions.moveDirection("d1", "down")],
    ["deleteDirection", () => directions.deleteDirection("d1")],
  ];

  it("каждая функция сервиса либо требует сессию, либо это чтение для сайта", () => {
    const exported = Object.entries(directions).filter(([, v]) => typeof v === "function").map(([k]) => k);
    const covered = new Set([...owner.map(([name]) => name.split(" ")[0]), "listVisibleDirections"]);
    expect([...covered].sort()).toEqual(exported.sort());
  });

  it.each(owner)("%s: отказ, база и хранилище не тронуты", async (_name, call) => {
    await add("Первое");
    await add("Второе");
    state.rows[0].photo = PHOTO;
    state.files.add(PHOTO);
    const before = JSON.stringify(state.rows);
    vi.clearAllMocks();
    requireOwner.mockRejectedValue(NO_SESSION);

    await expect(call()).rejects.toBe(NO_SESSION);

    expect(JSON.stringify(state.rows)).toBe(before);
    expect(state.files.has(PHOTO)).toBe(true);
    for (const fn of Object.values(db.direction)) expect(fn).not.toHaveBeenCalled();
    expect(storage.removeObjects).not.toHaveBeenCalled();
  });

  it("чтение для сайта сессию не спрашивает и отдаёт только не скрытые", async () => {
    await add("Видимое");
    await add("Скрытое", { isVisible: false });
    vi.clearAllMocks();
    requireOwner.mockRejectedValue(NO_SESSION);
    expect((await directions.listVisibleDirections()).map((r) => r.titleRu)).toEqual(["Видимое"]);
    expect(requireOwner).not.toHaveBeenCalled();
  });
});

describe("перенос текущих Направлений миграцией", () => {
  const sql = fs.readFileSync("prisma/migrations/20261010020000_directions/migration.sql", "utf8");

  it("те же пять Направлений, в том же порядке и с теми же иконками, что были в коде", () => {
    expect(DEFAULT_DIRECTIONS.map((d) => d.titleRu)).toEqual(["Набор массы", "Снижение веса", "Коррекция фигуры", "Пауэрлифтинг", "Бокс"]);
    expect(DEFAULT_DIRECTIONS.map((d) => d.icon)).toEqual(["exercise", "weight", "accessibility", "barbell", "boxing"]);
    DEFAULT_DIRECTIONS.forEach((d, i) => {
      expect(sql).toContain(`('${d.id}', '${d.titleRu}', '${d.titleKk}', '${d.icon}', ${i})`);
    });
  });

  it("миграция только добавляет и не затирает то, что уже есть", () => {
    expect(sql).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(sql).not.toMatch(/DROP |DELETE |UPDATE |ALTER TABLE/);
  });

  it("после переноса сайт показывает их без описаний и без Фото — как раньше", () => {
    const rows = DEFAULT_DIRECTIONS.map((d, i) => ({ ...d, descriptionRu: null, descriptionKk: null, photo: null, isVisible: true, sortOrder: i }));
    expect(toDirectionViews("ru", rows, media).map((d) => [d.title, d.description, d.photoUrl])).toEqual(DEFAULT_DIRECTIONS.map((d) => [d.titleRu, null, null]));
    expect(toDirectionViews("kk", rows, media).map((d) => d.title)).toEqual(DEFAULT_DIRECTIONS.map((d) => d.titleKk));
  });
});
