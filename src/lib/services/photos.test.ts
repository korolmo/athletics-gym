import { beforeEach, describe, expect, it, vi } from "vitest";

// Сервисы фото проверяем без базы и без сети: Prisma, хранилище и проверка сессии подменены.
// Сессия: по умолчанию Владелец вошёл; в тестах прав requireOwner() отказывает, как настоящий (перенаправление = исключение).

const { state, db, storage, requireOwner } = vi.hoisted(() => {
  const state = {
    settings: { heroPhoto: null as string | null, womenPhoto: null as string | null },
    halls: [
      { id: "general", pricePoster: null as string | null },
      { id: "women", pricePoster: null as string | null },
    ],
    trainers: [{ id: "tr1", uploadedPhoto: null as string | null }],
    gallery: [] as { id: string; path: string; sortOrder: number; isVisible: boolean; captionRu: string | null; captionKk: string | null; createdAt: Date }[],
    files: new Map<string, Date>(),
    failNextWrite: false,
  };
  const notFound = () => Object.assign(new Error("not found"), { code: "P2025" });
  const write = () => {
    if (state.failNextWrite) {
      state.failNextWrite = false;
      throw new Error("база недоступна");
    }
  };
  const db = {
    siteSettings: {
      findUnique: vi.fn(async () => ({ ...state.settings })),
      update: vi.fn(async ({ data }: { data: Partial<typeof state.settings> }) => {
        write();
        Object.assign(state.settings, data);
      }),
    },
    hall: {
      count: vi.fn(async ({ where }: { where: { id: string } }) => state.halls.filter((h) => h.id === where.id).length),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.halls.find((h) => h.id === where.id) ?? null),
      findMany: vi.fn(async () => state.halls.map((h) => ({ ...h }))),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { pricePoster: string | null } }) => {
        write();
        const hall = state.halls.find((h) => h.id === where.id);
        if (!hall) throw notFound();
        Object.assign(hall, data);
      }),
    },
    trainer: {
      count: vi.fn(async ({ where }: { where: { id: string } }) => state.trainers.filter((t) => t.id === where.id).length),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.trainers.find((t) => t.id === where.id) ?? null),
      findMany: vi.fn(async () => state.trainers.filter((t) => t.uploadedPhoto).map((t) => ({ ...t }))),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { uploadedPhoto: string | null } }) => {
        write();
        const trainer = state.trainers.find((t) => t.id === where.id);
        if (!trainer) throw notFound();
        Object.assign(trainer, data);
      }),
    },
    galleryPhoto: {
      aggregate: vi.fn(async () => ({
        _max: { sortOrder: state.gallery.length ? Math.max(...state.gallery.map((g) => g.sortOrder)) : null },
      })),
      create: vi.fn(async ({ data }: { data: { path: string; sortOrder: number } }) => {
        write();
        state.gallery.push({ id: `g${state.gallery.length + 1}`, isVisible: true, captionRu: null, captionKk: null, createdAt: new Date(), ...data });
      }),
      findMany: vi.fn(async () => [...state.gallery].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => ({ ...g }))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.gallery.find((g) => g.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        const photo = state.gallery.find((g) => g.id === where.id);
        if (!photo) throw notFound();
        Object.assign(photo, data);
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        state.gallery.filter((g) => g.id === where.id).forEach((g) => Object.assign(g, data));
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.gallery = state.gallery.filter((g) => g.id !== where.id);
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  class StorageNotConfigured extends Error {}
  const storage = {
    StorageNotConfigured,
    isStorageConfigured: vi.fn(() => true),
    mediaUrl: vi.fn((path: string | null | undefined) => (path ? `https://storage.test/${path}` : null)),
    signUpload: vi.fn(async (path: string) => `https://storage.test/upload/${path}?token=t`),
    objectExists: vi.fn(async (path: string) => state.files.has(path)),
    removeObjects: vi.fn(async (paths: string[]) => paths.forEach((p) => state.files.delete(p))),
    listObjects: vi.fn(async () => [...state.files].map(([path, createdAt]) => ({ path, createdAt }))),
  };
  const requireOwner = vi.fn(async () => {});
  return { state, db, storage, requireOwner };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/storage/client", () => storage);
vi.mock("@/lib/admin/guard", () => ({ requireOwner }));

import * as photos from "./photos";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HOUR = 60 * 60 * 1000;
/** Файл уже загружен браузером в хранилище. */
const uploaded = (path: string, ageMs = 0) => state.files.set(path, new Date(Date.now() - ageMs));

beforeEach(() => {
  vi.clearAllMocks();
  requireOwner.mockImplementation(async () => {});
  state.settings = { heroPhoto: null, womenPhoto: null };
  state.halls.forEach((h) => (h.pricePoster = null));
  state.trainers = [{ id: "tr1", uploadedPhoto: null }];
  state.gallery = [];
  state.files = new Map();
  state.failNextWrite = false;
});

describe("ссылка на загрузку", () => {
  it("имя файла задаёт сервер: папка места и uuid, расширение — по типу", async () => {
    const r = await photos.requestUpload("gallery", "image/webp", 300_000);
    if (!r.ok) throw new Error(r.error);
    expect(r.path).toMatch(/^gallery\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/);
    expect(storage.signUpload).toHaveBeenCalledWith(r.path);
    expect(r.uploadUrl).toContain(r.path);
  });

  it("у каждой загрузки своё имя", async () => {
    const a = await photos.requestUpload("hero", "image/jpeg", 1000);
    const b = await photos.requestUpload("hero", "image/jpeg", 1000);
    expect(a.ok && b.ok && a.path !== b.path).toBe(true);
  });

  it("не картинка или слишком большой файл — ссылка не выдаётся", async () => {
    expect(await photos.requestUpload("gallery", "application/pdf", 1000)).toMatchObject({ ok: false });
    expect(await photos.requestUpload("gallery", "image/svg+xml", 1000)).toMatchObject({ ok: false });
    const big = await photos.requestUpload("gallery", "image/webp", 5 * 1024 * 1024 + 1);
    expect(big.ok === false && big.error).toMatch(/слишком большое/);
    expect(storage.signUpload).not.toHaveBeenCalled();
  });

  it("неизвестное место или удалённый Тренер — ссылка не выдаётся", async () => {
    expect(await photos.requestUpload("logo", "image/webp", 1000)).toMatchObject({ ok: false });
    expect(await photos.requestUpload("trainer:ghost", "image/webp", 1000)).toMatchObject({ ok: false });
    expect(storage.signUpload).not.toHaveBeenCalled();
  });

  it("хранилище не настроено или не отвечает — понятная ошибка, а не падение", async () => {
    storage.signUpload.mockRejectedValueOnce(new storage.StorageNotConfigured());
    expect(await photos.requestUpload("hero", "image/webp", 1000)).toEqual({
      ok: false,
      error: "Хранилище фото не настроено. Сообщите разработчику.",
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.signUpload.mockRejectedValueOnce(new Error("timeout"));
    const r = await photos.requestUpload("hero", "image/webp", 1000);
    expect(r.ok === false && r.error).toMatch(/не отвечает/);
    log.mockRestore();
  });
});

describe("привязка загруженного Фото", () => {
  it("фон первого экрана: путь записан в базу", async () => {
    const path = `hero/${uuid(1)}.webp`;
    uploaded(path);
    expect(await photos.attachPhoto("hero", path)).toEqual({ ok: true });
    expect(state.settings.heroPhoto).toBe(path);
    expect(state.files.has(path)).toBe(true);
  });

  it("замена: прежний файл удаляется из хранилища", async () => {
    const first = `hero/${uuid(1)}.webp`;
    const second = `hero/${uuid(2)}.webp`;
    uploaded(first);
    await photos.attachPhoto("hero", first);
    uploaded(second);
    await photos.attachPhoto("hero", second);
    expect(state.settings.heroPhoto).toBe(second);
    expect([...state.files.keys()]).toEqual([second]);
  });

  it("Плакат Тренера и Плакат прайса привязываются к своему Тренеру и Залу", async () => {
    const poster = `trainer/${uuid(3)}.webp`;
    const price = `hall/${uuid(4)}.jpg`;
    uploaded(poster);
    uploaded(price);
    expect(await photos.attachPhoto("trainer:tr1", poster)).toEqual({ ok: true });
    expect(await photos.attachPhoto("hall:women", price)).toEqual({ ok: true });
    expect(state.trainers[0].uploadedPhoto).toBe(poster);
    expect(state.halls.find((h) => h.id === "women")?.pricePoster).toBe(price);
    expect(state.halls.find((h) => h.id === "general")?.pricePoster).toBeNull();
  });

  it("Галерея: новое фото встаёт в конец", async () => {
    for (const n of [1, 2, 3]) {
      uploaded(`gallery/${uuid(n)}.webp`);
      await photos.attachPhoto("gallery", `gallery/${uuid(n)}.webp`);
    }
    expect(state.gallery.map((g) => [g.path, g.sortOrder])).toEqual([
      [`gallery/${uuid(1)}.webp`, 0],
      [`gallery/${uuid(2)}.webp`, 1],
      [`gallery/${uuid(3)}.webp`, 2],
    ]);
  });

  it("файла в хранилище нет — в базу ничего не пишем", async () => {
    const r = await photos.attachPhoto("hero", `hero/${uuid(1)}.webp`);
    expect(r).toEqual({ ok: false, error: "Фото не загрузилось. Попробуйте ещё раз." });
    expect(state.settings.heroPhoto).toBeNull();
    expect(db.siteSettings.update).not.toHaveBeenCalled();
  });

  it.each([
    ["чужая папка", "hero", `gallery/${uuid(1)}.webp`],
    ["выход из папки", "gallery", `gallery/../hero/${uuid(1)}.webp`],
    ["не uuid", "gallery", "gallery/photo.webp"],
    ["адрес вместо пути", "gallery", `https://evil.example/gallery/${uuid(1)}.webp`],
    ["файл из public", "trainer:tr1", "/trainers/aisha.jpg"],
  ])("путь из браузера не наш (%s) — отказ, хранилище и базу не трогаем", async (_name, target, path) => {
    state.files.set(path, new Date());
    expect((await photos.attachPhoto(target, path)).ok).toBe(false);
    expect(storage.objectExists).not.toHaveBeenCalled();
    expect(db.siteSettings.update).not.toHaveBeenCalled();
    expect(db.galleryPhoto.create).not.toHaveBeenCalled();
    expect(db.trainer.update).not.toHaveBeenCalled();
  });

  it("запись в базу не удалась — загруженный файл убираем из хранилища", async () => {
    const path = `gallery/${uuid(1)}.webp`;
    uploaded(path);
    state.failNextWrite = true;
    await expect(photos.attachPhoto("gallery", path)).rejects.toThrow("база недоступна");
    expect(state.gallery).toEqual([]);
    expect(state.files.has(path)).toBe(false);
  });

  it("Тренера удалили, пока шла загрузка, — файл убираем, ошибка понятная", async () => {
    const path = `trainer/${uuid(1)}.webp`;
    uploaded(path);
    const r = await photos.attachPhoto("trainer:ghost", path);
    expect(r.ok === false && r.error).toMatch(/не найдена/);
    expect(state.files.has(path)).toBe(false);
  });

  it("сбой удаления прежнего файла не отменяет замену", async () => {
    const first = `hero/${uuid(1)}.webp`;
    const second = `hero/${uuid(2)}.webp`;
    uploaded(first);
    await photos.attachPhoto("hero", first);
    uploaded(second);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.removeObjects.mockRejectedValueOnce(new Error("storage down"));
    expect(await photos.attachPhoto("hero", second)).toEqual({ ok: true });
    expect(state.settings.heroPhoto).toBe(second);
    log.mockRestore();
  });
});

describe("удаление Фото", () => {
  it("с места: путь в базе очищен, файл удалён из хранилища", async () => {
    const path = `hall/${uuid(1)}.webp`;
    uploaded(path);
    await photos.attachPhoto("hall:general", path);
    expect(await photos.removePhoto("hall:general")).toEqual({ ok: true });
    expect(state.halls[0].pricePoster).toBeNull();
    expect(state.files.size).toBe(0);
  });

  it("нечего удалять — ничего не происходит", async () => {
    expect(await photos.removePhoto("women")).toEqual({ ok: true });
    expect(db.siteSettings.update).not.toHaveBeenCalled();
    expect(storage.removeObjects).not.toHaveBeenCalled();
  });

  it("из Галереи: запись и файл удаляются вместе, остальные фото на месте", async () => {
    for (const n of [1, 2]) {
      uploaded(`gallery/${uuid(n)}.webp`);
      await photos.attachPhoto("gallery", `gallery/${uuid(n)}.webp`);
    }
    await photos.deleteGalleryPhoto("g1");
    expect(state.gallery.map((g) => g.id)).toEqual(["g2"]);
    expect([...state.files.keys()]).toEqual([`gallery/${uuid(2)}.webp`]);
  });

  it("сорванная загрузка: файл без записи в базе убирается, привязанный — нет", async () => {
    const orphan = `gallery/${uuid(1)}.webp`;
    const used = `hero/${uuid(2)}.webp`;
    uploaded(orphan);
    uploaded(used);
    await photos.attachPhoto("hero", used);
    await photos.discardUpload(orphan);
    await photos.discardUpload(used);
    await photos.discardUpload("../../etc/passwd");
    expect([...state.files.keys()]).toEqual([used]);
  });
});

describe("Галерея: порядок и показ", () => {
  beforeEach(async () => {
    for (const n of [1, 2, 3]) {
      uploaded(`gallery/${uuid(n)}.webp`);
      await photos.attachPhoto("gallery", `gallery/${uuid(n)}.webp`);
    }
  });
  const order = async () => (await photos.listGallery()).map((g) => g.id);

  it("фото сдвигается на одно место вверх и вниз", async () => {
    await photos.moveGalleryPhoto("g3", "up");
    expect(await order()).toEqual(["g1", "g3", "g2"]);
    await photos.moveGalleryPhoto("g1", "down");
    expect(await order()).toEqual(["g3", "g1", "g2"]);
  });

  it("первое некуда поднимать, последнее некуда опускать", async () => {
    await photos.moveGalleryPhoto("g1", "up");
    await photos.moveGalleryPhoto("g3", "down");
    await photos.moveGalleryPhoto("ghost", "up");
    expect(await order()).toEqual(["g1", "g2", "g3"]);
  });

  it("скрыть и показать; подпись сохраняется", async () => {
    await photos.toggleGalleryPhoto("g2");
    expect(state.gallery.find((g) => g.id === "g2")?.isVisible).toBe(false);
    await photos.toggleGalleryPhoto("g2");
    expect(state.gallery.find((g) => g.id === "g2")?.isVisible).toBe(true);

    expect(await photos.saveGalleryCaption({ id: "g2", captionRu: "Кардиозона", captionKk: null, isVisible: true })).toEqual({ ok: true });
    expect(state.gallery.find((g) => g.id === "g2")?.captionRu).toBe("Кардиозона");
    const gone = await photos.saveGalleryCaption({ id: "ghost", captionRu: null, captionKk: null, isVisible: true });
    expect(gone.ok).toBe(false);
  });

  it("в списке — ссылки на файлы хранилища", async () => {
    expect((await photos.listGallery())[0].url).toBe(`https://storage.test/gallery/${uuid(1)}.webp`);
  });
});

describe("уборка хранилища", () => {
  it("удаляет старые файлы без записи в базе; привязанные и свежие не трогает", async () => {
    const used = `hero/${uuid(1)}.webp`;
    uploaded(used, 5 * HOUR);
    await photos.attachPhoto("hero", used);
    uploaded(`gallery/${uuid(2)}.webp`, 2 * HOUR);
    uploaded(`gallery/${uuid(3)}.webp`, 60_000);
    expect(await photos.sweepOrphans()).toBe(1);
    expect([...state.files.keys()].sort()).toEqual([`gallery/${uuid(3)}.webp`, used].sort());
  });

  it("после каждой успешной загрузки уборка запускается сама", async () => {
    uploaded(`gallery/${uuid(9)}.webp`, 3 * HOUR);
    const path = `women/${uuid(1)}.webp`;
    uploaded(path);
    await photos.attachPhoto("women", path);
    expect([...state.files.keys()]).toEqual([path]);
  });

  it("сбой уборки загрузке не мешает", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.listObjects.mockRejectedValueOnce(new Error("storage down"));
    const path = `women/${uuid(1)}.webp`;
    uploaded(path);
    expect(await photos.attachPhoto("women", path)).toEqual({ ok: true });
    log.mockRestore();
  });
});

describe("права: без сессии Владельца — отказ", () => {
  // Настоящий requireOwner() перенаправляет на вход; перенаправление в Next — это исключение
  const NO_SESSION = new Error("NEXT_REDIRECT;/admin/login");
  const g1 = `gallery/${uuid(1)}.webp`;

  const calls: [string, () => Promise<unknown>][] = [
    ["requestUpload", () => photos.requestUpload("gallery", "image/webp", 1000)],
    ["attachPhoto", () => photos.attachPhoto("gallery", g1)],
    ["discardUpload", () => photos.discardUpload(g1)],
    ["removePhoto", () => photos.removePhoto("hero")],
    ["listGallery", () => photos.listGallery()],
    ["getGalleryPhoto", () => photos.getGalleryPhoto("g1")],
    ["saveGalleryCaption", () => photos.saveGalleryCaption({ id: "g1", captionRu: "x", captionKk: null, isVisible: true })],
    ["toggleGalleryPhoto", () => photos.toggleGalleryPhoto("g1")],
    ["moveGalleryPhoto", () => photos.moveGalleryPhoto("g1", "down")],
    ["deleteGalleryPhoto", () => photos.deleteGalleryPhoto("g1")],
    ["getSinglePhotos", () => photos.getSinglePhotos()],
    ["sweepOrphans", () => photos.sweepOrphans()],
  ];

  it("проверены все функции сервиса", () => {
    const exported = Object.entries(photos).filter(([, v]) => typeof v === "function").map(([k]) => k);
    expect(calls.map(([name]) => name).sort()).toEqual(exported.sort());
  });

  it.each(calls)("%s: ни база, ни хранилище не тронуты", async (_name, call) => {
    state.files.set(g1, new Date(0));
    state.gallery.push({ id: "g1", path: g1, sortOrder: 0, isVisible: true, captionRu: null, captionKk: null, createdAt: new Date() });
    state.settings.heroPhoto = `hero/${uuid(2)}.webp`;
    const before = JSON.stringify([state.settings, state.halls, state.trainers, state.gallery, [...state.files.keys()]]);
    requireOwner.mockRejectedValue(NO_SESSION);

    await expect(call()).rejects.toBe(NO_SESSION);

    expect(JSON.stringify([state.settings, state.halls, state.trainers, state.gallery, [...state.files.keys()]])).toBe(before);
    for (const model of [db.siteSettings, db.hall, db.trainer, db.galleryPhoto]) {
      for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled();
    }
    for (const fn of [storage.signUpload, storage.objectExists, storage.removeObjects, storage.listObjects]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
