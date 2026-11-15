import "server-only";
import { after } from "next/server";
import { guestLoginEnabled } from "@/modules/owner";
import { runDailyDemoReset } from "@/modules/demo";
import { CLUB_ID } from "@/modules/club/client";
import { revalidateSite } from "@/app/admin/revalidate";
import { logError } from "@/lib/observability/log";

// Попутный суточный сброс демо-админки (этап П1, решение 11, ADR 0019) — как попутная отправка уведомлений
// (outbox-kick.ts): планировщику не доверяем, сброс запускается после ответа на запросы, которые и так идут —
// /api/health/ready (UptimeRobot, каждые 5 минут), страницы кабинета и админки. Только там, где работает гостевой
// вход (Лаборатория с GUEST_DEMO=1); чаще раза в минуту на экземпляр не проверяем — проверка: один запрос к базе.

export const DEMO_KICK_GAP_MS = 60_000;
let lastKick = 0;

export function kickDemoReset({ now = Date.now(), env = process.env }: { now?: number; env?: Record<string, string | undefined> } = {}): boolean {
  if (!guestLoginEnabled(env)) return false;
  if (now - lastKick < DEMO_KICK_GAP_MS) return false;
  lastKick = now;
  after(async () => {
    try {
      // Сброс — у каждого Клуба свой (решение 16); до второго Клуба — Клуб по умолчанию
      const r = await runDailyDemoReset(CLUB_ID);
      // Сайт статический с ревалидацией: без этого сброшенный бренд появился бы только через час
      if (r.ran && !r.snapshotTaken) revalidateSite();
    } catch (e) {
      logError("Демо Лаборатории: попутный сброс не удался.", e);
    }
  });
  return true;
}
