"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItems, isNavActive } from "@/lib/nav";
import { MandiriCreateControl } from "@/components/layout/CreateTaskFab";

export function SideNav({
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

  function renderItem({ href, label, icon: Icon }: (typeof items)[number]) {
    const active = isNavActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
          active
            ? "bg-secondary-container text-on-secondary-container"
            : "text-secondary hover:bg-surface-container"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-64px)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-4 md:flex">
      <nav className="mt-4 space-y-2">
        {before.map(renderItem)}
        {canCreateMandiri ? <MandiriCreateControl layout="sidebar" /> : null}
        {after.map(renderItem)}
      </nav>
    </aside>
  );
}
