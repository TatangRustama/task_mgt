import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { PegawaiForm } from "@/components/pegawai/PegawaiForm";
import { canManageNonAsn } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function PegawaiPage() {
  const user = await requireUser(["personal", "admin"]);
  const canAddNonAsn = canManageNonAsn(user.role);

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Pegawai"
        subtitle={
          canAddNonAsn
            ? "Daftar pegawai dalam unit Anda, dan tambah pegawai Non-ASN."
            : "Daftar pegawai dalam unit Anda."
        }
      />
      <PegawaiForm canAddNonAsn={canAddNonAsn} />
    </PageMain>
  );
}
