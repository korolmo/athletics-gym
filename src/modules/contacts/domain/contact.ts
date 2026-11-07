// Обращение: нажатие Посетителя на кнопку связи с залом. Модель, приём и подсчёт — чистые функции.
// Персональных данных нет: ни IP, ни cookies, ни сторонней аналитики. Считаем только нажатия.

/** Канал обращения: чем Посетитель связывается с залом. */
export const CONTACT_CHANNELS = ["whatsapp", "phone", "instagram"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** Источник обращения: место на сайте, где нажали кнопку. */
export const CONTACT_SOURCES = [
  "header",
  "hero",
  "directions",
  "women",
  "prices",
  "trainer",
  "reviews",
  "contacts",
  "footer",
  "mobile-bar",
  "floating",
] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const CONTACT_LOCALES = ["ru", "kk"] as const;

export type ContactInput = { channel: ContactChannel; source: ContactSource; locale: (typeof CONTACT_LOCALES)[number] };

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/** Тело запроса счётчика: принимаются только Канал, Источник и язык из списков; всё остальное отбрасывается. */
export function parseContact(body: unknown): ContactInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { channel, source, locale } = body as Record<string, unknown>;
  if (!includes(CONTACT_CHANNELS, channel) || !includes(CONTACT_SOURCES, source) || !includes(CONTACT_LOCALES, locale)) return null;
  return { channel, source, locale };
}

/** Канал по адресу ссылки: wa.me — WhatsApp, tel: — телефон, instagram.com — Instagram; другое — не кнопка связи. */
export function channelOfHref(href: string): ContactChannel | null {
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return "whatsapp";
  if (/^tel:/i.test(href)) return "phone";
  if (/^https:\/\/(www\.)?instagram\.com\//i.test(href)) return "instagram";
  return null;
}

// ——— Лимит с одного адреса ———

export const CONTACT_RATE = { max: 20, windowMs: 60_000 } as const;

/**
 * Лимит запросов по ключу — в памяти процесса, в базу ничего не пишет.
 * Ключ — хэш адреса: сам адрес нигде не хранится, а хэш живёт не дольше окна лимита.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    /** true — запрос в пределах лимита и учтён; false — лимит исчерпан. */
    allow(key: string, now: number): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Чужие устаревшие записи не копим
      if (hits.size > 5_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      return true;
    },
    size: () => hits.size,
  };
}

export type AcceptResult = "saved" | "invalid" | "limited" | "owner";

/**
 * Приём одного нажатия. Порядок важен: мусор отбрасываем до лимита, лимит — до обращения к сессии и базе.
 * Нажатия Владельца (вошёл в админку и проверяет сайт) не считаются.
 */
export async function acceptContact(
  body: unknown,
  deps: {
    ipHash: string;
    now: number;
    limiter: { allow(key: string, now: number): boolean };
    isOwner: () => Promise<boolean>;
    save: (input: ContactInput) => Promise<void>;
  },
): Promise<AcceptResult> {
  const input = parseContact(body);
  if (!input) return "invalid";
  if (!deps.limiter.allow(deps.ipHash, deps.now)) return "limited";
  if (await deps.isOwner()) return "owner";
  await deps.save(input);
  return "saved";
}

// ——— Подсчёт ———

/** Зал в Кызылорде: сутки считаем по местному времени (UTC+5). */
const GYM_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const STATS_DAYS = 30;

/** День по времени зала в виде «2026-10-10». */
export function gymDay(date: Date): string {
  return new Date(date.getTime() + GYM_OFFSET_MS).toISOString().slice(0, 10);
}

/** С какого момента брать Обращения для сводки: начало дня зала 29 суток назад — всего 30 дней вместе с сегодняшним. */
export function statsSince(now: Date): Date {
  const todayStart = new Date(`${gymDay(now)}T00:00:00.000Z`).getTime() - GYM_OFFSET_MS;
  return new Date(todayStart - (STATS_DAYS - 1) * DAY_MS);
}

export type ContactStats = {
  today: number;
  week: number;
  month: number;
  byChannel: { channel: ContactChannel; count: number }[];
  bySource: { source: string; count: number }[];
  /** 30 дней по порядку, последний — сегодня; дни без Обращений — с нулём */
  days: { day: string; count: number }[];
};

/** Сводка: сегодня, 7 и 30 дней (включая сегодня), разбивка по Каналам и Источникам за 30 дней, ряд по дням. */
export function summarizeContacts(clicks: { channel: string; source: string; createdAt: Date }[], now: Date): ContactStats {
  const since = statsSince(now).getTime();
  const days = Array.from({ length: STATS_DAYS }, (_, i) => ({ day: gymDay(new Date(since + i * DAY_MS)), count: 0 }));
  const index = new Map(days.map((d, i) => [d.day, i]));
  const channels = new Map<string, number>();
  const sources = new Map<string, number>();

  for (const c of clicks) {
    const i = index.get(gymDay(c.createdAt));
    if (i === undefined || c.createdAt.getTime() > now.getTime()) continue;
    days[i].count++;
    channels.set(c.channel, (channels.get(c.channel) ?? 0) + 1);
    sources.set(c.source, (sources.get(c.source) ?? 0) + 1);
  }
  const sum = (lastDays: number) => days.slice(-lastDays).reduce((n, d) => n + d.count, 0);
  return {
    today: sum(1),
    week: sum(7),
    month: sum(STATS_DAYS),
    byChannel: CONTACT_CHANNELS.map((channel) => ({ channel, count: channels.get(channel) ?? 0 })),
    bySource: [...sources].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    days,
  };
}
