"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const DURATION_MS = 300;

export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      inert={!visible || undefined}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "min-h-0 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
