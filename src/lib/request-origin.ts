import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function firstHeader(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function isLoopbackHost(host: string) {
  const hostname = host.replace(/:\d+$/, "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
}

export function publicOrigin(request: NextRequest) {
  const forwardedHost = firstHeader(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeader(request.headers.get("host"));
  if (!host || isLoopbackHost(host)) return null;

  const forwardedProto = firstHeader(request.headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto ||
    (host.includes("trycloudflare.com") || host.includes("loca.lt") ? "https" : request.nextUrl.protocol.replace(":", ""));
  return `${proto}://${host}`;
}

export function redirectToPath(request: NextRequest, path: string) {
  const target = path.startsWith("/") ? path : `/${path}`;
  const origin = publicOrigin(request) || request.nextUrl.origin;
  return NextResponse.redirect(new URL(target, origin));
}
