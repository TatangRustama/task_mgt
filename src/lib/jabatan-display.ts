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

export function isKepalaTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  title = title.toLowerCase().trim();
  return (
    title.startsWith("kepala") ||
    title.startsWith("sekretaris") ||
    title.startsWith("inspektur") ||
    title.includes("kepala dinas") ||
    title.includes("kepala badan") ||
    title.includes("kepala biro")
  );
}

/** Derive structural leadership position title (nama jabatan struktural) from a Unit Organisasi name. */
export function deriveNamaJabatan(unitName: string | null | undefined): string {
  const trimmed = (unitName ?? "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const isUpper = trimmed === trimmed.toUpperCase();

  if (lower.startsWith("inspektorat")) {
    const rest = trimmed.slice("inspektorat".length);
    return `${isUpper ? "INSPEKTUR" : "Inspektur"}${rest}`;
  }

  if (lower.startsWith("sekretariat")) {
    const rest = trimmed.slice("sekretariat".length);
    return `${isUpper ? "SEKRETARIS" : "Sekretaris"}${rest}`;
  }

  if (
    lower.startsWith("kepala ") ||
    lower.startsWith("sekretaris") ||
    lower.startsWith("inspektur")
  ) {
    return trimmed;
  }

  return `${isUpper ? "KEPALA" : "Kepala"} ${trimmed}`;
}

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
