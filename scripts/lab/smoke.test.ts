import { describe, expect, it } from "vitest";
import { parseCurlInclude, smokeChecks } from "./smoke-core.mjs";

type Res = { status: number; headers: Record<string, string>; body: string };
const ours404 = '<div data-error-page="404" lang="ru">Такой страницы нет</div><div data-error-page="404" lang="kk" hidden>Мұндай бет жоқ</div>';
const res = (status: number, body = "", headers: Record<string, string> = {}): Res => ({ status, headers, body });
const check = (name: string, maintenance = false) => smokeChecks({ maintenance, nonce: "x" }).find((c) => c.name.startsWith(name))!;

describe("смоук Лаборатории", () => {
  it("наша 404 проходит, страница платформы и чужой код — нет", () => {
    const c = check("/ru/nope");
    expect(c.verify([res(404, ours404)])).toBeNull();
    expect(c.verify([res(404, "<title>404: This page could not be found.</title>", { "x-vercel-cache": "HIT" })])).toMatch(/платформы.*HIT/);
    expect(c.verify([res(200, ours404)])).toMatch(/код 200/);
    expect(c.verify([res(404, '<div data-error-page="404" lang="ru"></div>')])).toMatch(/языковых/);
  });

  it("/abc: без переадресации и один HTML для любой cookie", () => {
    const c = check("/abc");
    expect(c.requests.map((r) => r.cookie ?? "")).toEqual(["NEXT_LOCALE=kk", ""]);
    expect(c.verify([res(404, ours404), res(404, ours404)])).toBeNull();
    expect(c.verify([res(404, ours404 + "kk"), res(404, ours404)])).toMatch(/зависит от cookie/);
    expect(c.verify([res(307, "", { location: "/kk/abc" }), res(307)])).toMatch(/переадресация/);
  });

  it("технические работы: 503, Retry-After и наш маркер; страница платформы Vercel — провал", () => {
    const c = check("/ru —", true);
    expect(c.verify([res(503, '<main data-error-page="503">', { "retry-after": "600" })])).toBeNull();
    expect(c.verify([res(503, "SERVICE_UNAVAILABLE", { "retry-after": "600" })])).toMatch(/платформы/);
    expect(c.verify([res(503, '<main data-error-page="503">')])).toMatch(/Retry-After/);
  });

  it("превью ссылок: свой язык — картинка, чужой — 404 без картинки", () => {
    const png = { "content-type": "image/png" };
    expect(check("превью ссылок /ru").verify([res(200, "", png), res(200, "", png)])).toBeNull();
    expect(check("превью ссылок /ru").verify([res(200, "", png), res(404)])).toMatch(/код 404/);
    const foreign = check("превью ссылок с чужим");
    expect(foreign.requests.map((r) => r.path)).toEqual(["/api/opengraph-image", "/_img/twitter-image"]);
    expect(foreign.verify([res(404, "", { "content-type": "text/html" }), res(404)])).toBeNull();
    expect(foreign.verify([res(200, "", png), res(404)])).toMatch(/код 200/);
  });

  it("разбор вывода curl --include", () => {
    const out = "HTTP/1.1 100 Continue\r\n\r\nHTTP/2 404\r\nX-Vercel-Cache: MISS\r\nRetry-After: 600\r\n\r\n<html>\r\n\r\nтело</html>";
    expect(parseCurlInclude(out)).toEqual({ status: 404, headers: { "x-vercel-cache": "MISS", "retry-after": "600" }, body: "<html>\r\n\r\nтело</html>" });
  });
});
