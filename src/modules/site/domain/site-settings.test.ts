import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BLOCKS,
  MARQUEE_MAX_ITEMS,
  hasUnknownPlaceholder,
  isBin,
  isEmail,
  normalizeBin,
  normalizeEmail,
  requisitesParts,
  marqueeItems,
  formatPhone,
  formatRating,
  instagramHandle,
  isInstagramUrl,
  isPhone,
  normalizeInstagram,
  normalizePhoneDigits,
  parseRating,
  mottoWords,
  splitMotto,
  toSiteContent,
} from "./site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_DATA_LOCATION, DEFAULT_SETTINGS } from "./site-settings.defaults";
import { decodeTextList, settingsFromRow, settingsToRow } from "./site-settings";

describe("телефон", () => {
  it.each([
    ["+7 771 484 63 44", "77714846344"],
    ["8 (771) 484-63-44", "77714846344"],
    ["7714846344", "77714846344"],
    ["77714846344", "77714846344"],
    ["+7(771)484-63-44", "77714846344"],
  ])("%s → %s", (raw, digits) => {
    expect(normalizePhoneDigits(raw)).toBe(digits);
    // В базу и в ссылки идёт только +7 и десять цифр
    expect(isPhone(`+${digits}`)).toBe(true);
  });

  it.each([
    "",
    "12345",
    "позвоните нам",
    "+7 771 484 63 44 доб. 2",
    "+7 771 484 63 4",
    "+7 771 484 63 444",
    // другая страна
    "+998 90 123 45 67",
    "+8 771 484 63 44",
    "+1 771 484 63 44",
    // попытки подсунуть схему или лишнее в ссылку tel: / wa.me
    "javascript:alert(1)",
    "tel:+77714846344",
    "+77714846344?text=x",
    "+77714846344/../x",
    "7771484634 4;ext=1",
    "+7 771 484 63 44\n+7 700 000 00 00",
    "++77714846344",
    "7+7714846344",
  ])("не номер: «%s»", (raw) => {
    expect(normalizePhoneDigits(raw)).toBeNull();
  });

  it("проверка готового значения: только +7 и десять цифр", () => {
    expect(isPhone("+77714846344")).toBe(true);
    for (const bad of ["77714846344", "+7771484634", "+777148463440", "+7 771 484 63 44", "+7771484634a", "tel:+77714846344", "+77714846344\n"]) {
      expect(isPhone(bad), bad).toBe(false);
    }
  });

  it("номер показываем группами", () => {
    expect(formatPhone("+77714846344")).toBe("+7 771 484 63 44");
  });
});

