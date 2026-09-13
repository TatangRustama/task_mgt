"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavGroups, isNavActive } from "@/lib/nav";

export function SideNav({
  role,
  isLeader = false,
}: {
  role: Role;
  isLeader?: boolean;
}) {
  const pathname = usePathname();
  const groups = getNavGroups(role, { isLeader });

  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-64px)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-4 md:flex">
      <nav className="mt-4 space-y-6">
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
  );
}
