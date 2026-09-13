import { SuperAdminPegawaiList } from "@/components/admin/SuperAdminPegawaiList";
import { PageMain } from "@/components/layout/PageMain";
import { requireUser } from "@/lib/session";

export default async function SuperAdminPegawaiPage() {
  await requireUser(["super_admin"]);

  return (
    <PageMain className="max-w-4xl space-y-4">
      <SuperAdminPegawaiList />
    </PageMain>
  );
}
