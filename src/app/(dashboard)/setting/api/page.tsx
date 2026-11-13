import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { ExternalApiCard } from "@/components/setting/ExternalApiCard";
import { getStoredApiTokens } from "@/lib/api-tokens";
import { requireUser } from "@/lib/session";

export default async function SettingApiPage() {
  await requireUser(["super_admin"]);
  const initialTokens = getStoredApiTokens();

  return (
    <PageMain className="max-w-5xl space-y-6">
      <PageHeader
        title="API Eksternal"
        subtitle="Kelola token integrasi API eksternal."
      />
      <ExternalApiCard initialTokens={initialTokens} />
    </PageMain>
  );
}
