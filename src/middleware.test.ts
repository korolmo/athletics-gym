import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";
import { middleware } from "./middleware";

const call = (path: string, cookie?: string) =>
  middleware(new NextRequest(`https://athleticsgym.kz${path}`, { headers: cookie ? { cookie } : {} }));

// NextResponse.rewrite помечает ответ заголовком x-middleware-rewrite с адресом, который рисует Next
const rewrite = (res: Response) => new URL(res.headers.get("x-middleware-rewrite") ?? "", "https://x").pathname;

describe("middleware: язык и страницы ошибок", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("главная и страницы сайта без языка — переадресация на язык", async () => {
    for (const [path, to] of [
      ["/", "/ru"],
      ["/privacy", "/ru/privacy"],
      ["/terms/", "/ru/terms/"],
    ]) {
      const res = await call(path);
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, path).toBe(to);
    }
    expect(new URL((await call("/terms", `${LOCALE_COOKIE}=kk`)).headers.get("location")!).pathname).toBe("/kk/terms");
  });

  it("неизвестный адрес без языка — сразу 404, без переадресации", async () => {
    for (const path of ["/abc", "/abc/def", "/ru-ru"]) {
      const res = await call(path);
      expect(res.status, path).toBe(404);
      expect(res.headers.get("location"), path).toBeNull();
      expect(rewrite(res), path).toBe(`/ru${path}`);
    }
    expect(rewrite(await call("/abc", `${LOCALE_COOKIE}=kk`))).toBe("/kk/abc");
  });

  it("ответы без языка зависят от cookie — Vary: Cookie", async () => {
    for (const path of ["/abc", "/", "/privacy"]) expect((await call(path)).headers.get("vary"), path).toContain("Cookie");
    vi.stubEnv("MAINTENANCE_MODE", "1");
    expect((await call("/abc")).headers.get("vary")).toContain("Cookie");
    vi.unstubAllEnvs();
    // Под языком язык в адресе — кэшу cookie не важен
    expect((await call("/ru/abc")).headers.get("vary") ?? "").not.toContain("Cookie");
  });

  it("неизвестный адрес под языком — 404 на том же адресе", async () => {
    const res = await call("/kk/abc");
    expect(res.status).toBe(404);
    expect(rewrite(res)).toBe("/kk/abc");
    expect((await call("/ru/privacy")).status).toBe(200);
  });

  it("технические работы — 503 и для адресов без языка", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "1");
    for (const path of ["/abc", "/ru/abc", "/ru"]) {
      const res = await call(path);
      expect(res.status, path).toBe(503);
      expect(res.headers.get("retry-after"), path).toBe("600");
    }
    expect((await call("/api/health/live")).status).toBe(200);
  });

  it("файлы, API и Фото не трогает", async () => {
    for (const path of ["/logo.png", "/api/health/live", "/media/gallery/a.webp"]) {
      const res = await call(path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("x-middleware-rewrite"), path).toBeNull();
    }
  });
});
