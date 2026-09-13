export const SATUAN_OPTIONS = [
  { value: "buah", label: "Buah" },
  { value: "unit", label: "Unit" },
  { value: "dokumen", label: "Dokumen" },
  { value: "berkas", label: "Berkas" },
  { value: "lembar", label: "Lembar" },
  { value: "halaman", label: "Halaman" },
  { value: "orang", label: "Orang" },
  { value: "hari", label: "Hari" },
  { value: "jam", label: "Jam" },
  { value: "paket", label: "Paket" },
  { value: "kegiatan", label: "Kegiatan" },
  { value: "laporan", label: "Laporan" },
  { value: "surat", label: "Surat" },
  { value: "file", label: "File" },
  { value: "lokasi", label: "Lokasi" },
  { value: "kali", label: "Kali" },
  { value: "set", label: "Set" },
  { value: "eksemplar", label: "Eksemplar" },
  { value: "sampel", label: "Sampel" },
  { value: "persen", label: "Persen" },
] as const;

export type SatuanValue = (typeof SATUAN_OPTIONS)[number]["value"];

const SATUAN_SET = new Set<string>(SATUAN_OPTIONS.map((option) => option.value));

export function satuanLabel(value: string | null | undefined) {
  if (!value) return "";
  return SATUAN_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatJumlahSatuan(
  jumlah: number | null | undefined,
  satuan: string | null | undefined,
) {
  if (jumlah == null || !satuan) return null;
  return `${jumlah} ${satuanLabel(satuan)}`;
}

export type ParsedJumlahSatuan =
  | { ok: true; jumlahIntervensi: number | null; satuan: string | null }
  | { ok: false; error: string };

export function parseJumlahSatuan(
  rawJumlah: unknown,
  rawSatuan: unknown,
  required: boolean,
): ParsedJumlahSatuan {
  const jumlahText = rawJumlah == null ? "" : String(rawJumlah).trim();
  const satuanText = rawSatuan == null ? "" : String(rawSatuan).trim();
  const hasJumlah = jumlahText !== "";
  const hasSatuan = satuanText !== "";

  if (!hasJumlah && !hasSatuan) {
    if (required) {
      return { ok: false, error: "Jumlah yang diintervensi dan satuan wajib diisi" };
    }
    return { ok: true, jumlahIntervensi: null, satuan: null };
  }

  if (!hasJumlah || !hasSatuan) {
    return {
      ok: false,
      error: required
        ? "Jumlah yang diintervensi dan satuan wajib diisi"
        : "Isi jumlah dan satuan bersama, atau kosongkan keduanya",
    };
  }

  const jumlah = Number(jumlahText);
  if (!Number.isInteger(jumlah) || jumlah < 1) {
    return { ok: false, error: "Jumlah yang diintervensi harus berupa angka bulat minimal 1" };
  }

  if (!SATUAN_SET.has(satuanText)) {
    return { ok: false, error: "Satuan tidak valid" };
  }

  return { ok: true, jumlahIntervensi: jumlah, satuan: satuanText };
}
