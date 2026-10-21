import { SuperAdminPegawaiList } from "@/components/admin/SuperAdminPegawaiList";
import { PageMain } from "@/components/layout/PageMain";
import { requireUser } from "@/lib/session";
import { adminScopeNotice, getAdminScope } from "@/lib/admin-scope";
import { hasSuperAdminAccess } from "@/lib/roles";

export default async function SuperAdminPegawaiPage() {
  const user = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(user);
  const notice = adminScopeNotice(scope);

  return (
    <PageMain className="max-w-4xl space-y-4">
      {notice ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
          {notice}
        </p>
      ) : null}
      <SuperAdminPegawaiList
        subtitle={
          scope.unrestricted
            ? undefined
            : "Pegawai pada unit organisasi Anda. Saring berdasarkan nama, NIP/NIK, pangkat/golongan, jenis pegawai, dan unit."
        }
        allowAsn={hasSuperAdminAccess(user)}
      />
    </PageMain>
  );
}
