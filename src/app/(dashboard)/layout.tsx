import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { AppContent, SidebarStateProvider } from "@/components/layout/SidebarState";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { MandiriCreateControl } from "@/components/layout/CreateTaskFab";
import { EnablePushNotifications } from "@/components/layout/EnablePushNotifications";
import { JabatanSwitcher } from "@/components/layout/JabatanSwitcher";
import { getActiveLeadershipScope, getDbOrgUser, isUnitLeader, listLeadershipScopes } from "@/lib/org";
import { canUseEmployeeApp, isAppAdmin, isPersonal, isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const canCreateMandiri = canUseEmployeeApp(user.role);
  const orgUser = await getDbOrgUser(user.id);
  const pegawai = orgUser?.pegawai;
  const isLeader = Boolean(orgUser && isUnitLeader(orgUser));
  const scopes = orgUser && !isSuperAdmin(user.role) ? listLeadershipScopes(orgUser) : [];
  const activeScope = orgUser && scopes.length > 1 ? await getActiveLeadershipScope(orgUser) : null;
  const pegawaiIdentity =
    pegawai?.jenis === "non_asn" ? `NIK ${pegawai.nik || "-"}` : `NIP ${pegawai?.nip || user.nip}`;
  const identity = isSuperAdmin(user.role)
    ? "Super Admin"
    : isAppAdmin(user.role)
      ? "Admin OPD"
      : user.superAdmin
        ? `${pegawaiIdentity} · Super Admin`
        : user.opdAdmin
          ? `${pegawaiIdentity} · Admin OPD`
          : pegawaiIdentity;

  return (
    <SidebarStateProvider>
    <div className="min-h-screen bg-surface-container-high print:bg-white">
      <Header userName={user.name} identity={identity} />
      <SideNav role={user.role} isLeader={isLeader} opdAdmin={user.opdAdmin} superAdmin={user.superAdmin} />
      <AppContent keepFooter={isPersonal(user.role) && (user.opdAdmin || user.superAdmin)}>
        {activeScope && scopes.length > 1 ? (
          <JabatanSwitcher
            scopes={scopes.map((scope) => ({ id: scope.id, label: scope.label }))}
            activeId={activeScope.id}
          />
        ) : null}
        {children}
      </AppContent>
      <BottomNav role={user.role} isLeader={isLeader} opdAdmin={user.opdAdmin} superAdmin={user.superAdmin} />
      {canCreateMandiri ? <MandiriCreateControl /> : null}
      {canCreateMandiri ? <EnablePushNotifications /> : null}
    </div>
    </SidebarStateProvider>
  );
}
