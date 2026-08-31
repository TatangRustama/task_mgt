export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { kinerjaHref } from "@/lib/laporan-url";
import { requireUser } from "@/lib/session";
import { formatISODate, isISODate, parseISODate } from "@/lib/utils";

export default async function PimpinanDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    month?: string;
    year?: string;
  }>;
}) {
  await requireUser(["admin", "pimpinan"]);
  const params = await searchParams;
  const today = formatISODate(new Date());
  const date = isISODate(params.date) ? params.date : today;
  const selected = parseISODate(date);

  redirect(
    kinerjaHref({
      view: params.view === "harian" ? "harian" : "bulanan",
      date,
      month: Number(params.month || selected.getMonth() + 1),
      year: Number(params.year || selected.getFullYear()),
    }),
  );
}
