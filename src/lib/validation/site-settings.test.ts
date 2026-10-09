import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/admin/limits";
import { ratingCountText } from "@/lib/presentation/rating";
import { parsePasswordChangeForm } from "./account";
import {
  parseAboutForm,
  parseContactsForm,
  parseHeroForm,
  parseRatingForm,
  parseWomenForm,
} from "./site-settings";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

describe("первый экран из формы", () => {
  const hero = { heroTitleRu: " Сила. Результат. ", heroTitleKk: "", heroSubtitleRu: "Зал в центре", heroSubtitleKk: "Орталықтағы зал" };

  it("русский обязателен, пустой казахский → null, пробелы по краям убираются", () => {
    expect(parseHeroForm(form(hero))).toEqual({
      ok: true,
      data: { heroTitleRu: "Сила. Результат.", heroTitleKk: null, heroSubtitleRu: "Зал в центре", heroSubtitleKk: "Орталықтағы зал" },
    });
  });

  it("пустой русский текст — ошибка с названием поля", () => {
    expect(error(parseHeroForm(form({ ...hero, heroTitleRu: "  " })))).toBe("Заполните поле «Девиз» на русском");
    expect(error(parseHeroForm(form({ ...hero, heroSubtitleRu: "" })))).toBe("Заполните поле «Подзаголовок» на русском");
  });

  it("слишком длинный текст — ошибка, и для казахского тоже", () => {
    expect(error(parseHeroForm(form({ ...hero, heroTitleRu: "я".repeat(LIMITS.motto + 1) })))).toMatch(/не длиннее/);
    expect(error(parseHeroForm(form({ ...hero, heroTitleKk: "я".repeat(LIMITS.motto + 1) })))).toMatch(/\(KZ\)/);
  });
});

describe("карточки «О зале» из формы", () => {
  const cards: Record<string, string> = {};
  for (let i = 1; i <= 4; i++) {
    cards[`card${i}.kickerRu`] = `Подпись ${i}`;
    cards[`card${i}.kickerKk`] = "";
    cards[`card${i}.titleRu`] = `Заголовок ${i}`;
    cards[`card${i}.titleKk`] = i === 2 ? "Тақырып" : "";
    cards[`card${i}.textRu`] = `Текст ${i}`;
    cards[`card${i}.textKk`] = "";
  }

  it("четыре карточки по порядку", () => {
    const r = parseAboutForm(form(cards));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.cards).toHaveLength(4);
    expect(r.data.cards[1]).toEqual({
      kickerRu: "Подпись 2",
      kickerKk: null,
      titleRu: "Заголовок 2",
      titleKk: "Тақырып",
      textRu: "Текст 2",
      textKk: null,
    });
  });

  it("в ошибке названа карточка", () => {
    expect(error(parseAboutForm(form({ ...cards, "card3.textRu": "" })))).toBe(
      "Карточка 3. Заполните поле «Текст» на русском",
    );
  });

  it("карточки не хватает — ошибка, а не три карточки на сайте", () => {
    const three = Object.fromEntries(Object.entries(cards).filter(([k]) => !k.startsWith("card4.")));
    expect(parseAboutForm(form(three)).ok).toBe(false);
  });
});

describe("Женский зал из формы", () => {
  it("Instagram: имя профиля превращается в ссылку", () => {
    const r = parseWomenForm(form({ womenTextRu: "Отдельный зал", womenTextKk: "", womenInstagram: "@athletics__gym__women" }));
    expect(r).toEqual({
      ok: true,
      data: { womenTextRu: "Отдельный зал", womenTextKk: null, womenInstagram: "https://instagram.com/athletics__gym__women" },
    });
  });

  it.each(["https://example.com/x", "javascript:alert(1)", "data:text/html,x", "https://instagram.com.evil.example/x"])(
    "вместо Instagram «%s» — ошибка, в базу не уходит",
    (womenInstagram) => {
      const r = parseWomenForm(form({ womenTextRu: "Отдельный зал", womenTextKk: "", womenInstagram }));
      expect(error(r)).toMatch(/Instagram Женского зала/);
    },
  );
});

