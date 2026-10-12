import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import { ATTEMPT_KEEP_MS, MAX_FAILED_ATTEMPTS, evaluateAttempts } from "@/lib/auth/login-limit.rules";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/session";
import { MAX_SUBMISSIONS, REVIEW_LIMITS, SUBMISSION_KEEP_MS, SUBMISSION_WINDOW_MS } from "@/lib/domain/review";
import { toSiteContent } from "@/lib/domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_DATA_LOCATION, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { locales, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";
import { LEGAL_FACTS, ruPlural } from "./facts";
import { COOKIES_ANCHOR, LEGAL_PAGES, LEGAL_UPDATED, formatLegalDate, legalContext, legalDoc, legalDocText, legalHead, legalPath, type LegalDoc } from "./index";

const dictionaries = { ru, kk };
const requisites = {
  legalName: "ИП Иванов Иван Иванович",
  legalBin: "880101300123",
  legalAddress: "г. Кызылорда, ул. Абая, 1",
  privacyEmail: "privacy@athletics-gym.kz",
};

function build(page: (typeof LEGAL_PAGES)[number], locale: Locale, settings = DEFAULT_SETTINGS): LegalDoc {
  const t = dictionaries[locale];
  return legalDoc(page, legalContext(locale, t, toSiteContent(locale, settings, DEFAULT_ABOUT_CARDS)));
}
const text = (doc: LegalDoc) => legalDocText(doc, "");
const hrefs = (doc: LegalDoc) =>
  doc.sections
    .flatMap((s) => s.blocks)
    .flatMap((b) => ("p" in b ? b.p : b.ul.flat()))
    .flatMap((part) => (typeof part === "string" ? [] : [part.href]));

const all = LEGAL_PAGES.flatMap((page) => locales.map((locale) => [page, locale] as const));

describe("страницы privacy и terms на обоих языках", () => {
  it.each(all)("%s /%s: есть заголовок, описание, дата редакции и разделы с текстом", (page, locale) => {
    const doc = build(page, locale);
    expect(doc.title.length).toBeGreaterThan(5);
    expect(doc.description.length).toBeGreaterThan(50);
    expect(doc.updated).toBe(LEGAL_UPDATED[page]);
    expect(doc.sections.length).toBeGreaterThanOrEqual(6);
    for (const section of doc.sections) {
      expect(section.title, section.id).not.toBe("");
      expect(section.blocks.length, section.id).toBeGreaterThan(0);
    }
    // В тексте нет следов пустых подстановок
    expect(text(doc)).not.toMatch(/undefined|null|NaN|\{|\}| {2}| \.|,,/);
  });

  it.each(LEGAL_PAGES)("%s: у русской и казахской версий одни и те же разделы в том же порядке, а текст разный", (page) => {
    const [a, b] = [build(page, "ru"), build(page, "kk")];
    expect(b.sections.map((s) => s.id)).toEqual(a.sections.map((s) => s.id));
    expect(b.sections.map((s) => s.blocks.length)).toEqual(a.sections.map((s) => s.blocks.length));
    expect(b.title).not.toBe(a.title);
    expect(text(b)).not.toBe(text(a));
  });

  it.each(all)("%s /%s: якоря разделов не повторяются — оглавление ведёт куда нужно", (page, locale) => {
    const ids = build(page, locale).sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+$/);
  });

  it("дата редакции — настоящая дата, показывается на языке страницы", () => {
    for (const page of LEGAL_PAGES) expect(new Date(`${LEGAL_UPDATED[page]}T00:00:00.000Z`).toISOString().slice(0, 10)).toBe(LEGAL_UPDATED[page]);
    expect(formatLegalDate("ru", "2026-10-11")).toMatch(/^11 октября 2026/);
    expect(formatLegalDate("kk", "2026-10-11")).toMatch(/2026/);
    expect(formatLegalDate("kk", "2026-10-11")).not.toBe(formatLegalDate("ru", "2026-10-11"));
  });

  it("заголовок страницы для поисковиков — название документа и зала, от Настроек сайта не зависит", () => {
    expect(legalHead("privacy", "ru")).toEqual({ title: "Политика конфиденциальности — Athletic's Gym", description: build("privacy", "ru").description });
    expect(legalHead("terms", "kk").title).toBe(`${build("terms", "kk").title} — Athletic's Gym`);
  });
});

