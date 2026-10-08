"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { LogOut } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarState";
import { logout } from "@/lib/logout";
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
  const { collapsed, drawer, isDesktop, closeDrawer } = useSidebar();
  const groups = getNavGroups(role, { isLeader });
  const shown = isDesktop ? !collapsed : drawer;

  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-[75] bg-black/40 transition-opacity duration-300 ease-out md:hidden print:hidden motion-reduce:transition-none",
          drawer ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!drawer}
        aria-label="Tutup menu"
        tabIndex={drawer ? 0 : -1}
        onClick={closeDrawer}
      />
    <aside
      id="app-sidebar"
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "app-side fixed top-16 z-[80] flex h-[calc(100dvh-4rem)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-4 transition-transform duration-300 ease-out print:hidden motion-reduce:transition-none",
        drawer ? "translate-x-0" : "pointer-events-none -translate-x-full",
        collapsed
          ? "md:pointer-events-none md:-translate-x-[calc(100%+max(0px,(100vw-var(--app-frame))/2))]"
          : "md:pointer-events-auto md:translate-x-0",
      )}
    >
      <nav className="mt-2 min-h-0 flex-1 space-y-6 overflow-y-auto">
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
        <div className="border-t border-outline-variant pt-4">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-error transition-colors hover:bg-error-container"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
              Logout
            </button>
          </form>
        </div>
      </nav>
    </aside>
    </>
  );
}
