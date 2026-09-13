import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { redirectToPath } from "@/lib/request-origin";
import { canManageOrg, canUseEmployeeApp, coerceRole, defaultHomePath, isAppAdmin, isSuperAdmin } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/api/auth", "/api/health", "/manifest.json", "/validasi"];
const employeePrefixes = ["/mandiri", "/board", "/pimpinan", "/laporan", "/tugas"];

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const login = new URL("/login", "http://local.invalid");
    login.searchParams.set("callbackUrl", pathname);
    return redirectToPath(request, `${login.pathname}${login.search}`);
  }

  const role = coerceRole(request.auth.user.role);
  const home = defaultHomePath(role);

  if (pathname === "/") {
    return redirectToPath(request, home);
  }

  if (pathname.startsWith("/dashboard") && !isSuperAdmin(role)) {
    return redirectToPath(request, home);
  }

  if (pathname.startsWith("/admin") && !canManageOrg(role)) {
    return redirectToPath(request, home);
  }

  if (isSuperAdmin(role) && (pathname === "/pegawai" || pathname.startsWith("/pegawai/"))) {
    return redirectToPath(request, "/admin/pegawai");
  }

  if (isSuperAdmin(role) && employeePrefixes.some((path) => pathname.startsWith(path))) {
    return redirectToPath(request, home);
  }

  if (pathname.startsWith("/pimpinan") && !canUseEmployeeApp(role)) {
    return redirectToPath(request, home);
  }

  if (isAppAdmin(role) && employeePrefixes.some((path) => pathname.startsWith(path))) {
    return redirectToPath(request, home);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|uploads|.*\\.(?:svg|png|ico|webmanifest)$).*)",
  ],
};
