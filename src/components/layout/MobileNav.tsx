"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavGroups, isNavActive, usesSidebarNav } from "@/lib/nav";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  role: Role;
  isLeader: boolean;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNav({
  role,
  isLeader = false,
  children,
}: {
  role: Role;
  isLeader?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sidebar = usesSidebarNav(role);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <MobileNavContext.Provider value={{ open, setOpen, role, isLeader }}>
      {children}
      {sidebar ? (
        <div className="app-frame-bar pointer-events-none top-0 z-[60] flex h-16 items-center px-2 md:hidden print:hidden">
          <button
            type="button"
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-secondary transition hover:bg-white/10 active:scale-95"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="mobile-sidebar"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" strokeWidth={2.4} />}
          </button>
        </div>
      ) : null}
      {sidebar ? <MobileSidebar /> : null}
    </MobileNavContext.Provider>
  );
}

function MobileSidebar() {
  const nav = useContext(MobileNavContext);
  const pathname = usePathname();
  if (!nav?.open) return null;

  const groups = getNavGroups(nav.role, { isLeader: nav.isLeader });

  return (
    <div className="md:hidden print:hidden">
      <button
        type="button"
        className="app-frame-bar fixed bottom-0 top-16 z-[80] bg-black/40"
        aria-label="Tutup menu"
        onClick={() => nav.setOpen(false)}
      />
      <aside
        id="mobile-sidebar"
        className="app-side fixed top-16 z-[80] flex h-[calc(100dvh-4rem)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-4 shadow-[8px_0_24px_rgba(27,33,86,0.12)]"
      >
        <nav className="mt-2 space-y-6 overflow-y-auto" aria-label="Menu">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              {group.label ? (
                <p className="px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {group.label}
                </p>
              ) : null}
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    onClick={() => nav.setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-secondary-container text-on-secondary-container"
                        : "text-secondary hover:bg-surface-container",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
