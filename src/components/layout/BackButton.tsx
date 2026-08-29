"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { start } = useNavigationLoader();

  if (pathname === "/mandiri") return null;

  function handleBack() {
    start();
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/mandiri");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Kembali"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-secondary transition hover:bg-white/10 active:scale-95"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}
