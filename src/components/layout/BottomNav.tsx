"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItems, isNavActive, type AppNavItem } from "@/lib/nav";
import { MandiriCreateControl } from "@/components/layout/CreateTaskFab";

export function BottomNav({
  role,
  canCreateMandiri = false,
}: {
  role: Role;
  canCreateMandiri?: boolean;
}) {
  const pathname = usePathname();
  const items = getNavItems(role);
  const boardAt = items.findIndex((item) => item.href === "/board");
  const before = boardAt >= 0 ? items.slice(0, boardAt + 1) : items;
  const after = boardAt >= 0 ? items.slice(boardAt + 1) : [];

  function renderItem({ href, label, icon: Icon }: AppNavItem) {
    const active = isNavActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-0.5 text-[11px] font-medium leading-4 transition-colors",
          active ? "text-primary" : "text-secondary"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.7} />
        <span className={cn("truncate", active && "font-semibold")}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[70] w-full overflow-visible border-t border-outline-variant bg-surface-container-lowest pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(27,33,86,0.12)] md:left-64">
      <div className="flex h-14 w-full items-center px-1">
        {before.map(renderItem)}
        {canCreateMandiri ? <MandiriCreateControl layout="footer" /> : null}
        {after.map(renderItem)}
      </div>
    </nav>
  );
}
