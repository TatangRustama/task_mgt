import type { Jabatan } from "@prisma/client";

export const jabatanRoleLabel: Record<Jabatan, string> = {
  kepala_kantor: "Kepala Kantor",
  kepala_bidang: "Kepala Bidang",
  kepala_sub_bidang: "Kepala Sub Bidang",
  pelaksana: "Staf Pelaksana",
};

export type PegawaiJabatanSource = {
  jenis?: string | null;
  jabatanNama?: string | null;
};

/** Visible jabatan text: nama jabatan for ASN, "-" for Non-ASN. Never "Staf Pelaksana". */
export function displayJabatan(
  pegawai?: PegawaiJabatanSource | null,
  roleJabatan?: Jabatan | null,
): string {
  if (pegawai?.jenis === "non_asn") return "-";
  const nama = pegawai?.jabatanNama?.trim();
  if (nama) return nama;
  if (roleJabatan && roleJabatan !== "pelaksana") return jabatanRoleLabel[roleJabatan];
  return "-";
}
