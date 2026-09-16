"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "kinerja-push-dismissed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function saveSubscription(registration: ServiceWorkerRegistration, publicKey: string) {
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) throw new Error("Gagal menyimpan langganan notifikasi.");
}

export function EnablePushNotifications() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    let cancelled = false;

    (async () => {
      const res = await fetch("/api/push/public-key");
      if (!res.ok) return;
      const data = (await res.json()) as { key?: string | null; enabled?: boolean };
      if (cancelled || !data.enabled || !data.key) return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (Notification.permission === "granted") {
        await saveSubscription(registration, data.key);
        return;
      }
      if (Notification.permission === "default") {
        setVisible(true);
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/push/public-key");
      const data = (await res.json()) as { key?: string | null };
      if (!data.key) {
        setError("Notifikasi belum dikonfigurasi di server.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, "1");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      await saveSubscription(registration, data.key);
      setVisible(false);
    } catch {
      setError("Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed left-3 right-3 top-[4.35rem] z-40 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface card-shadow md:left-auto md:right-6 md:w-[22rem] print:hidden">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Notifikasi tugas baru</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Izinkan notifikasi browser agar Anda tahu saat atasan memposting tugas.
          </p>
          {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void enable()}>
              {busy ? "Mengaktifkan..." : "Izinkan"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, "1");
                setVisible(false);
              }}
            >
              Nanti
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
