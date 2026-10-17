import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";
import { LOCALE_COOKIE as COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";
import { REQUEST_ID_HEADER, REQUEST_START_HEADER, requestIdFrom } from "@/lib/observability/log";

const LOCALES = ["ru", "kk"];
const LOGIN_PATH = "/admin/login";

/** Дальше по цепочке — с request_id в заголовке запроса: его видят сервер, строка доступа и логи (ADR 0009). */
function next(req: NextRequest, id: string): NextResponse {
  const headers = new Headers(req.headers);
  headers.set(REQUEST_ID_HEADER, id);
  // Метку ставим всегда сами: входящую от клиента перезаписываем
  headers.set(REQUEST_START_HEADER, String(Date.now()));
  return NextResponse.next({ request: { headers } });
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
  if (!isPage(pathname)) return next(req, id);

  const first = pathname.split("/")[1] ?? "";

  if (LOCALES.includes(first)) {
    const res = next(req, id);
    if (req.cookies.get(COOKIE)?.value !== first) {
      res.cookies.set(COOKIE, first, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE_SEC });
    }
    return res;
  }

  const preferred = req.cookies.get(COOKIE)?.value ?? "";
  const locale = LOCALES.includes(preferred) ? preferred : "ru";
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
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
