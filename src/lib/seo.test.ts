import { describe, expect, it } from "vitest";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import { toSiteContent } from "@/lib/domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import {
  DEFAULT_SITE_URL,
  buildGymJsonLd,
  buildMetadata,
  buildRobots,
  buildSitemap,
  isIndexable,
  jsonLdScript,
  parseOpeningHours,
  readSeoEnv,
  resolveSiteUrl,
} from "./seo";

const URL_ = "https://athletics-gym.vercel.app";
const prod = { siteUrl: URL_, vercelEnv: "production" };
const preview = { siteUrl: URL_, vercelEnv: "preview" };
const ICON = "/logo.png?v=2";

describe("адрес сайта из SITE_URL", () => {
  it("переменной нет — адрес по умолчанию", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(DEFAULT_SITE_URL).toBe("https://athletics-gym.vercel.app");
  });

  it("свой домен: берётся как есть, без пути и слэша в конце", () => {
    expect(resolveSiteUrl("https://athletics.kz")).toBe("https://athletics.kz");
    expect(resolveSiteUrl(" https://athletics.kz/ ")).toBe("https://athletics.kz");
    expect(resolveSiteUrl("https://athletics.kz/ru")).toBe("https://athletics.kz");
  });

  it.each(["http://athletics.kz", "athletics.kz", '"https://athletics.kz";', "javascript:alert(1)", "https://athletics.kz;"])(
    "«%s» — с ошибкой, берём адрес по умолчанию",
    (raw) => {
      expect(resolveSiteUrl(raw)).toBe(DEFAULT_SITE_URL);
    },
  );

  it("с доменом .kz меняется только переменная: все ссылки строятся от неё", () => {
    const env = readSeoEnv({ SITE_URL: "https://athletics.kz", VERCEL_ENV: "production" });
    const m = buildMetadata("kk", kk.seo, env, ICON);
    expect(m.alternates?.canonical).toBe("https://athletics.kz/kk");
    expect(buildSitemap(env.siteUrl, new Date(0))[0].url).toBe("https://athletics.kz/ru");
    expect(buildRobots(env).sitemap).toBe("https://athletics.kz/sitemap.xml");
  });
});

describe("метаданные /ru и /kk", () => {
  const cases = [
    ["ru", ru.seo, "спортзал в Кызылорде", "ru_KZ"],
    ["kk", kk.seo, "Қызылордадағы спорт зал", "kk_KZ"],
  ] as const;

  it.each(cases)("/%s: title и description на своём языке, с городом", (locale, text, phrase) => {
    const m = buildMetadata(locale, text, prod, ICON);
    expect(m.title).toBe(text.title);
    expect(String(m.title)).toContain(phrase);
    expect(String(m.title)).toContain("Athletic's Gym");
    expect(String(m.description).toLowerCase()).toContain(phrase.toLowerCase());
    expect(String(m.description).length).toBeGreaterThan(70);
    expect(String(m.description).length).toBeLessThan(170);
  });

  it("тексты двух языков разные", () => {
    expect(ru.seo.title).not.toBe(kk.seo.title);
    expect(ru.seo.description).not.toBe(kk.seo.description);
  });

  it.each(cases)("/%s: canonical — на саму себя", (locale, text) => {
    expect(buildMetadata(locale, text, prod, ICON).alternates?.canonical).toBe(`${URL_}/${locale}`);
  });

  it.each(cases)("/%s: hreflang ru, kk и x-default — одинаковый набор на обеих версиях", (locale, text) => {
    expect(buildMetadata(locale, text, prod, ICON).alternates?.languages).toEqual({
      ru: `${URL_}/ru`,
      kk: `${URL_}/kk`,
      "x-default": `${URL_}/ru`,
    });
  });

  it.each(cases)("/%s: Open Graph и Twitter — свой язык, адрес страницы, большая картинка", (locale, text, _phrase, ogLocale) => {
    const m = buildMetadata(locale, text, prod, ICON);
    expect(m.openGraph).toMatchObject({ url: `${URL_}/${locale}`, locale: ogLocale, title: text.title, description: text.description, siteName: "Athletic's Gym" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: text.title });
    expect(String(m.metadataBase)).toBe(`${URL_}/`);
  });

  it("иконки: favicon и apple-touch-icon из logo.png", () => {
    expect(buildMetadata("ru", ru.seo, prod, ICON).icons).toEqual({ icon: [{ url: ICON, type: "image/png" }], apple: [{ url: ICON }] });
  });

  it("GOOGLE_SITE_VERIFICATION: задана — есть meta для Search Console; не задана — нет", () => {
    expect(buildMetadata("ru", ru.seo, { ...prod, googleVerification: "abc123" }, ICON).verification).toEqual({ google: "abc123" });
    expect(buildMetadata("ru", ru.seo, prod, ICON).verification).toBeUndefined();
    expect(readSeoEnv({ GOOGLE_SITE_VERIFICATION: "  abc123 " }).googleVerification).toBe("abc123");
    expect(readSeoEnv({ GOOGLE_SITE_VERIFICATION: "   " }).googleVerification).toBeUndefined();
  });
});