describe("ссылки на документы", () => {
  it("ведут на документ на языке страницы", () => {
    expect(legalPath("ru", "privacy")).toBe("/ru/privacy");
    expect(legalPath("kk", "privacy")).toBe("/kk/privacy");
    expect(legalPath("ru", "terms")).toBe("/ru/terms");
    expect(legalPath("kk", "terms")).toBe("/kk/terms");
  });

  it("у обоих документов в подвале есть название на каждом языке", () => {
    for (const locale of locales) for (const page of LEGAL_PAGES) expect(dictionaries[locale].footer[page].length).toBeGreaterThan(5);
    expect(kk.footer.privacy).not.toBe(ru.footer.privacy);
  });

  it("«Подробнее» в сообщении о cookie ведёт на раздел о cookie, и такой раздел в политике есть", () => {
    for (const locale of locales) {
      expect(legalPath(locale, "privacy", COOKIES_ANCHOR)).toBe(`/${locale}/privacy#cookies`);
      expect(build("privacy", locale).sections.map((s) => s.id)).toContain(COOKIES_ANCHOR);
    }
  });

  it.each(locales)("/%s: соглашение ссылается на политику на том же языке", (locale) => {
    expect(hrefs(build("terms", locale))).toContain(`/${locale}/privacy`);
  });
});

describe("реквизиты и контакты — из Настроек сайта", () => {
  const settings = { ...DEFAULT_SETTINGS, ...requisites };

  it.each(all)("%s /%s: название ИП, ИИН/БИН, юридический адрес и email в тексте", (page, locale) => {
    const doc = build(page, locale, settings);
    for (const value of Object.values(requisites)) expect(text(doc)).toContain(value);
    expect(hrefs(doc)).toContain(`mailto:${requisites.privacyEmail}`);
  });

  it.each(all)("%s /%s: адрес и телефон зала — те же, что в «Контактах»", (page, locale) => {
    const moved = { ...settings, addressRu: "пр. Абая, 10", addressKk: "Абай даңғылы, 10", phone: "+77001234567" };
    const doc = build(page, locale, moved);
    expect(text(doc)).toContain(locale === "kk" ? "Абай даңғылы, 10" : "пр. Абая, 10");
    expect(text(doc)).toContain("+7 700 123 45 67");
    expect(hrefs(doc)).toContain("tel:+77001234567");
    expect(text(doc)).not.toContain(DEFAULT_SETTINGS.addressRu);
  });

  it.each(all)("%s /%s: реквизиты не заполнены — документ всё равно цельный, без пустых мест и без почты", (page, locale) => {
    const doc = build(page, locale);
    expect(text(doc)).not.toMatch(/ИИН\/БИН|ЖСН\/БСН|mailto|@/);
    expect(hrefs(doc).some((h) => h.startsWith("mailto:"))).toBe(false);
    // Кто отвечает за сайт и как связаться, сказано и без реквизитов
    expect(text(doc)).toContain("Athletic's Gym");
    expect(hrefs(doc)).toContain(`tel:${DEFAULT_SETTINGS.phone}`);
  });

  it("сменили реквизиты — сменились оба документа", () => {
    for (const page of LEGAL_PAGES) {
      const doc = build(page, "ru", { ...settings, legalName: "ИП Ахметов Данияр", legalBin: "900202400456" });
      expect(text(doc)).toContain("ИП Ахметов Данияр");
      expect(text(doc)).toContain("900202400456");
      expect(text(doc)).not.toContain(requisites.legalName);
    }
  });

  it("политика: без email просьбу об удалении данных принимают по телефону, с email — по почте", () => {
    const rights = (doc: LegalDoc) => doc.sections.find((s) => s.id === "rights")!;
    const withoutEmail = rights(build("privacy", "ru"));
    expect(legalDocText({ ...build("privacy", "ru"), sections: [withoutEmail] }, "")).toContain("позвоните по номеру +7 771 484 63 44");
    const withEmail = rights(build("privacy", "ru", settings));
    expect(legalDocText({ ...build("privacy", "ru"), sections: [withEmail] }, "")).toContain(`напишите на ${requisites.privacyEmail}`);
  });

  it("место хранения данных — из Настроек: поменяли там, поменялось в политике на обоих языках", () => {
    expect(text(build("privacy", "ru"))).toContain(`Данные хранятся ${DEFAULT_DATA_LOCATION.ru}.`);
    expect(text(build("privacy", "kk"))).toContain(`Деректер ${DEFAULT_DATA_LOCATION.kk} сақталады.`);
    const moved = { ...DEFAULT_SETTINGS, dataLocationRu: "на серверах в Республике Казахстан", dataLocationKk: "Қазақстан Республикасындағы серверлерде" };
    expect(text(build("privacy", "ru", moved))).toContain("Данные хранятся на серверах в Республике Казахстан.");
    expect(text(build("privacy", "kk", moved))).toContain("Деректер Қазақстан Республикасындағы серверлерде сақталады.");
    expect(text(build("privacy", "ru", moved))).not.toContain(DEFAULT_DATA_LOCATION.ru);
  });
});

