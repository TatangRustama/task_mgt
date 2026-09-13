import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { PegawaiForm } from "@/components/pegawai/PegawaiForm";
import { canManageNonAsn, isAppAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function PegawaiPage() {
  const user = await requireUser(["personal", "admin"]);
  const canAddNonAsn = canManageNonAsn(user.role);
  const adminOnly = isAppAdmin(user.role);

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Pegawai"
        subtitle={
          adminOnly
            ? "Tambah pegawai baru, khususnya Non-ASN."
            : "Daftar pegawai dalam unit Anda, atau cari ASN dengan NIP."
        }
      />
      <PegawaiForm canAddNonAsn={canAddNonAsn} defaultJenis={adminOnly ? "non_asn" : "asn"} />
    </PageMain>
  );
}
