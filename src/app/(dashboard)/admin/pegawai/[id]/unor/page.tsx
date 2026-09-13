import { PindahUnorPage } from "@/components/admin/PindahUnorPage";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { requireUser } from "@/lib/session";

export default async function SuperAdminPindahUnorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser(["super_admin"]);
  const { id } = await params;

  return (
    <PageMain className="max-w-4xl space-y-4">
      <PageHeader
        title="Pindah UNOR"
        subtitle="Pilih unit organisasi pada treeview, lalu tekan Pilih untuk menetapkan naungan pegawai."
      />
      <PindahUnorPage pegawaiId={id} />
    </PageMain>
  );
}
