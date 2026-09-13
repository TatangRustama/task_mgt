import { Prisma, Role } from "@prisma/client";
import { isStaffLoginIdentifier, privilegedEmail, privilegedUsername } from "@/lib/roles";

export const MANAGED_ROLES: Role[] = ["super_admin", "admin", "personal"];

export const userDetailSelect = {
  id: true,
  name: true,
  email: true,
  nip: true,
  role: true,
  jabatan: true,
  createdAt: true,
  updatedAt: true,
  unit: { select: { id: true, name: true } },
  pegawai: {
    select: {
      id: true,
      jenis: true,
      nip: true,
      nik: true,
      jabatanNama: true,
      unorNama: true,
      perangkatDaerahNama: true,
    },
  },
} satisfies Prisma.UserSelect;

export function credentialsForRole(role: Role, loginId: string) {
  const trimmed = loginId.trim();
  if (!MANAGED_ROLES.includes(role)) {
    return { ok: false as const, error: "Role tidak valid" };
  }
  if (!trimmed) {
    return {
      ok: false as const,
      error: role === "personal" ? "NIP/NIK wajib diisi" : "Username wajib diisi",
    };
  }
  if (role === "personal") {
    if (!isStaffLoginIdentifier(trimmed)) {
      return {
        ok: false as const,
        error: "Pegawai personal harus login dengan NIP atau NIK (angka)",
      };
    }
    const nip = trimmed.replace(/\D/g, "");
    return { ok: true as const, nip, email: `${nip}@simpeg.local` };
  }
  if (isStaffLoginIdentifier(trimmed)) {
    return {
      ok: false as const,
      error: "Username super admin/admin tidak boleh berupa NIP atau NIK",
    };
  }
  return {
    ok: true as const,
    nip: privilegedUsername(trimmed),
    email: privilegedEmail(trimmed),
  };
}
