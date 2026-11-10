import { describe, expect, it } from "vitest";
import { CLUB_TIME_ZONE } from "@/lib/time";
import { site } from "@/lib/site";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import { DEFAULT_CLUB, clubCity } from "./club";

// Перенос «один в один» (решение 7 этапа П1): начальный Клуб совпадает с константами, которые он заменит.
// Миграцию сверяет с DEFAULT_CLUB тест на MariaDB (src/lib/mariadb.integration.test.ts). Когда следующие PR
// уберут константы из кода, эти сверки уйдут вместе с ними.

describe("начальный Клуб = прежние константы", () => {
  it("название, 2ГИС и точка на карте — из src/lib/site.ts", () => {
    expect(DEFAULT_CLUB.name).toBe(site.name);
    expect(DEFAULT_CLUB.twoGisUrl).toBe(site.twoGis);
    expect(DEFAULT_CLUB.twoGisReviewsUrl).toBe(site.twoGisReviews);
    expect(DEFAULT_CLUB.twoGisRouteUrl).toBe(site.twoGisRoute);
    expect([DEFAULT_CLUB.latitude, DEFAULT_CLUB.longitude]).toEqual([site.coords.lat, site.coords.lng]);
  });

  it("пояс — CLUB_TIME_ZONE, описание для поиска — из словарей", () => {
    expect(DEFAULT_CLUB.timeZone).toBe(CLUB_TIME_ZONE);
    expect(DEFAULT_CLUB.seoDescriptionRu).toBe(ru.seo.description);
    expect(DEFAULT_CLUB.seoDescriptionKk).toBe(kk.seo.description);
  });
});

describe("город на языке страницы", () => {
  it("казахского нет — русский", () => {
    expect(clubCity(DEFAULT_CLUB, "kk")).toBe("Қызылорда");
    expect(clubCity({ cityRu: "Алматы", cityKk: null }, "kk")).toBe("Алматы");
  });
});
