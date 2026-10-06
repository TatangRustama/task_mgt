"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItems, isNavActive, usesSidebarNav, type AppNavItem } from "@/lib/nav";

export function BottomNav({
  role,
  isLeader = false,
}: {
  role: Role;
  isLeader?: boolean;
}) {
  const pathname = usePathname();
  if (usesSidebarNav(role)) return null;
  const items = getNavItems(role, { isLeader });

  function renderItem({ href, label, icon: Icon }: AppNavItem) {
    const active = isNavActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        prefetch
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-0.5 text-[11px] font-medium leading-4 transition-colors",
          active ? "text-primary" : "text-secondary",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.7} />
        <span className={cn("truncate", active && "font-semibold")}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="app-frame-bar app-bottom bottom-0 z-[70] overflow-visible border-t border-outline-variant bg-surface-container-lowest pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(27,33,86,0.12)] print:hidden">
      <div className="flex h-14 w-full items-center px-1">{items.map(renderItem)}</div>
    </nav>
  );
}
