import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { KepatuhanTemplateCard } from "@/components/setting/KepatuhanTemplateCard";
import { DEFAULT_KEPATUHAN_TEMPLATE, getStoredKepatuhanTemplate } from "@/lib/kepatuhan-template";
import { requireUser } from "@/lib/session";

export default async function SettingPesanPage() {
  await requireUser(["super_admin"]);
  const initialTemplate = getStoredKepatuhanTemplate();

  return (
    <PageMain className="max-w-4xl space-y-6">
      <PageHeader
        title="Pesan Teks"
        subtitle="Kelola template pesan teks untuk tombol Salin Info pada menu Kepatuhan."
      />
      <KepatuhanTemplateCard
        initialTemplate={initialTemplate}
        defaultTemplate={DEFAULT_KEPATUHAN_TEMPLATE}
      />
    </PageMain>
  );
}