describe("Instagram", () => {
  it.each([
    "https://instagram.com/athletics_gym_qyzylorda",
    "https://www.instagram.com/athletics_gym_qyzylorda/",
    "instagram.com/athletics_gym_qyzylorda?igsh=abc",
    // http в базу не попадает: ссылка собирается заново, всегда https
    "http://instagram.com/athletics_gym_qyzylorda",
    "HTTPS://WWW.INSTAGRAM.COM/athletics_gym_qyzylorda",
    "@athletics_gym_qyzylorda",
    "athletics_gym_qyzylorda",
  ])("%s → ссылка на профиль", (raw) => {
    expect(normalizeInstagram(raw)).toBe("https://instagram.com/athletics_gym_qyzylorda");
  });

  it.each([
    "",
    "имя с пробелом",
    "https://instagram.com/",
    "a".repeat(31),
    // другие сайты, в том числе похожие на Instagram
    "https://example.com/athletics",
    "https://instagram.com.evil.example/athletics",
    "https://evil.example/instagram.com/athletics",
    "https://instagram.com@evil.example/athletics",
    "https://evil.example?instagram.com/athletics",
    "https://notinstagram.com/athletics",
    "https://m.instagram.com/athletics",
    "//evil.example/athletics",
    // другие схемы
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "javascript://instagram.com/%0Aalert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://instagram.com/athletics",
    "file:///etc/passwd",
    "mailto:owner@example.com",
    // лишнее в пути и попытки выйти из атрибута
    "https://instagram.com/athletics/../../evil",
    "https://instagram.com/athletics\" onclick=\"alert(1)",
    "https://instagram.com/athletics\njavascript:alert(1)",
    "https://instagram.com/<script>",
    "@athletics/evil",
  ])("не профиль: «%s»", (raw) => {
    expect(normalizeInstagram(raw)).toBeNull();
  });

  it("всё, что принято, — https, instagram.com и имя профиля, ничего больше", () => {
    for (const raw of ["@a.b_c", "instagram.com/a.b_c/?hl=ru#x", "a.b_c"]) {
      const url = normalizeInstagram(raw);
      expect(url).toBe("https://instagram.com/a.b_c");
      expect(isInstagramUrl(url ?? "")).toBe(true);
      expect(new URL(url ?? "").protocol).toBe("https:");
      expect(new URL(url ?? "").hostname).toBe("instagram.com");
    }
  });

  it("проверка готового значения отсекает всё, кроме https://instagram.com/имя", () => {
    expect(isInstagramUrl("https://instagram.com/athletics_gym_qyzylorda")).toBe(true);
    for (const bad of [
      "http://instagram.com/athletics",
      "https://www.instagram.com/athletics",
      "https://instagram.com/athletics/",
      "https://instagram.com/athletics?x=1",
      "https://instagram.com.evil.example/athletics",
      "javascript:alert(1)",
      "data:text/html,x",
      "https://instagram.com/athletics\n",
      "",
    ]) {
      expect(isInstagramUrl(bad), bad).toBe(false);
    }
  });

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
    expect(splitMotto("СИЛА. ВЫНОСЛИВОСТЬ. РЕЗУЛЬТАТ.")).toEqual({ before: "СИЛА.", accent: "ВЫНОСЛИВОСТЬ.", after: "РЕЗУЛЬТАТ." });
    expect(splitMotto(DEFAULT_SETTINGS.heroTitleRu).accent).toBe("ВЫНОСЛИВОСТЬ.");
    expect(splitMotto("Сила! Выносливость. Результат. Всегда.")).toEqual({
      before: "Сила!",
      accent: "Выносливость.",
      after: "Результат. Всегда.",
    });
    expect(splitMotto("Сила. Результат")).toEqual({ before: "Сила.", accent: "Результат", after: "" });
  });

  it("слова девиза по порядку: выделены слова второго предложения — по ним идёт появление по очереди", () => {
    expect(mottoWords("СИЛА. ВЫНОСЛИВОСТЬ. РЕЗУЛЬТАТ.")).toEqual([
      { word: "СИЛА.", accent: false, lineStart: false },
      { word: "ВЫНОСЛИВОСТЬ.", accent: true, lineStart: true },
      { word: "РЕЗУЛЬТАТ.", accent: false, lineStart: true },
    ]);
    // Новая строка на телефоне — только перед выделенной частью и перед текстом после неё
    expect(mottoWords("Твой зал. В центре города. Всегда рядом. Ждём.").filter((w) => w.lineStart).map((w) => w.word)).toEqual(["В", "Всегда"]);
    expect(mottoWords("Твой зал. В центре города. Всегда рядом.").map((w) => (w.accent ? w.word.toUpperCase() : w.word)).join(" ")).toBe("Твой зал. В ЦЕНТРЕ ГОРОДА. Всегда рядом.");
    expect(mottoWords("Одна фраза без точки")).toEqual(["Одна", "фраза", "без", "точки"].map((word) => ({ word, accent: false, lineStart: false })));
    expect(mottoWords("   ")).toEqual([]);
  });

  it("одно предложение — без выделения, текст не теряется", () => {
    expect(splitMotto("Твой зал в Кызылорде")).toEqual({ before: "Твой зал в Кызылорде", accent: "", after: "" });
    expect(splitMotto("  Сила.  ")).toEqual({ before: "Сила.", accent: "", after: "" });
  });
});

