"use client";

import dynamic from "next/dynamic";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-40 rounded-lg bg-slate-100" /> }
);

export function LocationMapView({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return <LocationMap latitude={latitude} longitude={longitude} />;
}
