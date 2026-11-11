// Адреса Клубов (этап П2, ADR 0021): какой Клуб открывается по адресу запроса. Чистый код без базы —
// его вызывает middleware. Карта адресов — переменная окружения CLUB_HOSTS («адрес=idКлуба,…»).

import { CLUB_ID } from "./club";

/** id Клуба: латиница, цифры, дефис; без «--» — это разделитель в адресах превью. */
const CLUB_ID_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-))*$/;
/** Адрес: имя хоста без порта и пути. */
const HOST_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

export type ClubHosts = {
  /** адрес → id Клуба */
  byHost: ReadonlyMap<string, string>;
  /** id Клуба → его адреса в порядке записи; первый — основной */
  byClub: ReadonlyMap<string, readonly string[]>;
  /** Записи, которые не разобраны (неправильный адрес или id, повтор адреса) — для лога, не для ошибки запуска */
  rejected: readonly string[];
};

export function isClubId(value: string): boolean {
  return value.length <= 40 && CLUB_ID_RE.test(value);
}

/** Имя хоста из заголовка Host: нижний регистр, без порта и точки в конце. Неправильный — null. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const host = raw.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return host.length <= 253 && HOST_RE.test(host) ? host : null;
}

/**
 * CLUB_HOSTS → карта адресов. Записи через запятую или с новой строки, «адрес=idКлуба»; пробелы не важны.
 * Адрес, который уже занят, второй раз не принимается (первая запись побеждает).
 */
export function parseClubHosts(raw: string | undefined): ClubHosts {
  const byHost = new Map<string, string>();
  const byClub = new Map<string, string[]>();
  const rejected: string[] = [];
  for (const entry of (raw ?? "").split(/[,\n]/)) {
    const text = entry.trim();
    if (!text) continue;
    const eq = text.indexOf("=");
    const host = eq > 0 ? normalizeHost(text.slice(0, eq)) : null;
    const id = eq > 0 ? text.slice(eq + 1).trim() : "";
    if (!host || !isClubId(id) || byHost.has(host)) {
      rejected.push(text);
      continue;
    }
    byHost.set(host, id);
    byClub.set(id, [...(byClub.get(id) ?? []), host]);
  }
  return { byHost, byClub, rejected };
}

/** Клубы, которые знает карта, и Клуб по умолчанию. Только их выбирает адрес превью — набор сегментов кэша конечен. */
export function knownClubIds(hosts: ClubHosts): Set<string> {
  return new Set([CLUB_ID, ...hosts.byClub.keys()]);
}

/**
 * Клуб по адресу запроса.
 * 1. Адрес есть в карте — его Клуб.
 * 2. Только вне production: первая часть адреса — «<id>» или «<id>--…» известного Клуба
 *    (`iron--pr-12-athletics-lab.vercel.app`, `iron.localhost`).
 * 3. Иначе — Клуб по умолчанию (`club`); без CLUB_HOSTS так открывается любой адрес (боевой сайт).
 */
export function clubForHost(rawHost: string | null | undefined, hosts: ClubHosts, opts: { production: boolean }): string {
  const host = normalizeHost(rawHost);
  if (!host) return CLUB_ID;
  const exact = hosts.byHost.get(host);
  if (exact) return exact;
  if (!opts.production) {
    const label = host.split(".")[0];
    const sep = label.indexOf("--");
    const id = sep > 0 ? label.slice(0, sep) : host.includes(".") ? label : "";
    if (id && knownClubIds(hosts).has(id)) return id;
  }
  return CLUB_ID;
}

/** Основной адрес Клуба — первый его адрес в карте; нет адресов — null. */
export function primaryHost(clubId: string, hosts: ClubHosts): string | null {
  return hosts.byClub.get(clubId)?.[0] ?? null;
}

/**
 * Адрес сайта Клуба для поиска (canonical, sitemap, JSON-LD): `https://<основной адрес>`;
 * адреса нет — `fallback` (SITE_URL, как до П2).
 */
export function clubSiteUrl(clubId: string, hosts: ClubHosts, fallback: string): string {
  const host = primaryHost(clubId, hosts);
  return host ? `https://${host}` : fallback;
}

export function readClubHosts(env: Record<string, string | undefined> = process.env): ClubHosts {
  return parseClubHosts(env.CLUB_HOSTS);
}
