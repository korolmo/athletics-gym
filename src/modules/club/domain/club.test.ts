import { describe, expect, it } from "vitest";
import { fillBrand, hasBrandToken } from "@/lib/brand-text";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import { cabinetRu } from "@/dictionaries/cabinet/ru";
import { DEFAULT_CLUB, clubCity, clubTextVars, mapEmbedUrl } from "./club";

// Перенос «один в один» (решение 7 этапа П1): начальный Клуб в шаблонах словарей даёт ровно те строки, что
// были в коде до П1. Миграцию сверяет с DEFAULT_CLUB тест на MariaDB (src/lib/mariadb.integration.test.ts).

const fill = <T,>(dict: T, locale: "ru" | "kk", since: string, club = DEFAULT_CLUB) =>
  fillBrand(dict, clubTextVars(club, locale, since));

describe("начальный Клуб в шаблонах = тексты до П1", () => {
  it("русский", () => {
    const t = fill(ru, "ru", ru.brand.since);
    expect(t.meta.title).toBe("Athletic's Gym — тренажёрный зал в Кызылорде");
    expect(t.meta.description.startsWith("Тренажёрный зал в Кызылорде: новые тренажёры")).toBe(true);
    expect(t.seo.title).toBe("Athletic's Gym — спортзал в Кызылорде");
    expect(t.seo.description).toBe(
      "Спортзал в Кызылорде: тренажёрный зал с новыми тренажёрами, отдельный женский зал, персональные тренировки с тренером. Первое посещение бесплатно.",
    );
    expect(t.seo.tagline).toBe("Спортзал в Кызылорде");
    expect(t.hero.kicker).toBe("Кызылорда · с 2022 года");
    expect(t.contacts.city).toBe("Кызылорда");
    expect(t.contacts.mapTitle).toBe("Карта: Athletic's Gym");
    expect(t.footer.rights).toBe("Athletic's Gym, Кызылорда");
    expect(t.errors.notFound.title).toBe("Страница не найдена — Athletic's Gym");
    expect(t.brand.twoGis).toBe("https://2gis.kz/kyzylorda/firm/70000001069365221");
    expect(t.brand.mapEmbed).toBe(
      "https://www.openstreetmap.org/export/embed.html?bbox=65.504295,44.780253,65.52029499999999,44.788253&layer=mapnik&marker=44.784253,65.512295",
    );
  });

  it("казахский", () => {
    const t = fill(kk, "kk", kk.brand.since);
    expect(t.meta.title).toBe("Athletic's Gym — Қызылордадағы тренажер залы");
    expect(t.seo.title).toBe("Athletic's Gym — Қызылордадағы спорт зал");
    expect(t.seo.tagline).toBe("Қызылордадағы спорт зал");
    expect(t.hero.kicker).toBe("Қызылорда · 2022 жылдан бері");
    expect(t.footer.rights).toBe("Athletic's Gym, Қызылорда");
  });

  it("кабинет", () => {
    const t = fill(cabinetRu, "ru", ru.brand.since);
    expect(t.meta.title).toBe("Личный кабинет — Athletic's Gym");
    expect(t.brand.name).toBe("Athletic's Gym");
  });

  it("пояс Athletic's Gym — Кызылорда; функции времени берут пояс Клуба аргументом (П2, решение 14)", () => {
    expect(DEFAULT_CLUB.timeZone).toBe("Asia/Qyzylorda");
  });
});

describe("другой Клуб", () => {
  const iron = { ...DEFAULT_CLUB, name: "Iron Club", cityRu: "Алматы", cityKk: null, cityInRu: "в Алматы", cityInKk: null, foundedYear: null, twoGisUrl: null, twoGisReviewsUrl: null, twoGisRouteUrl: null, seoDescriptionRu: "Зал в Алматы.", seoDescriptionKk: null };

  it("ни одной метки и ни одного старого названия; без года — без подписи; казахского нет — русский", () => {
    for (const [dict, locale, since] of [
      [ru, "ru", ru.brand.since],
      [kk, "kk", kk.brand.since],
    ] as const) {
      const text = JSON.stringify(fill(dict, locale, since, iron));
      expect(hasBrandToken(text)).toBe(false);
      expect(text).not.toMatch(/Athletic|Кызылорд|Қызылорд/);
    }
    const t = fill(kk, "kk", kk.brand.since, iron);
    expect(t.hero.kicker).toBe("Алматы");
    expect(t.seo.title).toBe("Iron Club — в Алматы спорт зал");
    expect(t.brand.twoGis).toBe("");
  });

  it("город на языке страницы", () => {
    expect(clubCity(DEFAULT_CLUB, "kk")).toBe("Қызылорда");
    expect(clubCity(iron, "kk")).toBe("Алматы");
  });

  it("нет точки — нет карты", () => {
    expect(mapEmbedUrl({ latitude: null, longitude: 1 })).toBe("");
  });
});
