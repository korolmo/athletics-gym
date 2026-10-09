// Защита от случайного запуска разрушительных команд на боевой базе.
// Чистые функции без зависимостей: используются в prisma/seed.ts и в тестах.

/** Боевая база: проект Supabase во Франкфурте. */
export const PRODUCTION_DB = { projectRef: "vrvupsqjhyhghgikboif", region: "eu-central-1" } as const;

/** Флаг, которым осознанно разрешают seed на боевой базе; его передаёт `npm run seed:force-production`. */
export const FORCE_PRODUCTION_FLAG = "--force-production";

/**
 * Указывает ли строка подключения на боевую базу.
 * Проект узнаём по ссылке в имени пользователя (`postgres.<ref>` у пулера) или в хосте
 * (`db.<ref>.supabase.co` у прямого подключения); регион — по хосту пулера.
 */
export function isProductionDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const user = decodeURIComponent(parsed.username).toLowerCase();
  const host = parsed.hostname.toLowerCase();
  const { projectRef, region } = PRODUCTION_DB;

  const directHost = host === `db.${projectRef}.supabase.co`;
  const poolerOfProject = user === `postgres.${projectRef}` && host.includes(region);
  return directHost || poolerOfProject;
}

export type SeedDecision = { allowed: true; production: boolean } | { allowed: false; reason: string };

/** Можно ли запускать seed: на боевой базе — только с флагом. Проверяются обе строки подключения. */
export function decideSeed(env: { DATABASE_URL?: string; DIRECT_URL?: string }, argv: readonly string[]): SeedDecision {
  const production = isProductionDatabaseUrl(env.DATABASE_URL) || isProductionDatabaseUrl(env.DIRECT_URL);
  if (!production) return { allowed: true, production: false };
  if (argv.includes(FORCE_PRODUCTION_FLAG)) return { allowed: true, production: true };
  return {
    allowed: false,
    reason:
      `Отказ: строка подключения указывает на боевую базу (${PRODUCTION_DB.region}, проект ${PRODUCTION_DB.projectRef}).\n` +
      `Seed удаляет все Залы, Тарифы и Тренеров, заводит их заново из прайса и возвращает Настройки сайта к начальным.\n` +
      `Если это действительно нужно: npm run seed:force-production (передаёт ${FORCE_PRODUCTION_FLAG}).`,
  };
}
