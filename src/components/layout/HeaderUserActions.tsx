"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { UserNotifications } from "@/lib/notification-types";
import { cn, formatRelativeTime } from "@/lib/utils";

const iconBtnClass =
  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-secondary transition hover:bg-white/10 active:scale-95";

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

    fetch("/api/notifications")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<UserNotifications>;
      })
      .then((next) => {
        if (cancelled || !next) return;
        setData(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
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
          className="fixed left-3 right-3 top-[4.25rem] z-50 max-h-[min(24rem,calc(100dvh-5.5rem))] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-on-surface card-shadow md:absolute md:left-0 md:right-auto md:top-[calc(100%+8px)] md:w-[22rem]"
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
