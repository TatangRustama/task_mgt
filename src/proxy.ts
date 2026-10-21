import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { redirectToPath } from "@/lib/request-origin";
import { canAccessAdminConsole, canUseEmployeeApp, coerceRole, defaultHomePath, isAppAdmin, isSuperAdmin } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/api/auth", "/api/health", "/manifest.json", "/validasi", "/sw.js"];
const employeePrefixes = ["/mandiri", "/board", "/pimpinan", "/laporan", "/tugas"];

function adminConsoleAllowed(
  role: ReturnType<typeof coerceRole>,
  pathname: string,
  opdAdmin: boolean,
  superAdmin: boolean,
) {
  if (isSuperAdmin(role) || superAdmin) return true;
  if (!isAppAdmin(role) && !opdAdmin) return false;
  return pathname.startsWith("/admin/pegawai") || pathname.startsWith("/admin/monitoring");
}

export const proxy = auth(async (request) => {
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

  const sessionUser = request.auth.user;
  let role = coerceRole(sessionUser.role);
  let opdAdmin = Boolean(sessionUser.opdAdmin);
  let superAdmin = Boolean(sessionUser.superAdmin);
  if (sessionUser.id) {
    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { role: true, opdAdmin: true, superAdmin: true, deletedAt: true },
    });
    if (!row || row.deletedAt) {
      return redirectToPath(request, "/login");
    }
    role = coerceRole(row.role);
    opdAdmin = row.opdAdmin;
    superAdmin = row.superAdmin;
  }
  const home = defaultHomePath(role);

  if (pathname === "/") {
    return redirectToPath(request, home);
  }

  if (pathname.startsWith("/dashboard") && !canAccessAdminConsole(role, opdAdmin, superAdmin)) {
    return redirectToPath(request, home);
  }

  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !adminConsoleAllowed(role, pathname, opdAdmin, superAdmin)) {
    return redirectToPath(request, home);
  }

  if (pathname.startsWith("/setting") && isAppAdmin(role)) {
    return redirectToPath(request, home);
  }

  if (
    (isSuperAdmin(role) || isAppAdmin(role)) &&
    (pathname === "/pegawai" || pathname.startsWith("/pegawai/"))
  ) {
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|uploads|.*\\.(?:svg|png|ico|js|webmanifest)$).*)",
  ],
};
