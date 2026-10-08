import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";

const LOCALES = ["ru", "kk"];
const COOKIE = "NEXT_LOCALE";
const LOGIN_PATH = "/admin/login";

/**
 * Админка: без подписанной и непросроченной сессии — только страница входа.
 * Версию сессии (отзыв) здесь не сверяем — это делает requireOwner() перед доступом к данным.
 */
async function guardAdmin(req: NextRequest): Promise<NextResponse> {
  if (req.nextUrl.pathname === LOGIN_PATH) return NextResponse.next();
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET).catch(() => null);
  if (session) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return guardAdmin(req);

  const first = pathname.split("/")[1] ?? "";

  if (LOCALES.includes(first)) {
    const res = NextResponse.next();
    if (req.cookies.get(COOKIE)?.value !== first) {
      res.cookies.set(COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  }

  const preferred = req.cookies.get(COOKIE)?.value ?? "";
  const locale = LOCALES.includes(preferred) ? preferred : "ru";
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