describe("бегущая строка", () => {
  const base = { hoursRu: "Ежедневно 08:00–23:00", hoursKk: "Күн сайын 08:00–23:00", ratingTenths: 49 };

  it("начальные пункты: часы работы и рейтинг подставляются из Настроек сайта", () => {
    expect(marqueeItems("ru", DEFAULT_SETTINGS)).toEqual([
      "ПЕРВОЕ ПОСЕЩЕНИЕ БЕСПЛАТНО",
      "ОТДЕЛЬНЫЙ ЖЕНСКИЙ ЗАЛ",
      "Ежедневно 08:00–23:00",
      "5,0 В 2ГИС",
      "ПЕРСОНАЛЬНЫЕ ТРЕНИРОВКИ",
      "СТУДЕНТАМ ДЕШЕВЛЕ",
    ]);
    expect(marqueeItems("kk", DEFAULT_SETTINGS)).toEqual([
      "АЛҒАШҚЫ КЕЛУ ТЕГІН",
      "БӨЛЕК ӘЙЕЛДЕР ЗАЛЫ",
      "Күн сайын 08:00–23:00",
      "2ГИС-ТЕ 5,0",
      "ЖЕКЕ ЖАТТЫҒУЛАР",
      "СТУДЕНТТЕРГЕ АРЗАН",
    ]);
  });

  it("казахский пункт пуст или его нет — на /kk идёт русский; часы при этом казахские", () => {
    const s = { ...base, marqueeRu: ["Первый", "Работаем: {часы}", "Третий"], marqueeKk: ["Бірінші", ""] };
    expect(marqueeItems("kk", s)).toEqual(["Бірінші", "Работаем: Күн сайын 08:00–23:00", "Третий"]);
    expect(marqueeItems("ru", s)).toEqual(["Первый", "Работаем: Ежедневно 08:00–23:00", "Третий"]);
  });

  it("подстановка работает в любом месте пункта и несколько раз", () => {
    const s = { ...base, marqueeRu: ["{рейтинг} из 5 — {рейтинг}!"], marqueeKk: [] };
    expect(marqueeItems("ru", s)).toEqual(["4,9 из 5 — 4,9!"]);
  });

  it("пустые пункты пропускаются, лишние сверх восьми — тоже", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Пункт ${i + 1}`);
    expect(marqueeItems("ru", { ...base, marqueeRu: ["А", "  ", "Б"], marqueeKk: [] })).toEqual(["А", "Б"]);
    expect(marqueeItems("ru", { ...base, marqueeRu: many, marqueeKk: [] })).toHaveLength(MARQUEE_MAX_ITEMS);
  });

  it("список в базе пуст — показываем начальные пункты, а не пустую ленту", () => {
    expect(marqueeItems("ru", { ...base, marqueeRu: [], marqueeKk: [] })[0]).toBe("ПЕРВОЕ ПОСЕЩЕНИЕ БЕСПЛАТНО");
    expect(marqueeItems("kk", { ...base, marqueeRu: [""], marqueeKk: ["Бір"] })[0]).toBe("АЛҒАШҚЫ КЕЛУ ТЕГІН");
  });

  it("фигурные скобки — только {часы} и {рейтинг}", () => {
    for (const ok of ["{часы}", "С {часы} и {рейтинг}", "Без подстановок"]) expect(hasUnknownPlaceholder(ok), ok).toBe(false);
    for (const bad of ["{час}", "{часы работы}", "{Рейтинг}", "{часы", "рейтинг}", "{{часы}}", "{hours}"]) {
      expect(hasUnknownPlaceholder(bad), bad).toBe(true);
    }
  });

  it("лента — Блок: её можно скрыть, и она идёт первой, сразу после первого экрана", () => {
    expect(BLOCKS[0]).toBe("marquee");
    expect(toSiteContent("ru", { ...DEFAULT_SETTINGS, showMarquee: false }, DEFAULT_ABOUT_CARDS).show.marquee).toBe(false);
    expect(toSiteContent("kk", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS).marquee).toContain("2ГИС-ТЕ 5,0");
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
    // Девиз: на /ru — русский, на /kk — казахский
    expect(s.hero.title).toBe("КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.");
    expect(toSiteContent("ru", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS).hero.title).toBe("СИЛА. ВЫНОСЛИВОСТЬ. РЕЗУЛЬТАТ.");
    // Казахского девиза нет — показываем русский
    expect(toSiteContent("kk", { ...DEFAULT_SETTINGS, heroTitleKk: null }, DEFAULT_ABOUT_CARDS).hero.title).toBe(DEFAULT_SETTINGS.heroTitleRu);

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

  it("в ссылки сайта не попадает то, что не прошло бы форму, — даже если оно оказалось в базе", () => {
    const tampered = {
      ...DEFAULT_SETTINGS,
      instagram: "javascript:alert(1)",
      womenInstagram: "data:text/html,<script>alert(1)</script>",
      phone: "javascript:alert(1)",
      whatsapp: "77714846344?text=x&evil=1",
    };
    const s = toSiteContent("ru", tampered, DEFAULT_ABOUT_CARDS);
    expect(s.contacts.instagram).toBe(DEFAULT_SETTINGS.instagram);
    expect(s.women.instagram).toBe(DEFAULT_SETTINGS.womenInstagram);
    expect(s.contacts.phoneTel).toBe(DEFAULT_SETTINGS.phone);
    expect(s.contacts.whatsapp).toBe(DEFAULT_SETTINGS.whatsapp);
    expect(JSON.stringify(s)).not.toMatch(/javascript:|data:|evil/);
  });

  it("начальные значения сами проходят эти правила", () => {
    expect(isInstagramUrl(DEFAULT_SETTINGS.instagram)).toBe(true);
    expect(isInstagramUrl(DEFAULT_SETTINGS.womenInstagram)).toBe(true);
    expect(isPhone(DEFAULT_SETTINGS.phone)).toBe(true);
    expect(isPhone(`+${DEFAULT_SETTINGS.whatsapp}`)).toBe(true);
  });

  it("первый экран скрыть нельзя: среди Блоков его нет", () => {
    expect(BLOCKS).not.toContain("hero");
    const s = toSiteContent("ru", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS);
    expect(Object.keys(s.show)).toEqual([...BLOCKS]);
    expect("hero" in s.show).toBe(false);
  });

  it("скрытый Блок — только он, остальные показаны", () => {
    const s = toSiteContent("ru", { ...DEFAULT_SETTINGS, showGallery: false }, DEFAULT_ABOUT_CARDS);
    expect(s.show.gallery).toBe(false);
    expect(BLOCKS.filter((b) => s.show[b])).toEqual(BLOCKS.filter((b) => b !== "gallery"));
  });
});

describe("реквизиты", () => {
  const filled = {
    ...DEFAULT_SETTINGS,
    legalName: "ИП Иванов Иван Иванович",
    legalBin: "880101300123",
    legalAddress: "г. Кызылорда, ул. Султана Бейбарса, 2а",
    privacyEmail: "info@athletics-gym.kz",
  };
  const labels = { bin: "ИИН/БИН", legalAddress: "юр. адрес:" };

  it("ИИН/БИН — ровно 12 цифр", () => {
    expect(isBin("880101300123")).toBe(true);
    for (const bad of ["", "88010130012", "8801013001234", "88010130012a", " 880101300123", "880101300123\n", "８８０１０１３００１２３"]) {
      expect(isBin(bad), bad).toBe(false);
    }
    expect(normalizeBin(" 880101 300 123 ")).toBe("880101300123");
    expect(normalizeBin("8801-0130-0123")).toBe("880101300123");
    expect(normalizeBin("88010130012")).toBeNull();
    expect(normalizeBin("БИН 880101300123")).toBeNull();
  });

  it("email: обычные адреса проходят, всё остальное — нет", () => {
    for (const good of ["info@athletics-gym.kz", "ivan.ivanov+gym@mail.ru", "a@b.co", "Owner_1@sub.domain.kz"]) {
      expect(isEmail(good), good).toBe(true);
    }
    for (const bad of ["", "info", "info@", "@a.kz", "info@a", "in fo@a.kz", "info@a..kz", "info@a.k", "a@b.kz?subject=x", "a@b.kz\nbcc:x@y.kz", "<a@b.kz>", "javascript:alert(1)@a.kz"]) {
      expect(isEmail(bad), bad).toBe(false);
    }
    expect(normalizeEmail("  info@athletics-gym.kz ")).toBe("info@athletics-gym.kz");
    expect(normalizeEmail("не почта")).toBeNull();
  });

  it("пока Владелец их не ввёл, реквизитов нет — и в подвале пусто", () => {
    const s = toSiteContent("ru", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS);
    expect(s.legal).toEqual({ name: "", bin: "", address: "", email: "", dataLocation: DEFAULT_DATA_LOCATION.ru });
    expect(requisitesParts(s.legal, labels)).toEqual([]);
  });

  it("реквизиты из Настроек попадают в подвал: название, ИИН/БИН, юридический адрес", () => {
    const s = toSiteContent("ru", filled, DEFAULT_ABOUT_CARDS);
    expect(s.legal).toMatchObject({ name: filled.legalName, bin: filled.legalBin, address: filled.legalAddress, email: filled.privacyEmail });
    expect(requisitesParts(s.legal, labels).join(" · ")).toBe(
      "ИП Иванов Иван Иванович · ИИН/БИН 880101300123 · юр. адрес: г. Кызылорда, ул. Султана Бейбарса, 2а",
    );
  });

  it("заполнена часть реквизитов — в подвале только она", () => {
    const s = toSiteContent("ru", { ...filled, legalBin: null, legalAddress: "  " }, DEFAULT_ABOUT_CARDS);
    expect(requisitesParts(s.legal, labels)).toEqual(["ИП Иванов Иван Иванович"]);
  });

  it("на казахской версии подписи свои, сами реквизиты те же", () => {
    const s = toSiteContent("kk", filled, DEFAULT_ABOUT_CARDS);
    expect(requisitesParts(s.legal, { bin: "ЖСН/БСН", legalAddress: "заңды мекенжайы:" })[1]).toBe("ЖСН/БСН 880101300123");
  });

  it("вторая линия защиты: ИИН/БИН и email не по правилам (правили мимо админки) на сайт не попадают", () => {
    const s = toSiteContent("ru", { ...filled, legalBin: "12345", privacyEmail: "a@b.kz?bcc=x@y.kz" }, DEFAULT_ABOUT_CARDS);
    expect(s.legal.bin).toBe("");
    expect(s.legal.email).toBe("");
  });

  it("место хранения данных: по умолчанию — текст из кода на обоих языках; своё — из Настроек, без перевода на /kk идёт русский", () => {
    expect(toSiteContent("kk", DEFAULT_SETTINGS, DEFAULT_ABOUT_CARDS).legal.dataLocation).toBe(DEFAULT_DATA_LOCATION.kk);
    const moved = { ...DEFAULT_SETTINGS, dataLocationRu: "на серверах в Республике Казахстан", dataLocationKk: null };
    expect(toSiteContent("ru", moved, DEFAULT_ABOUT_CARDS).legal.dataLocation).toBe("на серверах в Республике Казахстан");
    expect(toSiteContent("kk", moved, DEFAULT_ABOUT_CARDS).legal.dataLocation).toBe("на серверах в Республике Казахстан");
    const translated = { ...moved, dataLocationKk: "Қазақстан Республикасындағы серверлерде" };
    expect(toSiteContent("kk", translated, DEFAULT_ABOUT_CARDS).legal.dataLocation).toBe("Қазақстан Республикасындағы серверлерде");
    // Перевод без русского текста не показываем: на /ru и /kk было бы о разном
    expect(toSiteContent("kk", { ...translated, dataLocationRu: " " }, DEFAULT_ABOUT_CARDS).legal.dataLocation).toBe(DEFAULT_DATA_LOCATION.kk);
  });
});

describe("начальные значения и PostgreSQL-миграция прежней боевой базы (архив)", () => {
  const sql = fs.readFileSync("prisma/archive/postgres-migrations/20261009010000_site_settings/migration.sql", "utf8");
  const quoted = (v: string | number) => (typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

  it("миграция кладёт в базу те же Настройки сайта, что и seed (кроме девиза: его начальное значение сменили на этапе 7)", () => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      // Пункты бегущей строки добавлены позже — их кладёт своя миграция (проверка ниже)
      if (value === null || typeof value === "boolean" || Array.isArray(value)) continue;
      // Миграция уже применена к боевой базе и не переписывается: девиз там прежний, меняет его Владелец
      if (key === "heroTitleRu" || key === "heroTitleKk") continue;
      expect(sql, key).toContain(quoted(value));
    }
  });

  it("миграция бегущей строки кладёт те же пункты, что и seed", () => {
    const marqueeSql = fs.readFileSync("prisma/archive/postgres-migrations/20261011000000_marquee/migration.sql", "utf8");
    const list = (items: string[]) => `ARRAY[${items.map(quoted).join(", ")}]`;
    expect(marqueeSql).toContain(`"marqueeRu" = ${list(DEFAULT_SETTINGS.marqueeRu)}`);
    expect(marqueeSql).toContain(`"marqueeKk" = ${list(DEFAULT_SETTINGS.marqueeKk)}`);
    expect(DEFAULT_SETTINGS.marqueeKk).toHaveLength(DEFAULT_SETTINGS.marqueeRu.length);
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

describe("списки бегущей строки в базе", () => {
  it("пишутся JSON-массивом и читаются обратно без потерь, с казахскими буквами и кавычками", () => {
    const row = settingsToRow({ marqueeRu: ["«ЖИМ»", "{часы}"], marqueeKk: ["ҚҰҒӘҢ", ""] });
    expect(typeof row.marqueeRu).toBe("string");
    expect(settingsFromRow(row)).toEqual({ marqueeRu: ["«ЖИМ»", "{часы}"], marqueeKk: ["ҚҰҒӘҢ", ""] });
  });

  it("часть Настроек без списков проходит как есть", () => {
    expect(settingsToRow({ heroTitleRu: "СИЛА" })).toEqual({ heroTitleRu: "СИЛА" });
  });

  it("повреждённый текст — пустой список, не ошибка", () => {
    expect(decodeTextList("не json")).toEqual([]);
    expect(decodeTextList('{"a":1}')).toEqual([]);
    expect(decodeTextList(null)).toEqual([]);
    expect(decodeTextList('["a", 5]')).toEqual(["a", ""]);
  });
});
