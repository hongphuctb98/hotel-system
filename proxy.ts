import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.endsWith(p)
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API routes pass through (except auth APIs which are public)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check auth for non-public pages
  const token = req.cookies.get("access_token")?.value;
  if (!token && !isPublicPath(pathname)) {
    // Extract locale from pathname for redirect
    const locale = routing.locales.find(
      (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
    ) ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
