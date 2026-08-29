"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItems, isNavActive } from "@/lib/nav";

export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-64px)] w-64 flex-col border-r border-surface-variant bg-surface-container-lowest p-4 md:flex">
      <nav className="mt-4 space-y-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-secondary hover:bg-surface-container-high"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
