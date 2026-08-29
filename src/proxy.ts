import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/api/auth", "/manifest.json", "/validasi"];

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/mandiri", request.url));
  }

  if (pathname.startsWith("/admin") && request.auth.user.role !== "admin") {
    return NextResponse.redirect(new URL("/board", request.url));
  }

  if (
    pathname.startsWith("/pimpinan") &&
    !["admin", "pimpinan"].includes(request.auth.user.role)
  ) {
    return NextResponse.redirect(new URL("/board", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|uploads|.*\\.(?:svg|png|ico|webmanifest)$).*)",
  ],
};
