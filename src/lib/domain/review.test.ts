import { describe, expect, it } from "vitest";
import { issueFormToken, readFormToken } from "@/lib/reviews/form-token";
import { parseOwnerReviewForm, parseVisitorReview } from "@/lib/validation/review";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import {
  FORM_TOKEN_MAX_AGE_MS,
  MAX_SUBMISSIONS,
  MIN_FILL_MS,
  SUBMISSION_WINDOW_MS,
  checkSubmission,
  containsLink,
  isSafeSourceUrl,
  normalizeSourceUrl,
  parseReviewDate,
  todayInGym,
} from "./review";
import { BLOCKS } from "./site-settings";

const NOW = new Date("2026-10-10T09:00:00Z");
const SECRET = "test-secret-test-secret-test-secret-0123456789";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("ссылки в отзыве", () => {
  it.each([
    "Заходите на http://spam.example",
    "лучший зал https://t.me/spamchannel",
    "www.casino.com — выигрывай",
    "подробности на spam-site.kz",
    "пишите в t.me/spammer",
    "wa.me/77001112233",
    "ЗАРАБОТОК: BIT.LY/xyz",
    "мойсайт.рф лучше",
    "заходи: example.com.",
    "instagram.com/spam",
  ])("«%s» — со ссылкой", (text) => {
    expect(containsLink(text)).toBe(true);
  });

  it.each([
    "Отличный зал, хожу с 2022 года. Тренеры внимательные!",
    "Работают с 08:00 до 23:00, и т.д. — очень удобно",
    "Оценка 5.0, цена 15.000 тенге",
    "Тренер Нұрмахан — лучший. Спасибо!",
    "Занимаюсь 3р. в нед., результат есть",
    "Зал Athletic's Gym на Бейбарса, 2а",
    "Хороший зал.Рекомендую всем",
    "Күшті зал. Рақмет!",
  ])("«%s» — обычный текст", (text) => {
    expect(containsLink(text)).toBe(false);
  });
});

describe("отзыв Посетителя из формы сайта", () => {
  const ok = { authorName: " Айгерим ", rating: "5", text: "  Отличный зал, хожу второй год.  ", hallId: "" };

  it("имя, оценка, текст; Зал по желанию; пробелы по краям убираются", () => {
    expect(parseVisitorReview(form(ok))).toEqual({
      ok: true,
      data: { authorName: "Айгерим", rating: 5, text: "Отличный зал, хожу второй год.", hallId: null },
    });
    expect(parseVisitorReview(form({ ...ok, hallId: "women" }))).toMatchObject({ ok: true, data: { hallId: "women" } });
  });

  it("лишние поля (телефон, почта, статус, источник) не принимаются", () => {
    const r = parseVisitorReview(form({ ...ok, phone: "+77001112233", email: "a@b.c", status: "PUBLISHED", source: "TWOGIS", fromVisitor: "false" }));
    expect(r.ok && Object.keys(r.data).sort()).toEqual(["authorName", "hallId", "rating", "text"]);
  });

  it.each([
    ["пустое имя", { authorName: "  " }, "name"],
    ["имя длиннее 50", { authorName: "я".repeat(51) }, "nameLong"],
    ["ссылка в имени", { authorName: "spam.example" }, "link"],
    ["нет оценки", { rating: "" }, "rating"],
    ["оценка 0", { rating: "0" }, "rating"],
    ["оценка 6", { rating: "6" }, "rating"],
    ["оценка дробная", { rating: "4.5" }, "rating"],
    ["текст короче 10", { text: "Супер зал" }, "textShort"],
    ["текст длиннее 1000", { text: "я".repeat(1001) }, "textLong"],
    ["ссылка в тексте", { text: "Хороший зал, но лучше https://spam.example" }, "link"],
    ["домен без http", { text: "Заходите на spam-site.kz, там дешевле" }, "link"],
    ["Зал не из списка", { hallId: "vip" }, "hall"],
  ])("%s — ошибка «%s»", (_name, patch, code) => {
    expect(parseVisitorReview(form({ ...ok, ...patch }))).toEqual({ ok: false, error: code });
  });

  it("границы: имя 50, текст 10 и 1000 символов — принимаются", () => {
    expect(parseVisitorReview(form({ ...ok, authorName: "я".repeat(50) })).ok).toBe(true);
    expect(parseVisitorReview(form({ ...ok, text: "я".repeat(10) })).ok).toBe(true);
    expect(parseVisitorReview(form({ ...ok, text: "я".repeat(1000) })).ok).toBe(true);
  });

  it("разметка в тексте остаётся текстом: её не вырезаем и не исполняем", () => {
    const text = '<script>alert(1)</script> <b>зал</b> отличный "очень"';
    expect(parseVisitorReview(form({ ...ok, text }))).toMatchObject({ ok: true, data: { text } });
  });

  it("у каждого кода ошибки есть текст на обоих языках", () => {
    for (const code of ["name", "nameLong", "rating", "textShort", "textLong", "link", "hall", "tooFast", "stale", "limit", "unavailable"] as const) {
      expect(ru.reviews.errors[code], code).toBeTruthy();
      expect(kk.reviews.errors[code], code).toBeTruthy();
    }
    expect(ru.reviews.form.thanks).toBe("Спасибо! Отзыв появится после проверки.");
  });
});

