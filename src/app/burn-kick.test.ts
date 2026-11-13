import { describe, expect, it, vi } from "vitest";

// Попутная проверка выгорания (этап 5, ADR 0028): только production Лаборатории, с ключом и чатом «Дежурство»,
// не чаще раза в 15 минут на экземпляр.
const after = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after }));
vi.mock("@/modules/notifications", async () => {
  const { resolveAlertSender } = await import("@/modules/notifications/service/telegram");
  return { resolveAlertSender, raiseAlerts: vi.fn(async () => []), deliverAlerts: vi.fn() };
});
vi.mock("@/lib/monitor/slo-checks", () => ({ fetchSloChecks: vi.fn(async () => []) }));

const { burnCheckEnabled, kickBurnCheck } = await import("./burn-kick");

const ENV = { APP_ENV: "lab", VERCEL_ENV: "production", UPTIMEROBOT_READ_KEY: "r-key", TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_ALERT_CHAT_ID: "-100500" };

describe("попутная проверка выгорания", () => {
  it("включена только в production Лаборатории с ключом «только чтение» и чатом «Дежурство»", () => {
    expect(burnCheckEnabled(ENV)).toBe(true);
    expect(burnCheckEnabled({ ...ENV, VERCEL_ENV: "preview" })).toBe(false);
    expect(burnCheckEnabled({ ...ENV, APP_ENV: "production" })).toBe(false);
    expect(burnCheckEnabled({ ...ENV, UPTIMEROBOT_READ_KEY: "" })).toBe(false);
    expect(burnCheckEnabled({ ...ENV, TELEGRAM_ALERT_CHAT_ID: undefined })).toBe(false);
    // Чат Владельца для тревог не годится
    expect(burnCheckEnabled({ ...ENV, TELEGRAM_ALERT_CHAT_ID: undefined, TELEGRAM_CHAT_ID: "42" } as Record<string, string | undefined>)).toBe(false);
  });

  it("не чаще раза в 15 минут на экземпляр", () => {
    const t = Date.parse("2026-11-20T12:00:00Z");
    expect(kickBurnCheck({ now: t, env: ENV })).toBe(true);
    expect(kickBurnCheck({ now: t + 14 * 60_000, env: ENV })).toBe(false);
    expect(kickBurnCheck({ now: t + 15 * 60_000, env: ENV })).toBe(true);
    expect(after).toHaveBeenCalledTimes(2);
  });

  it("выключенная проверка ничего не запускает", () => {
    after.mockClear();
    expect(kickBurnCheck({ now: Date.parse("2026-11-21T00:00:00Z"), env: { ...ENV, VERCEL_ENV: "preview" } })).toBe(false);
    expect(after).not.toHaveBeenCalled();
  });
});
