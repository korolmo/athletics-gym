import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BLOCKS,
  formatPhone,
  formatRating,
  instagramHandle,
  normalizeInstagram,
  normalizePhoneDigits,
  parseRating,
  splitMotto,
  toSiteContent,
} from "./site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "./site-settings.defaults";

describe("телефон", () => {
  it.each([
    ["+7 771 484 63 44", "77714846344"],
    ["8 (771) 484-63-44", "77714846344"],
    ["7714846344", "77714846344"],
    ["77714846344", "77714846344"],
    ["+998 90 123 45 67", "998901234567"],
  ])("%s → %s", (raw, digits) => {
    expect(normalizePhoneDigits(raw)).toBe(digits);
  });

  it.each(["", "12345", "позвоните нам", "+7 771 484 63 44 доб. 2", "1".repeat(16)])("не номер: «%s»", (raw) => {
    expect(normalizePhoneDigits(raw)).toBeNull();
  });

  it("казахстанский номер показываем группами, остальные — как есть", () => {
    expect(formatPhone("+77714846344")).toBe("+7 771 484 63 44");
    expect(formatPhone("+998901234567")).toBe("+998901234567");
  });
});

describe("Instagram", () => {
  it.each([
    "https://instagram.com/athletics_gym_qyzylorda",
    "https://www.instagram.com/athletics_gym_qyzylorda/",
    "instagram.com/athletics_gym_qyzylorda?igsh=abc",
    "@athletics_gym_qyzylorda",
    "athletics_gym_qyzylorda",
  ])("%s → ссылка на профиль", (raw) => {
    expect(normalizeInstagram(raw)).toBe("https://instagram.com/athletics_gym_qyzylorda");
  });

  it.each(["", "https://example.com/athletics", "javascript:alert(1)", "имя с пробелом", "https://instagram.com/"])(
    "не профиль: «%s»",
    (raw) => {
      expect(normalizeInstagram(raw)).toBeNull();
    },
  );

  it("в форме показываем имя профиля", () => {
    expect(instagramHandle("https://instagram.com/athletics__gym__women")).toBe("@athletics__gym__women");
  });
});

describe("рейтинг 2ГИС", () => {
  it.each([
    ["5,0", 50],
    ["4.9", 49],
    ["5", 50],
    [" 4,5 ", 45],
    ["1,0", 10],
  ])("%s → %i десятых", (raw, tenths) => {
    expect(parseRating(raw)).toBe(tenths);
  });

  it.each(["", "0", "5,1", "6", "4,95", "пять", "-4"])("не оценка: «%s»", (raw) => {
    expect(parseRating(raw)).toBeNull();
  });

  it("показываем с запятой и одним знаком", () => {
    expect(formatRating(50)).toBe("5,0");
    expect(formatRating(49)).toBe("4,9");
  });
});

describe("девиз", () => {
  it("второе предложение выделяется", () => {
    expect(splitMotto("КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.")).toEqual({ before: "КҮШ.", accent: "ШЫДАМДЫЛЫҚ.", after: "НӘТИЖЕ." });
    expect(splitMotto("Сила! Выносливость. Результат. Всегда.")).toEqual({
      before: "Сила!",
      accent: "Выносливость.",
      after: "Результат. Всегда.",
    });
    expect(splitMotto("Сила. Результат")).toEqual({ before: "Сила.", accent: "Результат", after: "" });
  });

  it("одно предложение — без выделения, текст не теряется", () => {
    expect(splitMotto("Твой зал в Кызылорде")).toEqual({ before: "Твой зал в Кызылорде", accent: "", after: "" });
    expect(splitMotto("  Сила.  ")).toEqual({ before: "Сила.", accent: "", after: "" });
  });
});

describe("Настройки сайта на языке страницы", () => {
  it("русская версия — русские тексты", () => {
    const s = toSiteContent("ru", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS);
    expect(s.hero.subtitle).toBe(DEFAULT_SETTINGS.heroSubtitleRu);
    expect(s.about.map((c) => c.title)).toEqual(["Новые тренажёры", "Отдельный женский зал", "Кондиционеры", "08:00–23:00"]);
    expect(s.contacts).toMatchObject({
      address: "ул. Султана Бейбарса, 2а, цокольный этаж",
      phoneTel: "+77714846344",
      phoneDisplay: "+7 771 484 63 44",
      whatsapp: "77714846344",
      whatsappDisplay: "+7 771 484 63 44",
    });
    expect(s.rating).toEqual({ value: "5,0", count: 405 });
  });

  it("казахская версия: есть перевод — показываем его, пусто — русский", () => {
    const s = toSiteContent("kk", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS);
    expect(s.hero.subtitle).toBe(DEFAULT_SETTINGS.heroSubtitleKk);
    // У девиза казахского варианта нет — он и так на казахском
    expect(s.hero.title).toBe(DEFAULT_SETTINGS.heroTitleRu);

    const blank = toSiteContent("kk", { ...DEFAULT_SETTINGS, addressKk: "   " }, [
      { ...DEFAULT_ABOUT_CARDS[0], titleKk: null },
      ...DEFAULT_ABOUT_CARDS.slice(1),
    ]);
    expect(blank.contacts.address).toBe(DEFAULT_SETTINGS.addressRu);
    expect(blank.about[0].title).toBe("Новые тренажёры");
  });

  it("карточки идут по месту, как бы ни пришли из базы", () => {
    const s = toSiteContent("ru", DEFAULT_SETTINGS, [...DEFAULT_ABOUT_CARDS].reverse());
    expect(s.about[0].kicker).toBe("Оборудование");
    expect(s.about[3].kicker).toBe("Режим");
  });

  it("скрытый Блок — только он, остальные показаны", () => {
    const s = toSiteContent("ru", { ...DEFAULT_SETTINGS, showGallery: false }, DEFAULT_ABOUT_CARDS);
    expect(s.show.gallery).toBe(false);
    expect(BLOCKS.filter((b) => s.show[b])).toEqual(BLOCKS.filter((b) => b !== "gallery"));
  });
});

describe("начальные значения и миграция для боевой базы", () => {
  const sql = fs.readFileSync("prisma/migrations/20261009010000_site_settings/migration.sql", "utf8");
  const quoted = (v: string | number) => (typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

  it("миграция кладёт в базу те же Настройки сайта, что и seed", () => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (value === null || typeof value === "boolean") continue;
      expect(sql, key).toContain(quoted(value));
    }
  });

  it("и те же четыре карточки «О зале»", () => {
    expect(DEFAULT_ABOUT_CARDS.map((c) => c.position)).toEqual([1, 2, 3, 4]);
    for (const card of DEFAULT_ABOUT_CARDS) {
      const row = [card.position, card.kickerRu, card.kickerKk, card.titleRu, card.titleKk, card.textRu, card.textKk]
        .map((v) => (v === null ? "NULL" : quoted(v)))
        .join(", ");
      expect(sql).toContain(`(${row})`);
    }
  });
});
