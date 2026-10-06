"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type PageParent = {
  href: string;
  label: string;
  history?: boolean;
};

function parentFor(pathname: string, search: string): PageParent | null {
  if (pathname.startsWith("/admin/monitoring/") && pathname !== "/admin/monitoring") {
    return {
      href: search ? `/admin/monitoring?${search}` : "/admin/monitoring",
      label: "Monitoring tugas",
    };
  }

  if (/^\/admin\/pegawai\/[^/]+/.test(pathname)) {
    return { href: "/admin/pegawai", label: "Pegawai" };
  }

  if (pathname.startsWith("/pimpinan/") && pathname !== "/pimpinan") {
    return { href: "/pimpinan", label: "Kinerja" };
  }

  if (pathname === "/struktur") {
    return { href: "/profil", label: "Profil" };
  }

  if (pathname.startsWith("/tugas/")) {
    return { href: "/mandiri", label: "Kembali", history: true };
  }

  return null;
}

const linkClass =
  "mb-1 inline-flex items-center gap-0.5 text-sm font-semibold text-secondary transition hover:text-primary print:hidden";

function PageBackControl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const parent = parentFor(pathname, searchParams.toString());
  if (!parent) return null;

  if (parent.history) {
    return (
      <button
        type="button"
        className={linkClass}
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }
          router.push(parent.href);
        }}
      >
        <ChevronLeft className="h-4 w-4" />
        {parent.label}
      </button>
    );
  }

  return (
    <Link href={parent.href} className={linkClass}>
      <ChevronLeft className="h-4 w-4" />
      {parent.label}
    </Link>
  );
}

export function PageBackLink() {
  return (
    <Suspense fallback={null}>
      <PageBackControl />
    </Suspense>
  );
}