describe("контакты из формы", () => {
  const contacts = {
    addressRu: "ул. Султана Бейбарса, 2а",
    addressKk: "",
    hoursRu: "Ежедневно 08:00–23:00",
    hoursKk: "",
    phone: "8 (771) 484-63-44",
    whatsapp: "+7 771 484 63 44",
    instagram: "instagram.com/athletics_gym_qyzylorda",
  };

  it("телефон — «+» и цифры, WhatsApp — только цифры, Instagram — ссылка", () => {
    const r = parseContactsForm(form(contacts));
    if (!r.ok) throw new Error(r.error);
    expect(r.data).toMatchObject({
      phone: "+77714846344",
      whatsapp: "77714846344",
      instagram: "https://instagram.com/athletics_gym_qyzylorda",
      addressKk: null,
    });
  });

  it("не номер в телефоне или WhatsApp — ошибка с названием поля", () => {
    expect(error(parseContactsForm(form({ ...contacts, phone: "звоните" })))).toMatch(/^Телефон:/);
    expect(error(parseContactsForm(form({ ...contacts, whatsapp: "12345" })))).toMatch(/^Номер WhatsApp:/);
    expect(error(parseContactsForm(form({ ...contacts, whatsapp: "" })))).toMatch(/^Номер WhatsApp:/);
  });

  it.each(["+998 90 123 45 67", "javascript:alert(1)", "+77714846344?text=x", "tel:+77714846344"])(
    "телефон и WhatsApp «%s» — ошибка: только казахстанский номер",
    (value) => {
      expect(error(parseContactsForm(form({ ...contacts, phone: value })))).toMatch(/^Телефон:/);
      expect(error(parseContactsForm(form({ ...contacts, whatsapp: value })))).toMatch(/^Номер WhatsApp:/);
    },
  );

  it.each(["javascript:alert(1)", "data:text/html,x", "https://evil.example/instagram.com/x"])(
    "Instagram зала «%s» — ошибка",
    (instagram) => {
      expect(error(parseContactsForm(form({ ...contacts, instagram })))).toMatch(/^Instagram зала/);
    },
  );

  it("пустой Instagram или адрес — ошибка", () => {
    expect(error(parseContactsForm(form({ ...contacts, instagram: "" })))).toBe("Укажите Instagram зала");
    expect(error(parseContactsForm(form({ ...contacts, addressRu: "" })))).toBe("Заполните поле «Адрес» на русском");
  });
});

describe("рейтинг 2ГИС из формы", () => {
  it("оценка с запятой или точкой, число оценок с пробелом", () => {
    expect(parseRatingForm(form({ ratingTenths: "4,9", ratingCount: "1 205" }))).toEqual({
      ok: true,
      data: { ratingTenths: 49, ratingCount: 1205 },
    });
    expect(parseRatingForm(form({ ratingTenths: "5.0", ratingCount: "0" }))).toEqual({
      ok: true,
      data: { ratingTenths: 50, ratingCount: 0 },
    });
  });

  it("оценка вне 1–5 и нецелое число оценок — ошибка", () => {
    expect(error(parseRatingForm(form({ ratingTenths: "5,5", ratingCount: "405" })))).toMatch(/Оценка/);
    expect(error(parseRatingForm(form({ ratingTenths: "", ratingCount: "405" })))).toMatch(/Оценка/);
    expect(error(parseRatingForm(form({ ratingTenths: "5", ratingCount: "" })))).toMatch(/Число оценок/);
    expect(error(parseRatingForm(form({ ratingTenths: "5", ratingCount: "-3" })))).toMatch(/Число оценок/);
    expect(error(parseRatingForm(form({ ratingTenths: "5", ratingCount: "40.5" })))).toMatch(/Число оценок/);
  });

  it("на сайте слово «оценка» стоит в нужной форме", () => {
    const ru = { count: "{n} {word} в 2ГИС", words: ["оценка", "оценки", "оценок"] };
    expect(ratingCountText(ru, 405)).toBe("405 оценок в 2ГИС");
    expect(ratingCountText(ru, 401)).toBe("401 оценка в 2ГИС");
    expect(ratingCountText(ru, 402)).toBe("402 оценки в 2ГИС");
    expect(ratingCountText(ru, 411)).toBe("411 оценок в 2ГИС");
    expect(ratingCountText({ count: "2ГИС-те {n} {word}", words: ["баға"] }, 405)).toBe("2ГИС-те 405 баға");
  });
});

describe("смена пароля из формы", () => {
  const ok = { oldPassword: "old-password", newPassword: "new-password-1", repeatPassword: "new-password-1" };

  it("старый пароль и новый дважды", () => {
    expect(parsePasswordChangeForm(form(ok))).toEqual({
      ok: true,
      data: { oldPassword: "old-password", newPassword: "new-password-1" },
    });
  });

  it("пробелы в пароле сохраняются — это часть пароля", () => {
    const spaced = { oldPassword: " old ", newPassword: "  eight chars  ", repeatPassword: "  eight chars  " };
    expect(parsePasswordChangeForm(form(spaced))).toEqual({
      ok: true,
      data: { oldPassword: " old ", newPassword: "  eight chars  " },
    });
  });

  it("новый пароль короче 8 символов — ошибка", () => {
    const r = parsePasswordChangeForm(form({ ...ok, newPassword: "1234567", repeatPassword: "1234567" }));
    expect(error(r)).toBe("Новый пароль — не короче 8 символов");
  });

  it("повтор не совпадает — ошибка", () => {
    expect(error(parsePasswordChangeForm(form({ ...ok, repeatPassword: "new-password-2" })))).toBe(
      "Новый пароль и его повтор не совпадают",
    );
  });

  it("новый пароль совпадает с текущим — ошибка", () => {
    const same = { oldPassword: "same-password", newPassword: "same-password", repeatPassword: "same-password" };
    expect(error(parsePasswordChangeForm(form(same)))).toBe("Новый пароль совпадает с текущим");
  });

  it("без текущего пароля или с паролем длиннее предела bcrypt — ошибка", () => {
    expect(error(parsePasswordChangeForm(form({ ...ok, oldPassword: "" })))).toBe("Введите текущий пароль");
    // 37 кириллических букв — 74 байта
    const long = "я".repeat(37);
    expect(error(parsePasswordChangeForm(form({ ...ok, newPassword: long, repeatPassword: long })))).toBe(
      "Новый пароль слишком длинный",
    );
  });
});