describe("индексация: только production", () => {
  it("production на Vercel — можно; превью, development и локальный запуск — нельзя", () => {
    expect(isIndexable("production")).toBe(true);
    for (const env of ["preview", "development", undefined, "", "Production"]) expect(isIndexable(env)).toBe(false);
  });

  it.each(["ru", "kk"] as const)("/%s: в production — index, на превью — noindex", (locale) => {
    const text = locale === "ru" ? ru.seo : kk.seo;
    expect(buildMetadata(locale, text, prod, ICON).robots).toEqual({ index: true, follow: true });
    expect(buildMetadata(locale, text, preview, ICON).robots).toEqual({ index: false, follow: false });
    expect(buildMetadata(locale, text, { siteUrl: URL_, vercelEnv: undefined }, ICON).robots).toEqual({ index: false, follow: false });
  });

  it("robots.txt в production: сайт открыт, /admin и /api закрыты, есть ссылка на sitemap", () => {
    expect(buildRobots(prod)).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
      sitemap: `${URL_}/sitemap.xml`,
      host: URL_,
    });
  });

  it.each(["preview", "development", undefined])("robots.txt на «%s»: Disallow: / и никакого sitemap", (vercelEnv) => {
    const robots = buildRobots({ siteUrl: URL_, vercelEnv });
    expect(robots).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
    expect(robots.sitemap).toBeUndefined();
  });
});

describe("sitemap.xml", () => {
  it("две страницы — /ru и /kk, у каждой hreflang на обе и x-default", () => {
    const map = buildSitemap(URL_, new Date("2026-10-10T00:00:00Z"));
    expect(map.map((e) => e.url)).toEqual([`${URL_}/ru`, `${URL_}/kk`]);
    for (const entry of map) {
      expect(entry.alternates?.languages).toEqual({ ru: `${URL_}/ru`, kk: `${URL_}/kk`, "x-default": `${URL_}/ru` });
      expect(entry.lastModified).toEqual(new Date("2026-10-10T00:00:00Z"));
    }
    expect(JSON.stringify(map)).not.toContain("/admin");
  });
});

describe("часы работы для разметки", () => {
  it.each([
    ["Ежедневно 08:00–23:00", { opens: "08:00", closes: "23:00" }],
    ["Күн сайын 08:00–23:00", { opens: "08:00", closes: "23:00" }],
    ["с 7:30 - 22.00 без выходных", { opens: "07:30", closes: "22:00" }],
    ["Круглосуточно 00:00—24:00", { opens: "00:00", closes: "24:00" }],
  ])("«%s»", (text, hours) => {
    expect(parseOpeningHours(text)).toEqual(hours);
  });

  it.each(["Круглосуточно", "", "с утра до вечера", "25:00–99:99"])("«%s» — времени нет, часы в разметку не идут", (text) => {
    expect(parseOpeningHours(text)).toBeNull();
  });
});

