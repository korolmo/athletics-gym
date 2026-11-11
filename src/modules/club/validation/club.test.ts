import { describe, expect, it } from "vitest";
import { parseClubForm } from "./club";

// Форма «Клуб» (этап П1, решение 13).

const ok = {
  name: "Iron Club",
  cityRu: "Алматы",
  cityKk: "",
  cityInRu: "в Алматы",
  cityInKk: "",
  seoDescriptionRu: "Спортзал в Алматы: тренажёрный зал, персональные тренировки, первое посещение бесплатно.",
  seoDescriptionKk: "",
  foundedYear: "2019",
  accentColor: "#4FC3F7",
  logoMode: "monogram",
  twoGisUrl: "https://2gis.kz/almaty/firm/1",
  twoGisReviewsUrl: "",
  twoGisRouteUrl: "",
  latitude: "43,238",
  longitude: "76.889",
};

function form(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...ok, ...over })) fd.set(k, v);
  return fd;
}

describe("форма «Клуб»", () => {
  it("нормализует: пустой KZ — null, цвет — строчными, запятая в координате, год — число", () => {
    const r = parseClubForm(form());
    expect(r).toMatchObject({
      ok: true,
      data: { name: "Iron Club", cityKk: null, accentColor: "#4fc3f7", latitude: 43.238, longitude: 76.889, foundedYear: 2019, twoGisReviewsUrl: null },
    });
  });

  it("тёмный цвет не принимается — с причиной", () => {
    const r = parseClubForm(form({ accentColor: "#1a237e" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/тёмный/);
  });

  it("ссылка не на 2ГИС, одна координата, год из будущего, короткое описание — ошибки", () => {
    expect(parseClubForm(form({ twoGisUrl: "https://evil.example/2gis.kz" })).ok).toBe(false);
    expect(parseClubForm(form({ twoGisUrl: "http://2gis.kz/x" })).ok).toBe(false);
    expect(parseClubForm(form({ longitude: "" })).ok).toBe(false);
    expect(parseClubForm(form({ foundedYear: String(new Date().getFullYear() + 1) })).ok).toBe(false);
    expect(parseClubForm(form({ seoDescriptionRu: "Коротко" })).ok).toBe(false);
    expect(parseClubForm(form({ logoMode: "other" })).ok).toBe(false);
  });

  it("без года и без точки — можно", () => {
    expect(parseClubForm(form({ foundedYear: "", latitude: "", longitude: "" }))).toMatchObject({ ok: true, data: { foundedYear: null, latitude: null } });
  });
});
