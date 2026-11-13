import { describe, expect, it, vi } from "vitest";
import { fetchSloChecks } from "./slo-checks";

const LAB = "https://athletics-gym-lab.vercel.app";
const NOW = Date.parse("2026-11-20T12:00:00Z");
const sec = (iso: string) => String(Date.parse(iso) / 1000);

const monitor = (target: string, extra: object = {}) => ({
  url: LAB + target,
  interval: 300,
  response_times: [{ datetime: sec("2026-11-20T11:55:00Z"), value: 250 }],
  logs: [],
  ...extra,
});

function api(json: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    void init;
    return new Response(JSON.stringify(json), { status });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("проверки UptimeRobot для тревог", () => {
  it("забирает три монитора и разбирает их так же, как суточный отчёт", async () => {
    const f = api({
      stat: "ok",
      monitors: [monitor("/ru"), monitor("/kk", { logs: [{ type: 1, datetime: sec("2026-11-20T11:30:00Z"), duration: 600, reason: { code: "500" } }] }), monitor("/api/health/ready")],
    });
    const checks = await fetchSloChecks("r-key", LAB, 7 * 3_600_000, NOW, f);
    expect(checks.filter((c) => c.target === "/ru")).toEqual([expect.objectContaining({ status: 200, ms: 250 })]);
    // Падение 10 минут при интервале 5 — две неуспешные проверки
    expect(checks.filter((c) => c.target === "/kk" && c.status === 500)).toHaveLength(2);
    const body = String((f.mock.calls[0][1] as RequestInit).body);
    expect(body).toContain("api_key=r-key");
    expect(body).toContain("logs=1");
  });

  it("ошибка API или нет монитора — исключение без ключа в тексте («мониторинг слеп»)", async () => {
    await expect(fetchSloChecks("secret-key", LAB, 3_600_000, NOW, api({ stat: "fail", error: { message: "bad key" } }, 200))).rejects.toThrow(/getMonitors/);
    await expect(fetchSloChecks("secret-key", LAB, 3_600_000, NOW, api({ stat: "ok", monitors: [monitor("/ru")] }))).rejects.toThrow(/нет монитора/);
    await expect(fetchSloChecks("secret-key", LAB, 3_600_000, NOW, api({ stat: "fail" }))).rejects.not.toThrow(/secret-key/);
  });
});
