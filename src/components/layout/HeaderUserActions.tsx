"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { AtasanTaskNotice } from "@/lib/notification-types";
import { cn, formatRelativeTime } from "@/lib/utils";

const iconBtnClass =
  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-secondary transition hover:bg-white/10 active:scale-95";

export function HeaderNotifications({
  initialCount,
  initialItems,
}: {
  initialCount: number;
  initialItems: AtasanTaskNotice[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState(initialItems);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/notifications/atasan")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ count: number; items: AtasanTaskNotice[] }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setCount(data.count);
        setItems(data.items);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname]);

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

  const badgeLabel = count > 9 ? "9+" : String(count);

  return (
    <div className="relative flex items-center" ref={panelRef}>
      <button
        type="button"
        aria-label={count > 0 ? `Notifikasi, ${count} tugas baru dari atasan` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cn(iconBtnClass, open && "bg-white/15")}
      >
        <Bell className="h-6 w-6" />
        {count > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error">
            {badgeLabel}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className="absolute top-[calc(100%+8px)] left-0 z-50 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4 text-on-surface card-shadow"
        >
          <p className="text-sm font-semibold text-on-surface">Notifikasi</p>
          {items.length === 0 ? (
            <p className="mt-1 text-sm text-on-surface-variant">Belum ada tugas baru dari atasan.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tugas/${task.id}`}
                    className="block rounded-lg px-2 py-1.5 transition hover:bg-surface-container"
                  >
                    <p className="truncate text-sm font-medium text-on-surface" title={task.title}>
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      Dari {task.createdByName} · {formatRelativeTime(task.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
