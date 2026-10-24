import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";
import { LOCALE_COOKIE as COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";
import { REQUEST_ID_HEADER, REQUEST_START_HEADER, requestIdFrom } from "@/lib/observability/log";
import { MAINTENANCE_RETRY_AFTER_SEC, isMaintenance } from "@/lib/maintenance";
import { offlinePage } from "@/lib/errors/offline-page";

const LOCALES = ["ru", "kk"];

/** Страницы, которые без языка в адресе ведут на язык из cookie («/privacy» → «/ru/privacy»). Проверяет тест. */
export const LOCALE_REDIRECTS = ["/", "/privacy", "/terms"];
const LOGIN_PATH = "/admin/login";

/** Заголовки запроса дальше по цепочке: request_id видят сервер, строка доступа и логи (ADR 0009). */
function forwardHeaders(req: NextRequest, id: string): Headers {
  const headers = new Headers(req.headers);
  headers.set(REQUEST_ID_HEADER, id);
  // Метку ставим всегда сами: входящую от клиента перезаписываем
  headers.set(REQUEST_START_HEADER, String(Date.now()));
  return headers;
}

function next(req: NextRequest, id: string): NextResponse {
  return NextResponse.next({ request: { headers: forwardHeaders(req, id) } });
}

/**
 * Технические работы: вместо любой страницы сайта — готовая двуязычная страница с кодом 503 прямо из middleware.
 * Не переписывание адреса с кодом: такой ответ Vercel подменяет своей страницей платформы (ADR 0013).
 */
function maintenance(): NextResponse {
  return new NextResponse(offlinePage("maintenance"), {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": String(MAINTENANCE_RETRY_AFTER_SEC), "Cache-Control": "no-store" },
  });
}

/**
 * Админка: без подписанной и непросроченной сессии — только страница входа.
 * Версию сессии (отзыв) здесь не сверяем — это делает requireOwner() перед доступом к данным.
 */
async function guardAdmin(req: NextRequest, id: string): Promise<NextResponse> {
  if (req.nextUrl.pathname === LOGIN_PATH) return next(req, id);
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET).catch(() => null);
  if (session) return next(req, id);
  const url = req.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

/** Страница сайта (не API, не файл, не Фото): к ней относится выбор языка. */
function isPage(pathname: string): boolean {
  return !/^\/(api|media)(\/|$)/.test(pathname) && !/\.[^/]*$/.test(pathname);
}

async function route(req: NextRequest, id: string): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return guardAdmin(req, id);

  const first = pathname.split("/")[1] ?? "";

  // Всё под /ru и /kk — страницы сайта. Адрес без своей страницы («/ru/abc») Next отдаёт сам: app/global-not-found.tsx, код 404
  if (LOCALES.includes(first)) {
    if (isMaintenance()) return maintenance();
    const res = next(req, id);
    if (req.cookies.get(COOKIE)?.value !== first) {
      res.cookies.set(COOKIE, first, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE_SEC });
    }
    return res;
  }

  if (!isPage(pathname)) return next(req, id);
  if (isMaintenance()) return maintenance();

  const path = pathname.replace(/(.)\/+$/, "$1");
  if (!LOCALE_REDIRECTS.includes(path)) {
    // Неизвестный адрес без языка («/abc») — сразу 404, без переадресации (иначе у поисковика лишний шаг и адрес
    // «с переадресацией» в отчётах). Переписываем под /ru: так он не попадёт в [locale] как язык «abc» и получит ту же
    // страницу global-not-found. Она одна на всех (язык выбирает браузер), поэтому от cookie ответ не зависит.
    const url = req.nextUrl.clone();
    url.pathname = `/ru${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: forwardHeaders(req, id) } });
  }
  const preferred = req.cookies.get(COOKIE)?.value ?? "";
  const url = req.nextUrl.clone();
  url.pathname = `/${LOCALES.includes(preferred) ? preferred : "ru"}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.redirect(url);
  // Адрес переадресации взят из cookie: кэш (CDN, браузер) не должен отдать казахскому посетителю русскую
  res.headers.append("Vary", "Cookie");
  return res;
}

export async function middleware(req: NextRequest) {
  const id = requestIdFrom(req.headers.get(REQUEST_ID_HEADER));
  const res = await route(req, id);
  res.headers.set("X-Request-Id", id);
  return res;
}

export const config = {
  // Всё, кроме статики сборки и копий картинок: им request_id не нужен
  matcher: ["/((?!_next/static|_next/image|_img/|favicon.ico).*)"],
};
