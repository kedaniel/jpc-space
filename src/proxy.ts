import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rolePrefixAllowed } from "@/lib/auth/post-login";

const PUBLIC_PATHS = new Set<string>(["/login", "/forgot-password", "/reset-password"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/" || pathname === "/forbidden") return true;
  return false;
}

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const user = req.auth?.user;
  if (!user || !user.userId) {
    const url = nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (!rolePrefixAllowed(user.role, pathname)) {
    const url = nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