describe("ссылка на оригинал отзыва: только https", () => {
  it.each([
    ["https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews", "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews"],
    [" https://www.instagram.com/p/abc123/ ", "https://www.instagram.com/p/abc123/"],
    ["https://maps.app.goo.gl/xyz?g_st=ic", "https://maps.app.goo.gl/xyz?g_st=ic"],
    ["HTTPS://Example.com/Отзыв", "https://example.com/%D0%9E%D1%82%D0%B7%D1%8B%D0%B2"],
  ])("%s — принимаем", (raw, url) => {
    expect(normalizeSourceUrl(raw)).toBe(url);
    expect(isSafeSourceUrl(url)).toBe(true);
  });

  it.each([
    "",
    "http://2gis.kz/review",
    "2gis.kz/review",
    "//2gis.kz/review",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/x",
    "https://",
    "https://localhost/x",
    "https://user:pass@example.com/x",
    "https://example.com/a b",
    "https://example.com/x\njavascript:alert(1)",
    "mailto:owner@example.com",
  ])("«%s» — не принимаем", (raw) => {
    expect(normalizeSourceUrl(raw)).toBeNull();
    expect(isSafeSourceUrl(raw)).toBe(false);
  });

  it("на сайт идёт только то, что прошло бы форму: значение из базы проверяется ещё раз", () => {
    expect(isSafeSourceUrl(null)).toBe(false);
    expect(isSafeSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeSourceUrl("http://example.com/")).toBe(false);
    expect(isSafeSourceUrl("https://example.com/review")).toBe(true);
  });
});

describe("отзыв, который Владелец добавляет вручную", () => {
  const ok = {
    id: "",
    authorName: "Данияр",
    text: "Топ зал!",
    rating: "5",
    hallId: "general",
    source: "TWOGIS",
    sourceUrl: "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews",
    reviewedAt: "2026-09-30",
    isVisible: "on",
  };
  const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

  it("ручной отзыв сразу опубликован; короткий текст допустим", () => {
    expect(parseOwnerReviewForm(form(ok), NOW)).toEqual({
      ok: true,
      data: {
        id: null,
        authorName: "Данияр",
        text: "Топ зал!",
        rating: 5,
        hallId: "general",
        source: "TWOGIS",
        sourceUrl: "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews",
        reviewedAt: new Date("2026-09-30T00:00:00.000Z"),
        status: "PUBLISHED",
      },
    });
  });

  it("галочка снята — отзыв скрыт; Зал и ссылка необязательны", () => {
    const hidden = Object.fromEntries(Object.entries(ok).filter(([name]) => name !== "isVisible"));
    const r = parseOwnerReviewForm(form({ ...hidden, hallId: "", sourceUrl: "" }), NOW);
    expect(r).toMatchObject({ ok: true, data: { status: "HIDDEN", hallId: null, sourceUrl: null } });
  });

  it("статус «Новый» Владелец задать не может", () => {
    const r = parseOwnerReviewForm(form({ ...ok, status: "NEW" }), NOW);
    expect(r.ok && r.data.status).toBe("PUBLISHED");
  });

  it.each([
    ["http вместо https", { sourceUrl: "http://2gis.kz/review" }, /https/],
    ["javascript:", { sourceUrl: "javascript:alert(1)" }, /https/],
    ["неизвестный источник", { source: "YANDEX" }, /источник/],
    ["оценка 6", { rating: "6" }, /Оценка/],
    ["пустой текст", { text: "" }, /текст/],
    ["имя длиннее 50", { authorName: "я".repeat(51) }, /Имя автора/],
    ["дата из будущего", { reviewedAt: "2026-12-01" }, /Дата отзыва/],
    ["не дата", { reviewedAt: "вчера" }, /Дата отзыва/],
    ["несуществующий день", { reviewedAt: "2026-02-30" }, /Дата отзыва/],
  ])("%s — ошибка", (_name, patch, message) => {
    expect(error(parseOwnerReviewForm(form({ ...ok, ...patch }), NOW))).toMatch(message);
  });

  it("дата: сегодня по времени зала подходит", () => {
    expect(parseReviewDate("2026-10-10", NOW)).toEqual(new Date("2026-10-10T00:00:00.000Z"));
    // 22:00 UTC 9 октября — в Кызылорде уже 10-е
    expect(todayInGym(new Date("2026-10-09T22:00:00Z"))).toEqual(new Date("2026-10-10T00:00:00.000Z"));
    expect(parseReviewDate("2026-10-10", new Date("2026-10-09T22:00:00Z"))).not.toBeNull();
  });
});

