import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installAccessLog } from "./access-log";
import { buildRecord, logError, release, requestIdFrom, routeOf } from "./log";

// Секреты, которые ни при каких условиях не должны оказаться в логах
const IP = "203.0.113.77";
const COOKIE = "ag_admin=admin.999.v1.deadbeefcafe";
const FORM = "authorName=Секретное+Имя&text=Секретный+текст+отзыва&consent=on";
const QUERY = "phone=77001234567";
const SECRETS = [IP, "deadbeefcafe", "Секретное", "Секретный", "77001234567", "ag_admin"];

describe("запись лога", () => {
  it("только поля из белого списка: IP, cookies, тела и поля форм отбрасываются", () => {
    const record = buildRecord("info", "request", {
      request_id: "req-12345678",
      route: `/ru?${QUERY}`,
      status: 200,
      duration_ms: 12.6,
      ...({ ip: IP, cookie: COOKIE, body: FORM, authorName: "Секретное Имя", headers: { "x-forwarded-for": IP } } as object),
    });
    expect(Object.keys(record).sort()).toEqual(["duration_ms", "level", "msg", "release", "request_id", "route", "status", "time"]);
    expect(record).toMatchObject({ level: "info", route: "/ru", status: 200, duration_ms: 13, request_id: "req-12345678" });
    const text = JSON.stringify(record);
    for (const s of SECRETS) expect(text).not.toContain(s);
  });

  it("время — ISO, release — из RELEASE, запасной — sha Vercel, иначе dev", () => {
    expect(buildRecord("info", "x", {}, new Date("2026-10-17T10:00:00Z")).time).toBe("2026-10-17T10:00:00.000Z");
    expect(release({ RELEASE: "abc123" })).toBe("abc123");
    expect(release({ VERCEL_GIT_COMMIT_SHA: "def456" })).toBe("def456");
    expect(release({})).toBe("dev");
  });

  it("маршрут — без query и якоря", () => {
    expect(routeOf(`/ru/privacy?${QUERY}#cookies`)).toBe("/ru/privacy");
    expect(routeOf(undefined)).toBe("");
  });

  it("ошибка — имя и последняя строка сообщения, без стека и вложенных данных", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const e = Object.assign(new Error("Invalid `prisma.review.create()` invocation:\n\nUnique constraint failed"), { meta: { authorName: "Секретное Имя" } });
    logError("Отзыв с сайта: не удалось принять.", e);
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "error", error: "Error: Unique constraint failed" });
    expect(JSON.stringify(line)).not.toMatch(/Секретное|at .*\.ts/);
    spy.mockRestore();
  });

  it("request_id: входящий берём, только если он похож на идентификатор", () => {
    expect(requestIdFrom("abcd-1234-efgh")).toBe("abcd-1234-efgh");
    for (const bad of [null, undefined, "", "short", "has space inside id", "x".repeat(65), '"><script>']) {
      expect(requestIdFrom(bad)).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe("строка доступа (http.Server)", () => {
  let server: http.Server;
  let base: string;
  const lines: Record<string, unknown>[] = [];
  let raw = "";

  beforeAll(async () => {
    installAccessLog();
    vi.spyOn(console, "log").mockImplementation((s: string) => {
      raw += `${s}\n`;
      lines.push(JSON.parse(s));
    });
    server = http.createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        res.statusCode = req.url?.startsWith("/boom") ? 500 : 200;
        res.end("ok");
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await new Promise((r) => server.close(r));
  });

  beforeEach(() => {
    lines.length = 0;
    raw = "";
  });

  const waitLine = async () => {
    for (let i = 0; i < 50 && lines.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
  };

  it("POST формы с cookie и IP: в строке только метод, путь, статус, длительность, request_id", async () => {
    const res = await fetch(`${base}/ru?${QUERY}`, {
      method: "POST",
      body: FORM,
      headers: { cookie: COOKIE, "x-forwarded-for": IP, "x-real-ip": IP, "content-type": "application/x-www-form-urlencoded" },
    });
    await waitLine();
    expect(lines).toHaveLength(1);
    const line = lines[0];
    expect(line).toMatchObject({ level: "info", msg: "request", method: "POST", route: "/ru", status: 200 });
    expect(typeof line.duration_ms).toBe("number");
    expect(line.request_id).toBe(res.headers.get("x-request-id"));
    for (const s of SECRETS) expect(raw).not.toContain(s);
  });

  it("входящий X-Request-Id проходит насквозь; 5xx — уровень error", async () => {
    const res = await fetch(`${base}/boom`, { headers: { "x-request-id": "trace-0000-1111" } });
    await waitLine();
    expect(res.headers.get("x-request-id")).toBe("trace-0000-1111");
    expect(lines[0]).toMatchObject({ level: "error", status: 500, request_id: "trace-0000-1111" });
  });

  it("проверку живости и статику сборки не пишем", async () => {
    await fetch(`${base}/api/health/live`);
    await fetch(`${base}/_next/static/chunks/app.js`);
    await new Promise((r) => setTimeout(r, 50));
    expect(lines).toHaveLength(0);
  });
});

describe("длительность в строке доступа", () => {
  it("точное начало (хостинг) главнее метки middleware", async () => {
    const { durationMs } = await import("./access-log");
    expect(durationMs(100, "1", 160, 999)).toBe(60);
  });

  it("на Vercel — от метки middleware; чужая или странная метка — без длительности", async () => {
    const { durationMs } = await import("./access-log");
    expect(durationMs(undefined, "1000", 0, 1250)).toBe(250);
    for (const bad of [undefined, "", "abc", "-5", "2000"]) expect(durationMs(undefined, bad, 0, 1250)).toBeUndefined();
    expect(durationMs(undefined, "1000", 0, 1000 + 61_000)).toBeUndefined();
  });
});
