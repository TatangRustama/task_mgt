"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  collapsed: boolean;
  drawer: boolean;
  isDesktop: boolean;
  toggle: () => void;
  closeDrawer: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const value = useContext(SidebarContext);
  if (!value) throw new Error("useSidebar harus dipakai di dalam SidebarStateProvider");
  return value;
}

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    function onChange() {
      setIsDesktop(media.matches);
      if (media.matches) setDrawer(false);
    }
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawer(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawer]);

  function toggle() {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setCollapsed((value) => !value);
      return;
    }
    setDrawer((value) => !value);
  }

  return (
    <SidebarContext.Provider
      value={{ collapsed, drawer, isDesktop, toggle, closeDrawer: () => setDrawer(false) }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function AppContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        "app-frame min-h-screen bg-background pb-24 pt-16 shadow-[0_0_40px_rgba(27,33,86,0.06)] transition-[padding-left] duration-300 ease-out print:m-0 print:bg-white print:p-0 print:shadow-none motion-reduce:transition-none md:pb-8",
        !collapsed && "md:pl-64",
      )}
    >
      {children}
    </div>
  );
}
