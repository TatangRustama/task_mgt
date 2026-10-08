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
import { AppLoader } from "@/components/layout/AppLoader";

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
  const hideTimer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setVisible(true);
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
      {visible ? <AppLoader /> : null}
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

