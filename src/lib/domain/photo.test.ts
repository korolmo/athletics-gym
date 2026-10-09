import { describe, expect, it } from "vitest";
import { fitSize } from "@/lib/photo/compress";
import { parseGalleryCaptionForm } from "@/lib/validation/gallery";
import { LIMITS } from "@/lib/admin/limits";
import {
  MAX_FILE_BYTES,
  MAX_SOURCE_BYTES,
  ORPHAN_AGE_MS,
  checkSource,
  checkUpload,
  findOrphans,
  formatPhotoTarget,
  isPhotoPath,
  newPhotoPath,
  parsePhotoTarget,
  pathMatchesKind,
  photoUrl,
  storageOrigin,
} from "./photo";

const UUID = "3f2b8c1e-9a4d-4e7b-8c21-0a1b2c3d4e5f";
const MB = 1024 * 1024;

describe("проверка файла перед загрузкой: тип", () => {
  it.each(["image/webp", "image/jpeg", "image/png"])("%s — принимаем", (type) => {
    expect(checkUpload(type, 300_000)).toEqual({ ok: true, type });
  });

  it.each([
    "image/gif",
    "image/svg+xml",
    "image/heic",
    "image/avif",
    "application/pdf",
    "text/html",
    "video/mp4",
    "",
    "image/webp; charset=utf-8",
    "IMAGE/WEBP",
  ])("«%s» — не фото", (type) => {
    const r = checkUpload(type, 300_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/не фото/);
  });
});

