import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function SettingPage() {
  await requireUser(["super_admin"]);
  redirect("/setting/pesan");
}
