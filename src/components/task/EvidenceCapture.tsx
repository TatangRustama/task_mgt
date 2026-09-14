"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-40 rounded-lg bg-slate-100" /> }
);

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak tersedia"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Gagal compress"));
            return;
          }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => reject(new Error("Gagal membaca gambar"));
    img.src = url;
  });
}

function geoErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = Number((error as GeolocationPositionError).code);
    if (code === 1) return "Izin lokasi ditolak — izinkan akses lokasi, lalu ketuk Tag Lokasi lagi";
    if (code === 2) return "Lokasi GPS tidak tersedia — coba lagi atau isi alamat manual";
    if (code === 3) return "Waktu pencarian lokasi habis — ketuk Tag Lokasi untuk coba lagi";
  }
  return "Gagal membaca lokasi GPS";
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${latitude}&lon=${longitude}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string | null };
    return data.address?.trim() || null;
  } catch {
    return null;
  }
}

function readCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function useEvidenceCapture(enabled: boolean) {
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [geoError, setGeoError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    setGeoLoading(true);
    setGeoError("");
    try {
      const pos = await readCurrentPosition();
      const nextLat = pos.coords.latitude;
      const nextLng = pos.coords.longitude;
      setLatitude(nextLat);
      setLongitude(nextLng);
      const resolved = await reverseGeocode(nextLat, nextLng);
      if (resolved) {
        setAddress(resolved);
      } else {
        setAddress((prev) => prev.trim() || `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`);
      }
    } catch (error) {
      setGeoError(
        error instanceof Error && error.message === "Geolocation tidak didukung browser"
          ? error.message
          : geoErrorMessage(error),
      );
    } finally {
      setGeoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void requestLocation();
  }, [enabled, requestLocation]);

  const handlePhotoChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return null;
    let photoError: string | null = null;
    setPhotos((prev) => {
      if (prev.length + files.length > 3) {
        photoError = "Maksimal 3 foto";
        return prev;
      }
      return prev;
    });
    if (photoError) return photoError;
    const compressed = await Promise.all(files.map(compressImage));
    setPhotos((prev) => [...prev, ...compressed].slice(0, 3));
    return null;
  }, []);

  const validate = useCallback(() => {
    if (!notes.trim()) return "Catatan hasil wajib diisi";
    if (!address.trim()) return "Alamat/lokasi wajib diisi";
    return null;
  }, [notes, address]);

  const toFormData = useCallback(() => {
    const formData = new FormData();
    formData.append("notes", notes.trim());
    formData.append("address", address.trim());
    if (latitude !== null) formData.append("latitude", String(latitude));
    if (longitude !== null) formData.append("longitude", String(longitude));
    photos.forEach((photo) => formData.append("photos", photo));
    return formData;
  }, [notes, address, latitude, longitude, photos]);

  const reset = useCallback(() => {
    setNotes("");
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setPhotos([]);
    setGeoError("");
    setGeoLoading(false);
  }, []);

  return {
    notes,
    setNotes,
    address,
    setAddress,
    latitude,
    longitude,
    photos,
    geoError,
    geoLoading,
    requestLocation,
    handlePhotoChange,
    validate,
    toFormData,
    reset,
  };
}

export function EvidenceFields({
  notes,
  setNotes,
  address,
  setAddress,
  latitude,
  longitude,
  photos,
  geoError,
  geoLoading,
  onTagLocation,
  onPhotoChange,
}: {
  notes: string;
  setNotes: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  photos: File[];
  geoError: string;
  geoLoading: boolean;
  onTagLocation: () => void;
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const tagged = latitude !== null && longitude !== null;

  return (
    <div className="space-y-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <p className="text-sm font-semibold text-on-surface">Laporan selesai</p>
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan Hasil</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          required
          placeholder="Ringkasan hasil pekerjaan"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface p-4 transition hover:bg-surface-container-low active:scale-95">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Camera className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-on-surface">Ambil Foto</span>
          <span className="mt-1 text-center text-[11px] text-on-surface-variant">Opsional (maks. 3 foto)</span>
          <input id="photos" type="file" accept="image/*" capture="environment" multiple onChange={onPhotoChange} className="hidden" />
        </label>
        <button
          type="button"
          onClick={onTagLocation}
          disabled={geoLoading}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border bg-surface p-4 transition hover:bg-surface-container-low active:scale-95 disabled:pointer-events-none disabled:opacity-70",
            tagged && !geoError ? "border-emerald-300" : "border-outline-variant",
          )}
        >
          <div
            className={cn(
              "mb-2 flex h-12 w-12 items-center justify-center rounded-full",
              tagged && !geoError
                ? "bg-emerald-100 text-emerald-700"
                : "bg-secondary-container text-on-secondary-container",
            )}
          >
            {geoLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
          </div>
          <span className="text-sm font-semibold text-on-surface">Tag Lokasi</span>
          <span className="mt-1 text-center text-[11px] text-on-surface-variant">
            {geoLoading
              ? "Mencari GPS..."
              : tagged
                ? "Ketuk untuk perbarui GPS"
                : "Ketuk untuk ambil GPS saat ini"}
          </span>
        </button>
      </div>
      {photos.length > 0 ? (
        <p className="text-xs text-on-surface-variant">{photos.length} foto siap diunggah</p>
      ) : null}
      {geoError ? <p className="text-xs text-error">{geoError}</p> : null}
      {tagged ? (
        <LocationMap latitude={latitude} longitude={longitude} />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="address">Alamat lokasi</Label>
        <Input
          id="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
          placeholder="Alamat lokasi pekerjaan"
        />
      </div>
    </div>
  );
}
