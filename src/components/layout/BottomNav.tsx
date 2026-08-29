"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItems, isNavActive } from "@/lib/nav";

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full rounded-t-lg border-t border-outline-variant bg-surface-container-lowest shadow-[0_-4px_12px_0_rgba(0,0,0,0.04)] md:hidden">
      <div className="flex h-20 w-full items-center px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "mx-1 flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[12px] font-medium leading-4 transition-[margin,background-color,transform] duration-200 hover:mx-2 hover:bg-surface-container-high active:scale-90",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-secondary"
              )}
            >
              <Icon className="mb-1 h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
              <span className={cn(active && "font-bold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
