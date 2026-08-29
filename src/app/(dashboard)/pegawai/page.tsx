import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { PegawaiForm } from "@/components/pegawai/PegawaiForm";
import { requireUser } from "@/lib/session";

export default async function PegawaiPage() {
  await requireUser();

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Pegawai"
        subtitle="Daftar pegawai pada unit di bawah Anda, atau cari ASN dengan NIP."
      />
      <PegawaiForm />
    </PageMain>
  );
}
