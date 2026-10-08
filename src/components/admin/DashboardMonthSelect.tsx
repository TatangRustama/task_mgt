"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AppLoader } from "@/components/layout/AppLoader";
import type { DashboardMonthChoice } from "@/lib/admin-dashboard-shared";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm capitalize focus-visible:border-primary-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-container disabled:opacity-60 sm:w-56";

export function DashboardMonthSelect({
  value,
  options,
}: {
  value: string;
  options: DashboardMonthChoice[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
      <label htmlFor="dashboard-bulan" className="text-xs font-medium text-on-surface-variant">
        Bulan
      </label>
      <select
        id="dashboard-bulan"
        className={selectClassName}
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          const params = new URLSearchParams(window.location.search);
          if (next) params.set("bulan", next);
          else params.delete("bulan");
          const query = params.toString();
          startTransition(() => {
            router.push(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
          });
        }}
      >
        <option value="">3 bulan terakhir</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {pending ? <AppLoader /> : null}
    </div>
  );
}