describe("антиспам: ловушка и время заполнения", () => {
  const human = { honeypot: "", elapsedMs: 20_000, recent: [] as Date[] };

  it("человек: ловушка пуста, прошло больше трёх секунд — принимаем", () => {
    expect(checkSubmission(human, NOW)).toEqual({ verdict: "accept" });
    expect(checkSubmission({ ...human, elapsedMs: MIN_FILL_MS }, NOW)).toEqual({ verdict: "accept" });
  });

  it("ловушка заполнена — «trap», что бы ни было с остальным", () => {
    expect(checkSubmission({ ...human, honeypot: "http://spam.example" }, NOW)).toEqual({ verdict: "trap" });
    expect(checkSubmission({ honeypot: "x", elapsedMs: 10, recent: [NOW, NOW, NOW, NOW] }, NOW)).toEqual({ verdict: "trap" });
  });

  it("пробелы в ловушке — не заполнение", () => {
    expect(checkSubmission({ ...human, honeypot: "   " }, NOW)).toEqual({ verdict: "accept" });
  });

  it("быстрее трёх секунд — не принимаем", () => {
    expect(checkSubmission({ ...human, elapsedMs: MIN_FILL_MS - 1 }, NOW)).toEqual({ verdict: "too-fast" });
    expect(checkSubmission({ ...human, elapsedMs: 0 }, NOW)).toEqual({ verdict: "too-fast" });
  });

  it("метки времени нет, она подделана или старше суток — просим обновить страницу", () => {
    expect(checkSubmission({ ...human, elapsedMs: null }, NOW)).toEqual({ verdict: "stale" });
    expect(checkSubmission({ ...human, elapsedMs: FORM_TOKEN_MAX_AGE_MS + 1 }, NOW)).toEqual({ verdict: "stale" });
  });
});

describe("метка времени формы", () => {
  const t0 = 1_800_000_000_000;

  it("сервер видит, сколько прошло с выдачи страницы", () => {
    const token = issueFormToken(SECRET, t0);
    expect(readFormToken(token, SECRET, t0 + 5_000)).toBe(5_000);
    expect(readFormToken(token, SECRET, t0)).toBe(0);
  });

  it("сдвинуть время назад, не зная секрета, нельзя", () => {
    const token = issueFormToken(SECRET, t0);
    const forged = token.replace(String(t0), String(t0 - 60_000));
    expect(readFormToken(forged, SECRET, t0 + 100)).toBeNull();
    expect(readFormToken(issueFormToken("another-secret-another-secret-another-0123", t0), SECRET, t0 + 5_000)).toBeNull();
  });

  it.each(["", "garbage", "1800000000000", "1800000000000.zz", `${1_800_000_000_000}.${"0".repeat(64)}`])("«%s» — не метка", (token) => {
    expect(readFormToken(token, SECRET, t0 + 5_000)).toBeNull();
  });

  it("метка из будущего не принимается", () => {
    expect(readFormToken(issueFormToken(SECRET, t0 + 10_000), SECRET, t0)).toBeNull();
  });
});

describe("лимит отправок с одного адреса", () => {
  const ago = (ms: number) => new Date(NOW.getTime() - ms);
  const HOUR = 60 * 60 * 1000;
  const base = { honeypot: "", elapsedMs: 20_000 };

  it("три отзыва за сутки — можно, четвёртый — нельзя", () => {
    expect(MAX_SUBMISSIONS).toBe(3);
    expect(checkSubmission({ ...base, recent: [ago(HOUR), ago(2 * HOUR)] }, NOW)).toEqual({ verdict: "accept" });
    expect(checkSubmission({ ...base, recent: [ago(HOUR), ago(2 * HOUR), ago(3 * HOUR)] }, NOW)).toEqual({ verdict: "limit" });
  });

  it("отправки старше суток не считаются", () => {
    const recent = [ago(HOUR), ago(2 * HOUR), ago(SUBMISSION_WINDOW_MS + 1000)];
    expect(checkSubmission({ ...base, recent }, NOW)).toEqual({ verdict: "accept" });
  });
});

describe("блок «Отзывы» на главной", () => {
  it("входит в Блоки, которые Владелец может скрыть", () => {
    expect(BLOCKS).toContain("reviews");
  });
});