describe("JSON-LD: ExerciseGym из Настроек сайта", () => {
  const build = (locale: "ru" | "kk", settings = DEFAULT_SETTINGS) =>
    buildGymJsonLd({
      siteUrl: URL_,
      locale,
      name: "Athletic's Gym",
      description: (locale === "ru" ? ru : kk).seo.description,
      city: (locale === "ru" ? ru : kk).contacts.city,
      coords: { lat: 44.784253, lng: 65.512295 },
      logoPath: "/logo.png",
      extraLinks: ["https://2gis.kz/kyzylorda/firm/70000001069365221"],
      content: toSiteContent(locale, settings, DEFAULT_ABOUT_CARDS),
    });

  it("название, адрес, координаты, телефон, часы, логотип, ссылка, Instagram в sameAs", () => {
    expect(build("ru")).toEqual({
      "@context": "https://schema.org",
      "@type": "ExerciseGym",
      "@id": `${URL_}/#gym`,
      name: "Athletic's Gym",
      description: ru.seo.description,
      url: `${URL_}/ru`,
      inLanguage: "ru",
      logo: `${URL_}/logo.png`,
      image: `${URL_}/ru/opengraph-image`,
      telephone: "+77714846344",
      address: { "@type": "PostalAddress", streetAddress: "ул. Султана Бейбарса, 2а, цокольный этаж", addressLocality: "Кызылорда", addressCountry: "KZ" },
      geo: { "@type": "GeoCoordinates", latitude: 44.784253, longitude: 65.512295 },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "08:00", closes: "23:00" },
      ],
      sameAs: [
        "https://instagram.com/athletics_gym_qyzylorda",
        "https://instagram.com/athletics__gym__women",
        "https://2gis.kz/kyzylorda/firm/70000001069365221",
      ],
    });
  });

  it("казахская версия: адрес и город на казахском, ссылка на /kk", () => {
    const ld = build("kk") as { url: string; inLanguage: string; address: { streetAddress: string; addressLocality: string } };
    expect(ld.url).toBe(`${URL_}/kk`);
    expect(ld.inLanguage).toBe("kk");
    expect(ld.address).toMatchObject({ streetAddress: "Сұлтан Бейбарыс көшесі, 2а, цоколь қабат", addressLocality: "Қызылорда" });
  });

  it("данные — из Настроек сайта: поменяли телефон, адрес, часы и Instagram — поменялась разметка", () => {
    const ld = build("ru", {
      ...DEFAULT_SETTINGS,
      phone: "+77000000001",
      addressRu: "ул. Новая, 1",
      hoursRu: "Ежедневно 07:00–24:00",
      instagram: "https://instagram.com/new_gym",
    }) as Record<string, unknown>;
    expect(ld.telephone).toBe("+77000000001");
    expect(ld.address).toMatchObject({ streetAddress: "ул. Новая, 1" });
    expect(ld.openingHoursSpecification).toMatchObject([{ opens: "07:00", closes: "24:00" }]);
    expect(ld.sameAs).toContain("https://instagram.com/new_gym");
  });

  it("часы без времени — раздела о часах в разметке нет, остальное на месте", () => {
    const ld = build("ru", { ...DEFAULT_SETTINGS, hoursRu: "Круглосуточно" });
    expect(ld).not.toHaveProperty("openingHoursSpecification");
    expect(ld).toHaveProperty("telephone");
  });

  it("рейтинга и отзывов в разметке нет — ни при каких Настройках", () => {
    for (const locale of ["ru", "kk"] as const) {
      const json = JSON.stringify(build(locale, { ...DEFAULT_SETTINGS, ratingTenths: 49, ratingCount: 1201 }));
      for (const banned of ["aggregateRating", "AggregateRating", "ratingValue", "reviewCount", "ratingCount", "\"review\"", "Review", "bestRating", "1201", "405"]) {
        expect(json, banned).not.toContain(banned);
      }
    }
  });

  it("текст из Настроек не может закрыть тег script", () => {
    const ld = build("ru", { ...DEFAULT_SETTINGS, addressRu: '</script><script>alert(1)</script>' });
    const html = jsonLdScript(ld);
    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<");
    expect(JSON.parse(html).address.streetAddress).toBe("</script><script>alert(1)</script>");
  });
});
