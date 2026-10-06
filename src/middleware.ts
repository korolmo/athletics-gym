import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ru", "kk"];
const COOKIE = "NEXT_LOCALE";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/((?!admin|_next|api|favicon.ico|.*\\..*).*)"],
};
