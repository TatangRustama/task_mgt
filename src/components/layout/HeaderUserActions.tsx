"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarState";
import type { UserNotifications } from "@/lib/notification-types";
import { cn, formatRelativeTime } from "@/lib/utils";

const iconBtnClass =
  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-secondary transition hover:bg-white/10 active:scale-95";

export function HeaderMenuButton() {
  const { collapsed, drawer, isDesktop, toggle } = useSidebar();
  const expanded = isDesktop ? !collapsed : drawer;

  return (
    <button
      type="button"
      className={cn(iconBtnClass, drawer && "bg-white/15")}
      aria-label={expanded ? "Tutup menu" : "Buka menu"}
      aria-expanded={expanded}
      aria-controls="app-sidebar"
      onClick={toggle}
    >
      {drawer ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" strokeWidth={2.4} />}
    </button>
  );
}

export function HeaderNotifications({ initial }: { initial: UserNotifications }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next = (await res.json()) as UserNotifications;
        if (!cancelled) setData(next);
      } catch {
        // Keep the last successful payload when the request fails.
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 20_000);

    function onVisibility() {
      if (!document.hidden) void load();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const { collapsed } = useSidebar();
  const badgeLabel = data.count > 9 ? "9+" : String(data.count);

  return (
    <div className="relative flex items-center" ref={panelRef}>
      <button
        type="button"
        aria-label={data.count > 0 ? `Notifikasi, ${data.count} item` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cn(iconBtnClass, open && "bg-white/15")}
      >
        <Bell className="h-6 w-6" />
        {data.count > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error">
            {badgeLabel}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className={cn(
            "fixed left-3 right-3 top-[4.25rem] z-[60] max-h-[min(24rem,calc(100dvh-5.5rem))] overflow-y-auto rounded-xl border-2 border-secondary-navy bg-surface-container-lowest p-4 text-on-surface shadow-[0_0_0_2px_#fff] md:right-auto md:top-[4.5rem] md:w-[22rem]",
            collapsed
              ? "md:left-[max(0px,calc((100%-80rem)/2))]"
              : "md:left-[max(16rem,calc((100%-80rem)/2+16rem))]",
          )}
        >
          <p className="text-sm font-semibold text-on-surface">Notifikasi</p>
          {data.sections.length === 0 || data.count === 0 ? (
            <p className="mt-1 text-sm text-on-surface-variant">Tidak ada notifikasi baru.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {data.sections.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                      {section.title}
                    </p>
                    <Link
                      href={section.href}
                      className="text-xs font-medium text-tertiary hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {section.count} total
                    </Link>
                  </div>
                  {section.items.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Tidak ada item.</p>
                  ) : (
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={`${section.id}-${item.id}`}>
                          <Link
                            href={item.href}
                            className="block rounded-lg px-2 py-1.5 transition hover:bg-surface-container"
                            onClick={() => setOpen(false)}
                          >
                            <p className="break-words text-sm font-medium text-on-surface" title={item.title}>
                              {item.title}
                            </p>
                            <p className="mt-0.5 break-words text-xs text-on-surface-variant">
                              {item.subtitle} · {formatRelativeTime(item.at)}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
