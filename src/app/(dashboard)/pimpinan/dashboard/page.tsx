export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function PimpinanDashboardPage() {
  await requireUser(["personal"]);
  redirect("/pimpinan");
}