describe("проверка файла перед загрузкой: размер", () => {
  it("ровно 5 МБ — можно, на байт больше — нельзя", () => {
    expect(checkUpload("image/webp", MAX_FILE_BYTES).ok).toBe(true);
    const r = checkUpload("image/webp", MAX_FILE_BYTES + 1);
    expect(r).toEqual({ ok: false, error: "Фото слишком большое: 5,0 МБ. После сжатия должно быть не больше 5,0 МБ." });
  });

  it("в сообщении — настоящий размер файла", () => {
    const r = checkUpload("image/jpeg", Math.round(12.3 * MB));
    expect(r.ok === false && r.error).toMatch(/12,3 МБ/);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("размер %s — не файл", (size) => {
    expect(checkUpload("image/webp", size).ok).toBe(false);
  });

  it("тип проверяется раньше размера", () => {
    const r = checkUpload("application/pdf", MAX_FILE_BYTES * 10);
    expect(r.ok === false && r.error).toMatch(/не фото/);
  });
});

describe("исходный файл в браузере, до сжатия", () => {
  it("любая картинка подходит — в WebP её превратит сжатие", () => {
    expect(checkSource("image/heic", 8 * MB)).toEqual({ ok: true });
    expect(checkSource("image/jpeg", 12 * MB)).toEqual({ ok: true });
  });

  it("не картинка — понятная ошибка", () => {
    expect(checkSource("application/pdf", 1 * MB)).toEqual({
      ok: false,
      error: "Это не фото. Выберите картинку из галереи телефона.",
    });
    expect(checkSource("", 1 * MB).ok).toBe(false);
    expect(checkSource("video/mp4", 1 * MB).ok).toBe(false);
  });

  it("слишком большой файл не открываем", () => {
    const r = checkSource("image/jpeg", MAX_SOURCE_BYTES + 1);
    expect(r.ok === false && r.error).toMatch(/слишком большой/);
  });
});

describe("сжатие: новые размеры", () => {
  it("длинная сторона — до 1600, пропорции те же", () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitSize(1600, 900)).toEqual({ width: 1600, height: 900 });
  });

  it("маленькое фото не растягиваем", () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("очень узкое фото не схлопывается в ноль", () => {
    expect(fitSize(16000, 4)).toEqual({ width: 1600, height: 1 });
  });
});

describe("куда загружается Фото", () => {
  it.each([
    ["hero", { kind: "hero" }],
    ["women", { kind: "women" }],
    ["gallery", { kind: "gallery" }],
    ["trainer:cmabc123xyz", { kind: "trainer", id: "cmabc123xyz" }],
    ["hall:general", { kind: "hall", id: "general" }],
    ["hall:women", { kind: "hall", id: "women" }],
  ])("%s", (raw, target) => {
    expect(parsePhotoTarget(raw)).toEqual(target);
    expect(formatPhotoTarget(parsePhotoTarget(raw)!)).toBe(raw);
  });

  it.each(["", "logo", "hero:1", "trainer", "trainer:", "trainer:../x", "trainer:a:b", "hall", "hall:vip", "gallery:1", "HERO"])(
    "«%s» — нет такого места",
    (raw) => {
      expect(parsePhotoTarget(raw)).toBeNull();
    },
  );
});

describe("путь файла в хранилище", () => {
  it("имя задаёт сервер: папка места, uuid и расширение по типу", () => {
    expect(newPhotoPath("gallery", "image/webp", UUID)).toBe(`gallery/${UUID}.webp`);
    expect(newPhotoPath("trainer", "image/jpeg", UUID)).toBe(`trainer/${UUID}.jpg`);
    expect(newPhotoPath("hall", "image/png", UUID)).toBe(`hall/${UUID}.png`);
    expect(isPhotoPath(newPhotoPath("hero", "image/webp", UUID))).toBe(true);
  });

  it.each([
    "",
    `${UUID}.webp`,
    `logos/${UUID}.webp`,
    `gallery/${UUID}.gif`,
    `gallery/${UUID}.webp.exe`,
    `gallery/../hero/${UUID}.webp`,
    `gallery/${UUID}.webp?x=1`,
    `/gallery/${UUID}.webp`,
    `gallery/photo.webp`,
    `gallery/${UUID.toUpperCase()}.webp`,
    `gallery/sub/${UUID}.webp`,
    `https://evil.example/gallery/${UUID}.webp`,
    `gallery/${UUID}.webp\n`,
  ])("чужой путь «%s» не принимаем", (path) => {
    expect(isPhotoPath(path)).toBe(false);
  });

  it("путь должен быть из папки своего места", () => {
    expect(pathMatchesKind(`gallery/${UUID}.webp`, "gallery")).toBe(true);
    expect(pathMatchesKind(`gallery/${UUID}.webp`, "hero")).toBe(false);
    expect(pathMatchesKind(`hero/${UUID}.webp`, "hall")).toBe(false);
    expect(pathMatchesKind(`../${UUID}.webp`, "gallery")).toBe(false);
  });
});

describe("ссылка на Фото", () => {
  const base = "https://abc.supabase.co";

  it("прямая ссылка на файл публичного бакета media", () => {
    expect(photoUrl(base, `gallery/${UUID}.webp`)).toBe(`${base}/storage/v1/object/public/media/gallery/${UUID}.webp`);
    expect(photoUrl(`${base}/`, `hero/${UUID}.jpg`)).toBe(`${base}/storage/v1/object/public/media/hero/${UUID}.jpg`);
  });

  it("нет пути, нет адреса хранилища или путь не наш — ссылки нет, сайт покажет картинку из public/", () => {
    expect(photoUrl(base, null)).toBeNull();
    expect(photoUrl(base, "")).toBeNull();
    expect(photoUrl(undefined, `gallery/${UUID}.webp`)).toBeNull();
    expect(photoUrl("", `gallery/${UUID}.webp`)).toBeNull();
    expect(photoUrl(base, "javascript:alert(1)")).toBeNull();
    expect(photoUrl(base, "/trainers/aisha.jpg")).toBeNull();
    expect(photoUrl(base, `gallery/../../secret/${UUID}.webp`)).toBeNull();
  });
});

describe("адрес хранилища из переменной окружения", () => {
  it("правильный https-адрес проекта", () => {
    expect(storageOrigin("https://abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(storageOrigin("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
  });

  it.each([
    ["не задан", undefined],
    ["пусто", ""],
    ["с кавычками и точкой с запятой", '"https://abc.supabase.co";'],
    ["с точкой с запятой", "https://abc.supabase.co;"],
    ["без https", "http://abc.supabase.co"],
    ["без схемы", "abc.supabase.co"],
    ["другая схема", "javascript:alert(1)"],
  ])("%s — хранилища нет", (_name, raw) => {
    expect(storageOrigin(raw)).toBeNull();
  });

  it("адрес с опечаткой не превращается в битую ссылку на сайте — показываем картинку из public/", () => {
    expect(photoUrl('"https://abc.supabase.co";', `gallery/${UUID}.webp`)).toBeNull();
    expect(photoUrl("http://abc.supabase.co", `gallery/${UUID}.webp`)).toBeNull();
  });
});

describe("брошенные загрузки", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const old = new Date(now.getTime() - ORPHAN_AGE_MS - 1000);
  const fresh = new Date(now.getTime() - 60_000);

  it("старый файл без ссылки из базы — удалить; со ссылкой — оставить", () => {
    const objects = [
      { path: "gallery/a.webp", createdAt: old },
      { path: "gallery/b.webp", createdAt: old },
    ];
    expect(findOrphans(objects, ["gallery/b.webp"], now)).toEqual(["gallery/a.webp"]);
  });

  it("свежий файл не трогаем: его ещё привязывают к месту", () => {
    expect(findOrphans([{ path: "hero/a.webp", createdAt: fresh }], [], now)).toEqual([]);
  });

  it("файл без времени создания не трогаем", () => {
    expect(findOrphans([{ path: "hero/a.webp", createdAt: null }], [], now)).toEqual([]);
  });
});

describe("подпись фото Галереи из формы", () => {
  function form(values: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fd;
  }

  it("подпись необязательна: пусто → null", () => {
    expect(parseGalleryCaptionForm(form({ id: "p1", captionRu: " Кардиозона ", captionKk: "", isVisible: "on" }))).toEqual({
      ok: true,
      data: { id: "p1", captionRu: "Кардиозона", captionKk: null, isVisible: true },
    });
    expect(parseGalleryCaptionForm(form({ id: "p1", captionRu: "", captionKk: "" }))).toEqual({
      ok: true,
      data: { id: "p1", captionRu: null, captionKk: null, isVisible: false },
    });
  });

  it("слишком длинная подпись и форма без фото — ошибка", () => {
    const long = "я".repeat(LIMITS.caption + 1);
    const r = parseGalleryCaptionForm(form({ id: "p1", captionRu: long, captionKk: "" }));
    expect(r.ok === false && r.error).toMatch(/Подпись \(RU\)/);
    expect(parseGalleryCaptionForm(form({ id: "", captionRu: "", captionKk: "" })).ok).toBe(false);
  });
});
