import { UnitType } from "@prisma/client";

const DEFAULT_BASE_URL = "https://simpegpb.pondokmatoa.id";

export type SimpegUnor = {
  id: string;
  nama_unit: string;
  parent_id: string | null;
  parent_nama: string | null;
  perangkat_daerah_id: string | null;
  perangkat_daerah_nama: string | null;
  eselon_id: string | null;
  status_unor: string | null;
};

export type SimpegPegawai = {
  nip: string;
  nama: string;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  email: string | null;
  no_hp: string | null;
  kedudukan_hukum_id: string | null;
  kedudukan_hukum: string | null;
  tingkat_pendidikan: string | null;
  status_oap: string | null;
  golongan_id: string | null;
  golongan_nama: string | null;
  jenis_jabatan_id: string | null;
  jenis_jabatan_nama: string | null;
  jabatan_id: string | null;
  jabatan_nama: string | null;
  unor_id: string | null;
  unor_nama: string | null;
  perangkat_daerah_id: string | null;
  perangkat_daerah_nama: string | null;
};

type LaravelPage<T> = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  data?: T[];
};

export function isSimpegConfigured() {
  return Boolean(process.env.SIMPEG_API_TOKEN?.trim());
}

export function simpegBaseUrl() {
  return (process.env.SIMPEG_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function authHeader() {
  const token = process.env.SIMPEG_API_TOKEN?.trim();
  if (!token) {
    throw new Error("SIMPEG_API_TOKEN belum diatur");
  }
  return `Bearer ${token}`;
}

async function simpegGet(path: string) {
  const url = `${simpegBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Simpeg ${path} gagal (${res.status})${body ? `: ${body.slice(0, 180)}` : ""}`);
  }
  return res.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function unwrapPage<T>(json: unknown): LaravelPage<T> {
  const root = asRecord(json);
  if (!root) return { data: [] };
  const nested = asRecord(root.data);
  if (nested && Array.isArray(nested.data)) {
    return nested as LaravelPage<T>;
  }
  if (Array.isArray(root.data)) {
    return root as LaravelPage<T>;
  }
  return { data: [] };
}

function unwrapPegawai(json: unknown): SimpegPegawai | null {
  const root = asRecord(json);
  if (!root) return null;
  const nested = asRecord(root.data);
  if (nested && typeof nested.nip === "string") {
    return nested as unknown as SimpegPegawai;
  }
  if (typeof root.nip === "string") {
    return root as unknown as SimpegPegawai;
  }
  return null;
}

export async function fetchSimpegPage<T>(path: string, page: number) {
  const separator = path.includes("?") ? "&" : "?";
  const json = await simpegGet(`${path}${separator}page=${page}`);
  const payload = unwrapPage<T>(json);
  return {
    items: payload.data ?? [],
    page: payload.current_page ?? page,
    lastPage: payload.last_page ?? 1,
    total: payload.total ?? (payload.data?.length ?? 0),
  };
}

export async function fetchAllSimpegPages<T>(
  path: string,
  onPage?: (info: { page: number; lastPage: number; total: number; fetched: number }) => void,
) {
  const all: T[] = [];
  let page = 1;
  let lastPage = 1;
  let total = 0;
  do {
    const result = await fetchSimpegPage<T>(path, page);
    all.push(...result.items);
    lastPage = result.lastPage;
    total = result.total;
    onPage?.({ page, lastPage, total, fetched: all.length });
    page += 1;
  } while (page <= lastPage);
  return { items: all, total };
}

export async function fetchSimpegUnor() {
  return fetchAllSimpegPages<SimpegUnor>("/api/external/unor");
}

export async function fetchSimpegPegawaiPage(page: number) {
  return fetchSimpegPage<SimpegPegawai>("/api/external/pegawai", page);
}

export async function fetchSimpegPegawaiByNip(nip: string) {
  const encoded = encodeURIComponent(nip.trim());
  const json = await simpegGet(`/api/external/pegawai/${encoded}`);
  return unwrapPegawai(json);
}

export function mapEselonToUnitType(eselonId: string | null | undefined, namaUnit: string): UnitType {
  const eselon = String(eselonId || "").trim();
  if (eselon === "11" || eselon === "12" || eselon === "21" || eselon === "22") return "kantor";
  if (eselon === "31") return "bidang";
  if (eselon === "32" || eselon === "41" || eselon === "42") return "sub_bidang";

  const name = namaUnit.toLowerCase();
  if (
    name.includes("subbag") ||
    name.includes("sub bag") ||
    name.includes("subbid") ||
    name.includes("sub bid") ||
    name.includes("seksi")
  ) {
    return "sub_bidang";
  }
  if (name.includes("bidang") || name.includes("bagian")) return "bidang";
  if (
    name.includes("dinas") ||
    name.includes("badan") ||
    name.includes("sekretariat") ||
    name.includes("inspektorat") ||
    name.includes("kantor")
  ) {
    return "kantor";
  }
  return "bidang";
}

export function displayPegawaiName(pegawai: Pick<SimpegPegawai, "nama" | "gelar_depan" | "gelar_belakang">) {
  return [pegawai.gelar_depan, pegawai.nama, pegawai.gelar_belakang]
    .map((part) => String(part || "").trim())
    .filter((part) => part && part !== "," && part !== "-")
    .join(" ")
    .replace(/\s+,/g, ",")
    .replace(/^,\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

export function parseSimpegDate(value: unknown): Date | null {
  const text = str(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