describe("политика говорит то же, что делает код", () => {
  const privacy = text(build("privacy", "ru"));
  const terms = text(build("terms", "ru"));

  it("числа в документах взяты из констант кода", () => {
    expect(LEGAL_FACTS).toMatchObject({
      reviewsPerDay: MAX_SUBMISSIONS,
      reviewTextMin: REVIEW_LIMITS.textMin,
      reviewTextMax: REVIEW_LIMITS.textMax,
      submissionKeepDays: SUBMISSION_KEEP_MS / 86_400_000,
      loginKeepDays: ATTEMPT_KEEP_MS / 86_400_000,
      localeCookie: LOCALE_COOKIE,
      localeCookieYears: LOCALE_COOKIE_MAX_AGE_SEC / (365 * 86_400),
      sessionCookie: SESSION_COOKIE,
      sessionCookieDays: SESSION_MAX_AGE_SEC / 86_400,
    });
    // Сроки называются целыми сутками, днями и годами — дробных в тексте быть не должно
    for (const n of [LEGAL_FACTS.submissionKeepDays, LEGAL_FACTS.loginKeepDays, LEGAL_FACTS.localeCookieYears, LEGAL_FACTS.sessionCookieDays]) {
      expect(Number.isInteger(n) && n >= 1, String(n)).toBe(true);
    }
  });

  it("лимит отзывов считается за сутки — так и написано", () => {
    expect(SUBMISSION_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
    expect(privacy).toContain(`не больше ${MAX_SUBMISSIONS} отзывов в сутки`);
    expect(terms).toContain(`не больше ${MAX_SUBMISSIONS} отзывов в сутки`);
    expect(terms).toContain(`от ${REVIEW_LIMITS.textMin} до ${REVIEW_LIMITS.textMax} символов`);
  });

  it("сроки хранения: хэши адресов, cookie языка и сессии — как в коде", () => {
    expect(privacy).toContain(`Записи старше ${SUBMISSION_KEEP_MS / 86_400_000} суток удаляются автоматически, когда на сайт приходит следующий отзыв`);
    expect(ATTEMPT_KEEP_MS).toBe(24 * 60 * 60 * 1000);
    expect(privacy).toContain("Остальные записи старше суток удаляются при следующей неудачной попытке входа");
    expect(privacy).toContain(`Cookie языка — 1 год, cookie сессии владельца — ${SESSION_MAX_AGE_SEC / 86_400} дней`);
  });

  it("cookie названы настоящими именами, и других cookie в политике нет", () => {
    const cookies = build("privacy", "ru").sections.find((s) => s.id === COOKIES_ANCHOR)!;
    const list = cookies.blocks.flatMap((b) => ("ul" in b ? b.ul : [])).map((item) => item.join(""));
    expect(list).toHaveLength(2);
    expect(list[0].startsWith(`${LOCALE_COOKIE} —`)).toBe(true);
    expect(list[1].startsWith(`${SESSION_COOKIE} —`)).toBe(true);
  });

  it("в политике названо всё, что сайт хранит и куда обращается", () => {
    for (const fact of [
      "имя, которое вы указали, оценку, текст и зал",
      "время вашего согласия на обработку данных",
      "хэш адреса",
      "канал связи, место кнопки на странице, язык страницы и время",
      "без ограничения срока",
      "localStorage",
      "OpenStreetMap",
      "только после нажатия «Показать карту»",
      "Телефон и почту не спрашиваем",
      "Рекламных и аналитических cookie нет",
    ]) {
      expect(privacy, fact).toContain(fact);
    }
  });

  it("место хранения по умолчанию названо прямо, а о хостинг-провайдерах сказано и в разделе о передаче данных", () => {
    expect(DEFAULT_DATA_LOCATION.ru).toBe("на серверах Vercel и Supabase в Германии (ЕС)");
    const section = (id: string, locale: Locale) => legalDocText({ ...build("privacy", locale), sections: build("privacy", locale).sections.filter((s) => s.id === id) }, "");
    expect(section("storage", "ru")).toContain("Данные хранятся на серверах Vercel и Supabase в Германии (ЕС).");
    expect(section("sharing", "ru")).toContain("хранят данные по нашему поручению");
    expect(section("sharing", "kk")).toContain("біздің тапсырмамыз бойынша");
    for (const locale of locales) expect(hrefs(build("privacy", locale))).toContain("#storage");
  });

  it("разделы политики идут по порядку: «Как мы защищаем данные» — сразу после «Где хранятся данные»", () => {
    for (const locale of locales) {
      expect(build("privacy", locale).sections.map((s) => s.id)).toEqual([
        "operator",
        "data",
        "retention",
        "storage",
        "security",
        "sharing",
        "messengers",
        "rights",
        COOKIES_ANCHOR,
        "changes",
      ]);
    }
  });

  it("основание обработки отзыва — согласие; ссылка ведёт на раздел о правах", () => {
    expect(privacy).toContain(
      "Данные отзыва обрабатываются на основании вашего согласия, которое вы даёте галочкой в форме отзыва. Согласие можно отозвать — см. раздел «Ваши права».",
    );
    for (const locale of locales) expect(hrefs(build("privacy", locale))).toContain("#rights");
  });

  describe("«Как мы защищаем данные»: каждое утверждение — правда о коде", () => {
    const security = build("privacy", "ru").sections.find((s) => s.id === "security")!;
    const claims = security.blocks.flatMap((b) => ("ul" in b ? b.ul.map((item) => item.join("")) : []));
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

    it("в разделе четыре утверждения", () => {
      expect(claims).toEqual([
        "Сайт работает только по защищённому соединению (HTTPS).",
        "Вход в панель управления — только по паролю, число попыток входа ограничено.",
        "IP-адреса в базе не хранятся — только их хэши, по которым адрес не восстановить.",
        "Пароли и ключи доступа к панели управления, серверам и базе данных есть только у владельца зала и у тех, кто по его поручению обслуживает сайт.",
      ]);
    });

    it("HTTPS: сайт велит браузеру ходить только по защищённому соединению (HSTS), а кука сессии в production — только по HTTPS", () => {
      expect(fs.readFileSync("next.config.mjs", "utf8")).toMatch(/Strict-Transport-Security", value: "max-age=\d{8,}/);
      expect(fs.readFileSync("src/lib/auth/index.ts", "utf8")).toContain('secure: process.env.NODE_ENV === "production"');
    });

    it("число попыток входа ограничено: после лимита неудач вход закрыт", () => {
      const now = new Date("2026-10-12T10:00:00Z");
      const failures = (n: number) => Array.from({ length: n }, (_, i) => new Date(now.getTime() - i * 1000));
      expect(evaluateAttempts(failures(MAX_FAILED_ATTEMPTS - 1), now).blocked).toBe(false);
      expect(evaluateAttempts(failures(MAX_FAILED_ATTEMPTS), now).blocked).toBe(true);
    });

    it("в базе нет колонок с IP-адресом — только хэш", () => {
      const columns = [...schema.matchAll(/^\s{2}(\w+)\s+\w/gm)].map((m) => m[1]);
      const aboutIp = columns.filter((c) => /^ip([A-Z]|$)|I[Pp]([A-Z]|$)/.test(c));
      expect([...new Set(aboutIp)]).toEqual(["ipHash"]);
      // Хэш считается с секретом: без него по хэшу адрес не подобрать
      expect(fs.readFileSync("src/lib/auth/login-limit.ts", "utf8")).toContain('createHmac("sha256", process.env.AUTH_SECRET');
    });
  });

  it("соглашение: материалы принадлежат залу или используются с разрешения правообладателей", () => {
    expect(terms).toContain(
      "Тексты, логотипы и фотографии на сайте принадлежат залу или используются с разрешения правообладателей. Копировать и использовать их без согласия зала нельзя.",
    );
  });

  it("дата редакции обоих документов — 12 октября 2026; она же записывается в Отзыв", () => {
    expect(LEGAL_UPDATED).toEqual({ privacy: "2026-10-12", terms: "2026-10-12" });
    expect(formatLegalDate("ru", LEGAL_UPDATED.privacy)).toMatch(/^12 октября 2026/);
    expect(build("privacy", "kk").updated).toBe(LEGAL_UPDATED.privacy);
    // Сервис берёт дату из той же константы, своей копии у него нет
    const service = fs.readFileSync("src/lib/services/reviews.ts", "utf8");
    expect(service).toContain("consentPolicyDate: LEGAL_UPDATED.privacy");
    expect(fs.readdirSync("src", { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts")).filter((f) => /"2026-10-1[12]"/.test(fs.readFileSync(`src/${f}`, "utf8"))).map((f) => f.replace(/\\/g, "/"))).toEqual(["lib/legal/meta.ts"]);
  });

  it("о том, у кого есть доступ, сказано один раз — в разделе о защите; в «Где хранятся данные» — только место и журналы", () => {
    for (const locale of locales) {
      const storage = build("privacy", locale).sections.find((s) => s.id === "storage")!;
      expect(storage.blocks).toHaveLength(2);
    }
    const storage = legalDocText({ ...build("privacy", "ru"), sections: build("privacy", "ru").sections.filter((s) => s.id === "storage") }, "");
    expect(storage).toContain(`Данные хранятся ${DEFAULT_DATA_LOCATION.ru}.
Хостинг-провайдеры`);
    expect(storage).not.toMatch(/Доступ|владельца/);
    expect(privacy.split("по его поручению обслуживает сайт")).toHaveLength(2);
  });

  it("срок ответа на обращение — по закону, без своего числа дней", () => {
    expect(privacy).toContain("Ответим в сроки, установленные законодательством Республики Казахстан.");
    expect(privacy).not.toMatch(/рабочих дн|рабочего дня/);
    expect(text(build("privacy", "kk"))).not.toMatch(/жұмыс күні/);
  });

  it("и нет того, чего сайт не делает", () => {
    for (const absent of [/регистрац(ия|ии) на сайте (есть|обязательна)/i, /Google Analytics|Яндекс\.?Метрик|Facebook Pixel/i, /рассылк/i, /оплат[аы] (картой|онлайн)/i, /паспорт|ИИН посетителя/i]) {
      expect(privacy).not.toMatch(absent);
    }
    // Сам IP-адрес сайт не хранит — политика не должна обещать обратное
    expect(privacy).toContain("в базу его не записывает");
  });

  it("соглашение: не оферта, запись и оплата — не через сайт, правила отзывов, здоровье, права на материалы", () => {
    for (const fact of [
      "не являются публичной офертой (статья 395 Гражданского кодекса Республики Казахстан)",
      "Оплатить абонемент или записаться через сайт нельзя",
      "WhatsApp",
      "оскорблений",
      "рекламы",
      "ссылок",
      "чужих персональных данных",
      "вправе не публиковать отзыв, скрыть его или удалить",
      "проконсультироваться с врачом",
      "технику безопасности",
      "принадлежат залу",
    ]) {
      expect(terms, fact).toContain(fact);
    }
  });

  it("русские числительные склоняются", () => {
    const year = ["год", "года", "лет"] as const;
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => ruPlural(n, year))).toEqual(["год", "года", "лет", "лет", "год", "года", "лет"]);
  });
});
