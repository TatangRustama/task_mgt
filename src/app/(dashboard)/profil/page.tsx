import { signOut } from "@/auth";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { PageMain } from "@/components/layout/PageMain";
import { getAtasan, getDbOrgUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ChevronRight, LogOut, Settings } from "lucide-react";

export default async function ProfilPage() {
  const user = await requireUser();

  const orgUser = await getDbOrgUser(user.id);
  const unit = orgUser?.unit ?? (user.unitId ? await prisma.unit.findUnique({ where: { id: user.unitId } }) : null);
  const atasan = orgUser ? await getAtasan(orgUser) : null;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <PageMain className="md:grid md:grid-cols-12 md:gap-4">
      <div className="col-span-12 mt-2 flex flex-col items-center">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent bg-primary text-2xl font-bold text-white">
          {initials}
        </div>
        <h2 className="text-center text-2xl font-bold text-on-background">{user.name}</h2>
        <p className="mt-1 text-center text-sm text-secondary">{unit?.name || "Belum ditetapkan"}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">
            NIP: {user.nip}
          </span>
        </div>
      </div>

      <div className="col-span-12 mt-6 flex flex-col gap-4 md:col-span-6 md:col-start-4">
        <div className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest card-shadow">
          <h3 className="bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">
            Pengaturan akun
          </h3>
          <div className="border-t border-surface-container-highest px-4 py-4 text-sm text-on-surface-variant">
            <p>NIP: {user.nip}</p>
            <p className="mt-1">Unit: {unit?.name || "Belum ditetapkan"}</p>
            <p className="mt-1">
              Atasan: {atasan ? `${atasan.name}${atasan.unitName ? ` · ${atasan.unitName}` : ""}` : "Tidak ada"}
            </p>
          </div>
        </div>

        <ChangePasswordForm />

        {user.role === "personal" ? (
          <div className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest card-shadow">
            <h3 className="bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">
              Data kepegawaian
            </h3>
            {[
              { href: "/pegawai", label: "Pegawai" },
              { href: "/struktur", label: "Struktur organisasi" },
              { href: "/setting", label: "Setting" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between border-t border-surface-container-highest px-4 py-3 text-sm text-on-surface transition hover:bg-surface-container-low"
              >
                {item.label}
                <ChevronRight className="h-4 w-4 text-outline" />
              </Link>
            ))}
          </div>
        ) : null}

        {user.role === "super_admin" ? (
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-lg border border-surface-container-highest bg-surface-container-lowest p-4 card-shadow transition hover:bg-surface-container-low"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                <Settings className="h-5 w-5" />
              </div>
              <span className="text-base text-on-surface">Manajemen pengguna</span>
            </div>
            <ChevronRight className="h-5 w-5 text-outline" />
          </Link>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest card-shadow">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="group flex w-full items-center gap-4 p-4 text-left transition hover:bg-error-container"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-error transition group-hover:bg-error group-hover:text-on-error">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="text-base font-medium text-error">Logout</span>
            </button>
          </form>
        </div>
      </div>
    </PageMain>
  );
}
