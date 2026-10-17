import { beforeEach, describe, expect, it, vi } from "vitest";

// Маршруты проверок здоровья без базы и сети: готовность и сессия подменены.

const { readiness, authed, health } = vi.hoisted(() => ({
  readiness: vi.fn(),
  authed: vi.fn(async () => false),
  health: vi.fn(async () => ({ ok: true, node: "v23.11.0" })),
}));
vi.mock("@/lib/services/health", () => ({ getReadiness: readiness, getHealth: health }));
vi.mock("@/lib/auth", () => ({ isAuthed: authed }));

import { GET as detailed } from "./route";
import { GET as live } from "./live/route";
import { GET as ready } from "./ready/route";

const ok = { ok: true, ms: 2 };
const fail = { ok: false, ms: 1000, error: "тайм-аут 1000 мс" };

beforeEach(() => {
  readiness.mockReset();
  authed.mockReset().mockResolvedValue(false);
});

describe("/api/health/live", () => {
  it("200 ok без обращения к зависимостям, не кэшируется", async () => {
    const r = live();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(readiness).not.toHaveBeenCalled();
  });
});

describe("/api/health/ready", () => {
  it("база и хранилище ответили — 200 ok", async () => {
    readiness.mockResolvedValue({ database: ok, storage: ok });
    const r = await ready();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["база", { database: fail, storage: ok }],
    ["хранилище", { database: ok, storage: fail }],
  ])("не ответила %s — 503 fail без подробностей", async (_, checks) => {
    readiness.mockResolvedValue(checks);
    const r = await ready();
    expect(r.status).toBe(503);
    const text = await r.text();
    expect(JSON.parse(text)).toEqual({ status: "fail" });
    expect(text).not.toMatch(/тайм-аут|database|storage/);
  });
});

describe("/api/health — подробно, только Владельцу", () => {
  it("без сессии — 401 и никаких данных о сервере", async () => {
    const r = await detailed();
    expect(r.status).toBe(401);
    expect(await r.text()).not.toMatch(/node|v23/);
    expect(health).not.toHaveBeenCalled();
  });

  it("с сессией — подробности", async () => {
    authed.mockResolvedValue(true);
    const r = await detailed();
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, node: "v23.11.0" });
  });
});

describe("/api/health/error — проверка Sentry", () => {
  it("без сессии — 401, ошибки нет", async () => {
    const { POST } = await import("./error/route");
    expect((await POST()).status).toBe(401);
  });

  it("Владелец — сервер бросает ошибку (её ловит onRequestError)", async () => {
    authed.mockResolvedValue(true);
    const { POST } = await import("./error/route");
    await expect(POST()).rejects.toThrow("Проверка Sentry");
  });
});
