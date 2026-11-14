// Защита от случайного запуска разрушительных команд на боевой базе.
// Чистые функции без зависимостей: используются в prisma/seed.ts, prisma/seed-lab.ts и в тестах.

/** Флаг, которым осознанно разрешают seed на боевой базе; его передаёт `npm run seed:force-production`. */
export const FORCE_PRODUCTION_FLAG = "--force-production";

export type SeedDecision = { allowed: true; production: boolean } | { allowed: false; reason: string };

/**
 * Можно ли запускать seed: на боевой базе — только с флагом. Боевая база — на хостинге hoster.kz, там задано
 * APP_ENV=production (ADR 0004); снаружи она недоступна. Проверку по строке прежней боевой Supabase убрала уборка
 * этапа 8 (15 ноября 2026): та база на паузе, а схема теперь MySQL — Prisma к ней не подключится.
 */
export function decideSeed(env: { APP_ENV?: string }, argv: readonly string[]): SeedDecision {
  if (env.APP_ENV !== "production") return { allowed: true, production: false };
  if (argv.includes(FORCE_PRODUCTION_FLAG)) return { allowed: true, production: true };
  return {
    allowed: false,
    reason:
      `Отказ: это боевая база — APP_ENV=production.\n` +
      `Seed удаляет все Залы, Тарифы и Тренеров, заводит их заново из прайса и возвращает Настройки сайта к начальным.\n` +
      `Если это действительно нужно: npm run seed:force-production (передаёт ${FORCE_PRODUCTION_FLAG}).`,
  };
}
