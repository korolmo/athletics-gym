import { describe, expect, it, vi } from "vitest";
import { buildEvent, captureError, parseDsn, parseStack } from "./sentry";

const DSN = "https://abc123public@o42.ingest.de.sentry.io/4507";

describe("DSN", () => {
  it("адрес конверта и ключ", () => {
    expect(parseDsn(DSN)).toEqual({ endpoint: "https://o42.ingest.de.sentry.io/api/4507/envelope/", publicKey: "abc123public", dsn: DSN });
    expect(parseDsn("http://k@sentry.local/sub/9")?.endpoint).toBe("http://sentry.local/sub/api/9/envelope/");
  });

  it("пустой или неверный — отправки нет", () => {
    for (const bad of [undefined, "", "   ", "not a url", "https://sentry.io/1", "https://k@sentry.io/abc", "ftp://k@sentry.io/1"]) expect(parseDsn(bad)).toBeNull();
  });
});

describe("событие", () => {
  it("стек V8 → кадры: от внешнего к внутреннему, node_modules — не наш код", () => {
    const frames = parseStack("Error: x\n    at inner (/app/.next/server/app/page.js:10:5)\n    at outer (/app/node_modules/next/dist/server.js:3:1)\n    at node:internal/process:1:1");
    expect(frames.map((f) => [f.function, f.in_app])).toEqual([
      [undefined, false],
      ["outer", false],
      ["inner", true],
    ]);
    expect(frames[2]).toMatchObject({ filename: "/app/.next/server/app/page.js", lineno: 10, colno: 5 });
  });

  it("только белый список: маршрут без query, без заголовков, cookies, тела и IP", () => {
    const request = {
      path: "/ru?phone=77001234567",
      method: "POST",
      headers: { cookie: "ag_admin=secret-cookie", "x-forwarded-for": "203.0.113.77" },
      body: "authorName=Секретное+Имя",
    };
    const event = buildEvent(Object.assign(new Error("boom"), { digest: "123" }), request, { routePath: "/[locale]", routeType: "render", routerKind: "App Router" }, { RELEASE: "abc", APP_ENV: "lab" });
    expect(event).toMatchObject({
      level: "error",
      release: "abc",
      environment: "lab",
      request: { url: "/ru", method: "POST" },
      tags: { route: "/[locale]", route_type: "render", router_kind: "App Router", digest: "123" },
      exception: { values: [{ type: "Error", value: "boom" }] },
    });
    expect(event.event_id).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(event)).not.toMatch(/77001234567|secret-cookie|203\.0\.113\.77|Секретное|headers|cookie|user/);
  });
});

describe("отправка", () => {
  it("SENTRY_DSN пуст — ни одного запроса", async () => {
    const fetchImpl = vi.fn();
    expect(await captureError(new Error("x"), {}, {}, { env: {}, fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("конверт в API Sentry с ключом в X-Sentry-Auth", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await captureError(new Error("boom"), { path: "/ru", method: "GET" }, {}, { env: { SENTRY_DSN: DSN }, fetchImpl })).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://o42.ingest.de.sentry.io/api/4507/envelope/");
    expect((init.headers as Record<string, string>)["x-sentry-auth"]).toContain("sentry_key=abc123public");
    const lines = String(init.body).split("\n").map((l) => JSON.parse(l));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual({ type: "event" });
    expect(lines[2].event_id).toBe(lines[0].event_id);
  });

  it("сбой сети или отказ Sentry — false, без исключения", async () => {
    const down = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await captureError(new Error("x"), {}, {}, { env: { SENTRY_DSN: DSN }, fetchImpl: down })).toBe(false);
    const refused = vi.fn(async () => new Response("", { status: 429 }));
    expect(await captureError(new Error("x"), {}, {}, { env: { SENTRY_DSN: DSN }, fetchImpl: refused })).toBe(false);
  });
});
