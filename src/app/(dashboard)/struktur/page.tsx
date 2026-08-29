import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { StrukturOrganisasi } from "@/components/struktur/StrukturOrganisasi";
import { requireUser } from "@/lib/session";

export default async function StrukturPage() {
  await requireUser();

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Struktur"
        subtitle="Cari perangkat daerah atau unit organisasi, lalu lihat hierarkinya."
      />
      <StrukturOrganisasi />
    </PageMain>
  );
}
