import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

function nominatimAddress(payload: {
  display_name?: string;
  address?: Record<string, string>;
}) {
  const parts = [
    payload.address?.road,
    payload.address?.village || payload.address?.suburb || payload.address?.neighbourhood,
    payload.address?.city_district || payload.address?.county,
    payload.address?.city || payload.address?.town || payload.address?.municipality,
    payload.address?.state,
  ].filter(Boolean);
  return parts.join(", ") || payload.display_name?.trim() || null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "id");

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "kinerja-asn/1.0 (tag lokasi tugas)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ address: null }, { status: 200 });
    }
    const payload = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    return NextResponse.json({ address: nominatimAddress(payload) });
  } catch {
    return NextResponse.json({ address: null }, { status: 200 });
  }
}
