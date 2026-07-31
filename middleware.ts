import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./lib/i18n/config";

const PUBLIC_FILE = /\.[^/]+$/;
const PASSTHROUGH = ["api", "admin", "go", "_next", "favicon.svg", "robots.txt", "sitemap.xml"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PASSTHROUGH.some((p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`))) {
    return NextResponse.next();
  }
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();
  if (pathname.startsWith("/rss")) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (maybeLocale && isLocale(maybeLocale)) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", maybeLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  // Unprefixed legacy URLs were English; keep them on /en unless the user chose a locale.
  // Bare "/" uses Arabic as the product default locale.
  let locale: Locale = DEFAULT_LOCALE;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else if (pathname !== "/") {
    locale = "en";
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url, 308);
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
