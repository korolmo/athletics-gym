// Эфемерные базы превью Лаборатории (ADR 0012): чистые функции — их берут preview-db.mjs и тесты.
// База превью — pr_<номер PR> в том же кластере TiDB; production Лаборатории — база athletics, её не трогаем.

/** Сколько баз превью держим одновременно: больше — удаляем самые старые. */
export const PREVIEW_DB_LIMIT = 20;
const NAME = /^pr_[1-9]\d{0,6}$/;

/** Имя базы превью по номеру PR. Только pr_<число>: больше ничего этот код создавать и удалять не может. */
export function previewDbName(prNumber) {
  const n = String(prNumber).trim();
  if (!/^[1-9]\d{0,6}$/.test(n)) throw new Error(`Номер PR «${n}» — не число`);
  return `pr_${n}`;
}

export function isPreviewDbName(name) {
  return NAME.test(name);
}

/** Тот же адрес TiDB, другая база. Параметры (sslaccept=strict и др.) сохраняются. */
export function withDatabase(url, database) {
  if (database !== "mysql" && !isPreviewDbName(database)) throw new Error(`Отказ: база «${database}» — не база превью`);
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

/**
 * Какие базы превью удалить перед созданием новой, чтобы их стало не больше limit вместе с новой.
 * existing — [{ name, createdAt: Date | null }]; без даты (недосозданная база) считается самой старой.
 * Текущую (keep) не трогаем — её всё равно пересоздаём.
 */
export function databasesToDrop(existing, keep, limit = PREVIEW_DB_LIMIT) {
  const others = existing.filter((d) => isPreviewDbName(d.name) && d.name !== keep);
  const excess = others.length + 1 - limit;
  if (excess <= 0) return [];
  return [...others]
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || a.name.localeCompare(b.name))
    .slice(0, excess)
    .map((d) => d.name);
}
