"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationLoaderContextValue = {
  start: () => void;
};

const NavigationLoaderContext = createContext<NavigationLoaderContextValue>({
  start: () => {},
});

export function useNavigationLoader() {
  return useContext(NavigationLoaderContext);
}

export function NavigationLoader({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = window.setTimeout(() => setVisible(true), 120);
    hideTimer.current = window.setTimeout(() => setVisible(false), 12000);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || (anchor.target && anchor.target !== "_self")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next === current) return;
      start();
    };

    const onPopState = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  return (
    <NavigationLoaderContext.Provider value={{ start }}>
      {children}
      <Suspense fallback={null}>
        <RouteChangeListener onChange={stop} />
      </Suspense>
      {visible ? <LoaderOverlay /> : null}
    </NavigationLoaderContext.Provider>
  );
}

function RouteChangeListener({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousKey = useRef(routeKey);

  useEffect(() => {
    if (previousKey.current !== routeKey) {
      previousKey.current = routeKey;
      onChange();
    }
  }, [routeKey, onChange]);

  return null;
}

function LoaderOverlay() {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-[2px] no-print"
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman"
    >
      <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-surface-container">
        <div className="nav-loader-bar h-full w-1/3 rounded-full bg-gradient-to-r from-secondary-navy via-accent to-secondary-navy" />
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-container-highest bg-surface-container-lowest px-8 py-7 card-shadow">
        <svg
          className="h-12 w-12 animate-spin text-primary-container"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
          <path
            d="M42 24a18 18 0 0 0-18-18"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm font-semibold text-secondary-navy">
          Memuat...
        </p>
      </div>
    </div>
  );
}
