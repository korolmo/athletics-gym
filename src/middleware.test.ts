import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";
import { LOCALE_REDIRECTS, middleware } from "./middleware";

const call = (path: string, cookie?: string) =>
  middleware(new NextRequest(`https://athleticsgym.kz${path}`, { headers: cookie ? { cookie } : {} }));

// NextResponse.rewrite помечает ответ заголовком x-middleware-rewrite с адресом, который рисует Next
const rewrite = (res: Response) => new URL(res.headers.get("x-middleware-rewrite") ?? "", "https://x").pathname;

describe("middleware: язык и страницы ошибок", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("главная и страницы сайта без языка — переадресация на язык из cookie, с Vary: Cookie", async () => {
    for (const [p, to] of [
      ["/", "/ru"],
      ["/privacy", "/ru/privacy"],
      ["/terms/", "/ru/terms/"],
    ]) {
      const res = await call(p);
      expect(res.status, p).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, p).toBe(to);
      expect(res.headers.get("vary"), p).toContain("Cookie");
    }
    expect(new URL((await call("/terms", `${LOCALE_COOKIE}=kk`)).headers.get("location")!).pathname).toBe("/kk/terms");
  });

  it("страницы из LOCALE_REDIRECTS есть в src/app/[locale]", () => {
    for (const p of LOCALE_REDIRECTS) expect(fs.existsSync(path.join("src/app/[locale]", p, "page.tsx")), p).toBe(true);
  });

  it("неизвестный адрес без языка — без переадресации: под /ru, где его встретит global-not-found", async () => {
    for (const p of ["/abc", "/abc/def", "/ru-ru"]) {
      const res = await call(p);
      expect(res.headers.get("location"), p).toBeNull();
      expect(rewrite(res), p).toBe(`/ru${p}`);
    }
    // Страница 404 одна на всех (язык выбирает браузер) — ответ от cookie не зависит
    expect(rewrite(await call("/abc", `${LOCALE_COOKIE}=kk`))).toBe("/ru/abc");
  });

  it("адреса под языком отдаёт Next как есть: код 404 у неизвестных ставит он сам, не middleware", async () => {
    for (const p of ["/kk/abc", "/ru/privacy"]) {
      const res = await call(p);
      expect(res.status, p).toBe(200);
      expect(res.headers.get("x-middleware-rewrite"), p).toBeNull();
    }
  });

  it("технические работы — готовая страница 503 из middleware, без переписывания адреса", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "1");
    for (const p of ["/abc", "/ru/abc", "/ru", "/kk/privacy", "/"]) {
      const res = await call(p);
      expect(res.status, p).toBe(503);
      expect(res.headers.get("retry-after"), p).toBe("600");
      expect(res.headers.get("x-middleware-rewrite"), p).toBeNull();
      expect(await res.text(), p).toContain('data-error-page="503"');
    }
    expect((await call("/api/health/live")).status).toBe(200);
  });

  it("файлы, API и Фото не трогает", async () => {
    for (const p of ["/logo.png", "/api/health/live", "/media/gallery/a.webp"]) {
      const res = await call(p);
      expect(res.status, p).toBe(200);
      expect(res.headers.get("x-middleware-rewrite"), p).toBeNull();
    }
  });
});
