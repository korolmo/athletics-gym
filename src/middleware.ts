import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";
import { LOCALE_COOKIE as COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";
import { REQUEST_ID_HEADER, REQUEST_START_HEADER, requestIdFrom } from "@/lib/observability/log";
import { MAINTENANCE_PATH, MAINTENANCE_RETRY_AFTER_SEC, isMaintenance } from "@/lib/maintenance";
import { isSitePage } from "@/lib/site-pages";

const LOCALES = ["ru", "kk"];
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
 * Адрес без своей страницы: его рисует маршрут [locale]/[...rest] (адрес в браузере не меняется), код ответа — 404.
 * `pathname` — путь с языком, если в адресе его нет.
 */
function notFound(req: NextRequest, id: string, pathname = req.nextUrl.pathname): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url, { status: 404, request: { headers: forwardHeaders(req, id) } });
}

/** Технические работы: вместо любой страницы сайта — страница 503 на языке адреса. */
function maintenance(req: NextRequest, id: string, locale: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${MAINTENANCE_PATH}`;
  url.search = "";
  return NextResponse.rewrite(url, {
    status: 503,
    request: { headers: forwardHeaders(req, id) },
    headers: { "Retry-After": String(MAINTENANCE_RETRY_AFTER_SEC), "Cache-Control": "no-store" },
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

  // Всё под /ru и /kk — страницы сайта (и «/ru/abc.php» тоже: его поймал бы маршрут [...rest])
  if (LOCALES.includes(first)) {
    if (isMaintenance()) return maintenance(req, id, first);
    if (!isSitePage(pathname.slice(first.length + 1))) return notFound(req, id);
    const res = next(req, id);
    if (req.cookies.get(COOKIE)?.value !== first) {
      res.cookies.set(COOKIE, first, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE_SEC });
    }
    return res;
  }

  if (!isPage(pathname)) return next(req, id);

  const preferred = req.cookies.get(COOKIE)?.value ?? "";
  const locale = LOCALES.includes(preferred) ? preferred : "ru";
  // Без языка на язык переадресуем только главную и страницы сайта («/privacy»). Неизвестный адрес («/abc») — сразу 404:
  // переадресация на «/ru/abc» и уже там 404 — лишний шаг для поисковика и адрес «с переадресацией» в его отчётах.
  let res: NextResponse;
  if (!isSitePage(pathname)) res = isMaintenance() ? maintenance(req, id, locale) : notFound(req, id, `/${locale}${pathname}`);
  else {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.redirect(url);
  }
  // Язык ответа взят из cookie: кэш (CDN Vercel, браузер) не должен отдать русский ответ казахскому посетителю.
  // У переадресаций Vary доходит до браузера; у страниц (404, 503) Next 15.5 ставит свой Vary поверх, их защищает
  // Cache-Control: no-store (динамическая страница 404, no-store у 503) — проверяет прод-двойник.
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
