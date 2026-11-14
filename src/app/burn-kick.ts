import "server-only";
import { after } from "next/server";
import { deliverAlerts, raiseAlerts, resolveAlertSender } from "@/modules/notifications";
import { fetchSloChecks } from "@/lib/monitor/slo-checks";
import { logError, log } from "@/lib/observability/log";
import {
  ALERT_REPEAT_MS,
  BLIND_REPEAT_MS,
  BURN_CHECK_GAP_MS,
  FETCH_LOOKBACK_MS,
  RECOVERY_LOOKBACK_MS,
  alertThreshold,
  evaluateBurn,
} from "../../scripts/monitor/burn-alerts.mjs";

// Попутная проверка выгорания бюджета ошибок (этап 5, ADR 0028), как попутная отправка уведомлений и сброс демо:
// планировщику не доверяем — после ответа /api/health/ready (его UptimeRobot дёргает каждые 5 минут), не чаще раза
// в 15 минут на экземпляр. Только production Лаборатории: превью и прод не мониторятся (ADR 0005), а адреса
// мониторов UptimeRobot — адреса production Лаборатории. Нужны ключ UptimeRobot «только чтение» и чат «Дежурство».

/** Адрес production Лаборатории — тот же, что у мониторов (scripts/monitor/uptimerobot-setup.mjs). */
export const LAB_URL = "https://athletics-gym-lab.vercel.app";

let lastKick = 0;

export function burnCheckEnabled(env: Record<string, string | undefined>): boolean {
  return env.APP_ENV?.trim() === "lab" && env.VERCEL_ENV?.trim() === "production" && !!env.UPTIMEROBOT_READ_KEY?.trim() && resolveAlertSender(env) !== null;
}

export function kickBurnCheck({ now = Date.now(), env = process.env }: { now?: number; env?: Record<string, string | undefined> } = {}): boolean {
  if (!burnCheckEnabled(env)) return false;
  if (now - lastKick < BURN_CHECK_GAP_MS) return false;
  lastKick = now;
  const key = env.UPTIMEROBOT_READ_KEY!.trim();
  after(async () => {
    try {
      let apiFailed = false;
      const checks = await fetchSloChecks(key, LAB_URL, FETCH_LOOKBACK_MS, now).catch((e) => {
        apiFailed = true;
        log("warn", "Тревоги: проверки UptimeRobot не получены.", { error: e instanceof Error ? e.message : String(e) });
        return [];
      });
      const { burns, firing, blind } = evaluateBurn(checks, now, apiFailed);
      const raised = await raiseAlerts(
        {
          firing: firing as ("fastBurn" | "slowBurn")[],
          blind,
          burns: { fastBurn: burns.fastBurn ?? null, slowBurn: burns.slowBurn ?? null },
          thresholds: { fastBurn: alertThreshold("fastBurn"), slowBurn: alertThreshold("slowBurn") },
        },
        { repeatMs: ALERT_REPEAT_MS, blindRepeatMs: BLIND_REPEAT_MS, recoveryLookbackMs: RECOVERY_LOOKBACK_MS },
        new Date(now),
      );
      if (raised.length) log("info", `Тревоги: поставлены в очередь — ${raised.map((a) => `${a.type}:${a.kind}`).join(", ")}.`);
      await deliverAlerts(resolveAlertSender(env));
    } catch (e) {
      logError("Тревоги: попутная проверка выгорания не удалась.", e);
    }
  });
  return true;
}
