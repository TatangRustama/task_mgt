import { deriveNamaJabatan } from "@/lib/jabatan-display";
import { prisma } from "@/lib/prisma";
import { assignUnitLeaders, ensureUserFromPegawai, syncPegawaiAccounts } from "@/lib/simpeg-accounts";
import {
  displayPegawaiName,
  fetchSimpegPegawaiByNip,
  fetchSimpegPegawaiPage,
  fetchSimpegUnor,
  mapEselonToUnitType,
  parseSimpegDate,
  str,
  type SimpegPegawai,
  type SimpegUnor,
} from "@/lib/simpeg";

export const SIMPEG_INSTANSI_ID = "simpeg-papua-barat";
export const SIMPEG_INSTANSI_NAME = "Pemerintah Provinsi Papua Barat";

export type SyncProgress = {
  step: "unor" | "pegawai" | "akun" | "done";
  message: string;
  current?: number;
  total?: number;
};

type ProgressFn = (progress: SyncProgress) => void;

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

async function ensureInstansi() {
  return prisma.instansi.upsert({
    where: { id: SIMPEG_INSTANSI_ID },
    update: { name: SIMPEG_INSTANSI_NAME },
    create: { id: SIMPEG_INSTANSI_ID, name: SIMPEG_INSTANSI_NAME },
  });
}

export function pegawaiRecordFromSimpeg(
  pegawai: SimpegPegawai,
  unitId: string | null,
  unitNameFallback?: string | null,
) {
  const nip = str(pegawai.nip);
  if (!nip) {
    throw new Error("NIP Simpeg kosong");
  }
  const name = displayPegawaiName(pegawai) || nip;
  const tempatLahir = str(pegawai.tempat_lahir);
  const unorNama = str(pegawai.unor_nama) || str(unitNameFallback);
  const jabatanNama = str(pegawai.jabatan_nama) || str(pegawai.jabatan);

  return {
    jenis: "asn" as const,
    nip,
    name,
    address: tempatLahir || unorNama || "",
    gelarDepan: str(pegawai.gelar_depan),
    gelarBelakang: str(pegawai.gelar_belakang),
    tempatLahir,
    tanggalLahir: parseSimpegDate(pegawai.tanggal_lahir),
    jenisKelamin: str(pegawai.jenis_kelamin),
    email: str(pegawai.email),
    noHp: str(pegawai.no_hp),
    kedudukanHukumId: str(pegawai.kedudukan_hukum_id),
    kedudukanHukum: str(pegawai.kedudukan_hukum),
    tingkatPendidikan: str(pegawai.tingkat_pendidikan),
    statusOap: str(pegawai.status_oap),
    golonganId: str(pegawai.golongan_id),
    golonganNama: str(pegawai.golongan_nama),
    jenisJabatanId: str(pegawai.jenis_jabatan_id),
    jenisJabatanNama: str(pegawai.jenis_jabatan_nama),
    jabatanId: str(pegawai.jabatan_id),
    jabatanNama,
    unorId: str(pegawai.unor_id),
    unorNama,
    perangkatDaerahId: str(pegawai.perangkat_daerah_id),
    perangkatDaerahNama: str(pegawai.perangkat_daerah_nama),
    unitId,
    syncedAt: new Date(),
  };
}

async function upsertAsnDirectory(nip: string, name: string, address: string) {
  await prisma.asnDirectory.upsert({
    where: { nip },
    update: { name, address: address || "-" },
    create: { nip, name, address: address || "-" },
  });
}

export async function upsertPegawaiFromSimpeg(pegawai: SimpegPegawai) {
  const rawUnorId = str(pegawai.unor_id);
  const unit = rawUnorId
    ? await prisma.unit.findFirst({
        where: { OR: [{ id: rawUnorId }, { externalId: rawUnorId }] },
        select: { id: true, name: true, perangkatDaerahId: true, perangkatDaerahNama: true },
      })
    : null;

  const data = pegawaiRecordFromSimpeg(pegawai, unit?.id ?? null, unit?.name ?? null);
  if (!data.perangkatDaerahId && unit?.perangkatDaerahId) {
    data.perangkatDaerahId = unit.perangkatDaerahId;
  }
  if (!data.perangkatDaerahNama && unit?.perangkatDaerahNama) {
    data.perangkatDaerahNama = unit.perangkatDaerahNama;
  }

  const existing = await prisma.pegawai.findUnique({
    where: { nip: data.nip },
    select: {
      id: true,
      deletedAt: true,
      unitId: true,
      unorId: true,
      unorNama: true,
      perangkatDaerahId: true,
      perangkatDaerahNama: true,
      jabatanNama: true,
      jenisJabatanNama: true,
    },
  });
  if (existing?.deletedAt) return null;

  // Preserve existing unit/jabatan if Simpeg returned null/empty
  if (!data.unitId && existing?.unitId) {
    data.unitId = existing.unitId;
  }
  if (!data.unorId && existing?.unorId) {
    data.unorId = existing.unorId;
  }
  if (!data.unorNama && existing?.unorNama) {
    data.unorNama = existing.unorNama;
  }
  if (!data.perangkatDaerahId && existing?.perangkatDaerahId) {
    data.perangkatDaerahId = existing.perangkatDaerahId;
  }
  if (!data.perangkatDaerahNama && existing?.perangkatDaerahNama) {
    data.perangkatDaerahNama = existing.perangkatDaerahNama;
  }
  if (!data.jabatanNama && existing?.jabatanNama) {
    data.jabatanNama = existing.jabatanNama;
  }
  if (!data.jenisJabatanNama && existing?.jenisJabatanNama) {
    data.jenisJabatanNama = existing.jenisJabatanNama;
  }

  const saved = await prisma.pegawai.upsert({
    where: { nip: data.nip },
    create: data,
    update: data,
  });
  await upsertAsnDirectory(data.nip, data.name, data.address);
  await ensureUserFromPegawai(saved);
  if (saved.unitId) {
    await assignUnitLeaders([saved.unitId]);
  }
  return saved;
}

export async function syncSimpegUnor(onProgress?: ProgressFn) {
  onProgress?.({ step: "unor", message: "Mengambil unit organisasi dari Simpeg..." });
  const { items } = await fetchSimpegUnor();
  const instansi = await ensureInstansi();
  const now = new Date();
  const ids = new Set(items.map((item) => item.id).filter(Boolean));
  const existingUnits = await prisma.unit.findMany({
    select: { id: true, namaJabatan: true },
  });
  const existingJabatanMap = new Map(existingUnits.map((u) => [u.id, u.namaJabatan]));

  onProgress?.({
    step: "unor",
    message: `Menyimpan ${items.length} unit organisasi...`,
    current: 0,
    total: items.length,
  });

  let processed = 0;
  for (const group of chunk(items, 20)) {
    await Promise.all(
      group.map((unor: SimpegUnor) => {
        const id = str(unor.id);
        const name = str(unor.nama_unit) || id;
        if (!id || !name) return Promise.resolve();
        const derivedJabatan = deriveNamaJabatan(name);
        const currentJabatan = existingJabatanMap.get(id);
        return prisma.unit.upsert({
          where: { id },
          create: {
            id,
            externalId: id,
            name,
            namaJabatan: derivedJabatan || null,
            instansiId: instansi.id,
            parentId: null,
            type: mapEselonToUnitType(str(unor.eselon_id), name),
            eselonId: str(unor.eselon_id),
            statusUnor: str(unor.status_unor),
            perangkatDaerahId: str(unor.perangkat_daerah_id),
            perangkatDaerahNama: str(unor.perangkat_daerah_nama),
            syncedAt: now,
          },
          update: {
            externalId: id,
            name,
            ...(currentJabatan?.trim() ? {} : { namaJabatan: derivedJabatan || null }),
            instansiId: instansi.id,
            type: mapEselonToUnitType(str(unor.eselon_id), name),
            eselonId: str(unor.eselon_id),
            statusUnor: str(unor.status_unor),
            perangkatDaerahId: str(unor.perangkat_daerah_id),
            perangkatDaerahNama: str(unor.perangkat_daerah_nama),
            syncedAt: now,
          },
        });
      }),
    );
    processed += group.length;
    onProgress?.({
      step: "unor",
      message: `Menyimpan unit organisasi ${processed}/${items.length}`,
      current: processed,
      total: items.length,
    });
  }

  const parentUpdates = items.flatMap((unor) => {
    const id = str(unor.id);
    const parentId = str(unor.parent_id);
    if (!id || !parentId || parentId === id || !ids.has(parentId)) return [];
    return [{ id, parentId }];
  });

  for (const group of chunk(parentUpdates, 40)) {
    await Promise.all(
      group.map((row) =>
        prisma.unit.update({
          where: { id: row.id },
          data: { parentId: row.parentId },
        }),
      ),
    );
  }

  return items.length;
}

async function syncPegawai(onProgress?: ProgressFn) {
  const first = await fetchSimpegPegawaiPage(1);
  const lastPage = first.lastPage || 1;
  const total = first.total || first.items.length;
  const unitMap = new Map(
    (
      await prisma.unit.findMany({
        where: { externalId: { not: null } },
        select: { id: true, name: true, perangkatDaerahId: true, perangkatDaerahNama: true },
      })
    ).map((unit) => [unit.id, unit]),
  );
  let saved = 0;
  const removedNips = new Set(
    (
      await prisma.pegawai.findMany({
        where: { deletedAt: { not: null } },
        select: { nip: true },
      })
    )
      .map((row) => row.nip)
      .filter((nip): nip is string => Boolean(nip)),
  );

  const existingPegawai = await prisma.pegawai.findMany({
    select: {
      nip: true,
      name: true,
      unitId: true,
      jabatanNama: true,
      golonganNama: true,
      perangkatDaerahId: true,
    },
  });
  const existingMap = new Map(existingPegawai.map((p) => [p.nip, p]));

  onProgress?.({
    step: "pegawai",
    message: `Mengambil pegawai halaman 1/${lastPage}...`,
    current: 0,
    total,
  });

  async function persistPage(items: SimpegPegawai[]) {
    const toUpsert: ReturnType<typeof pegawaiRecordFromSimpeg>[] = [];
    for (const pegawai of items) {
      const nip = str(pegawai.nip);
      if (!nip || removedNips.has(nip)) continue;
      const unorId = str(pegawai.unor_id);
      const unit = unorId ? unitMap.get(unorId) : null;
      const unitId = unit?.id ?? null;
      const data = pegawaiRecordFromSimpeg(pegawai, unitId, unit?.name ?? null);
      if (!data.perangkatDaerahId && unit?.perangkatDaerahId) {
        data.perangkatDaerahId = unit.perangkatDaerahId;
      }
      if (!data.perangkatDaerahNama && unit?.perangkatDaerahNama) {
        data.perangkatDaerahNama = unit.perangkatDaerahNama;
      }

      const existing = existingMap.get(nip);
      if (
        existing &&
        existing.name === data.name &&
        existing.unitId === data.unitId &&
        existing.jabatanNama === data.jabatanNama &&
        existing.golonganNama === data.golonganNama &&
        existing.perangkatDaerahId === data.perangkatDaerahId
      ) {
        saved += 1;
        continue;
      }
      toUpsert.push(data);
    }

    for (const group of chunk(toUpsert, 20)) {
      await Promise.all(
        group.map(async (data) => {
          await prisma.pegawai.upsert({
            where: { nip: data.nip },
            create: data,
            update: data,
          });
          existingMap.set(data.nip, {
            nip: data.nip,
            name: data.name,
            unitId: data.unitId,
            jabatanNama: data.jabatanNama,
            golonganNama: data.golonganNama,
            perangkatDaerahId: data.perangkatDaerahId,
          });
          saved += 1;
        }),
      );
    }

    onProgress?.({
      step: "pegawai",
      message: `Menyimpan pegawai ${Math.min(saved, total)}/${total}`,
      current: Math.min(saved, total),
      total,
    });
  }

  await persistPage(first.items);

  const pageNumbers: number[] = [];
  for (let page = 2; page <= lastPage; page += 1) {
    pageNumbers.push(page);
  }

  for (const pageGroup of chunk(pageNumbers, 4)) {
    onProgress?.({
      step: "pegawai",
      message: `Mengambil pegawai halaman ${pageGroup[0]}-${pageGroup[pageGroup.length - 1]}/${lastPage}...`,
      current: saved,
      total,
    });
    const results = await Promise.all(
      pageGroup.map(async (page) => {
        try {
          return await fetchSimpegPegawaiPage(page);
        } catch {
          // retry once on failure
          return await fetchSimpegPegawaiPage(page);
        }
      }),
    );
    for (const res of results) {
      await persistPage(res.items);
    }
  }

  return saved;
}

async function syncPegawaiAccountsWithProgress(onProgress?: ProgressFn) {
  onProgress?.({
    step: "akun",
    message: "Menyusun akun login dan pimpinan unit...",
  });
  const userCount = await syncPegawaiAccounts((message, current, total) => {
    onProgress?.({ step: "akun", message, current, total });
  });
  return userCount;
}

export async function syncSimpegPegawai(onProgress?: ProgressFn) {
  const pegawaiCount = await syncPegawai(onProgress);
  const userCount = await syncPegawaiAccountsWithProgress(onProgress);
  onProgress?.({
    step: "done",
    message: `Selesai: ${pegawaiCount} pegawai, ${userCount} akun`,
    current: userCount,
    total: userCount,
  });
  return { pegawaiCount, userCount };
}

export async function syncSimpeg(onProgress?: ProgressFn) {
  const unitCount = await syncSimpegUnor(onProgress);
  const pegawaiCount = await syncPegawai(onProgress);
  const userCount = await syncPegawaiAccountsWithProgress(onProgress);
  onProgress?.({
    step: "done",
    message: `Selesai: ${unitCount} unit, ${pegawaiCount} pegawai, ${userCount} akun`,
    current: userCount,
    total: userCount,
  });
  return { unitCount, pegawaiCount, userCount };
}

export async function refreshPegawaiFromSimpeg(id: string) {
  const local = await prisma.pegawai.findUnique({
    where: { id },
    select: { id: true, nip: true, jenis: true, deletedAt: true },
  });
  if (!local || local.deletedAt) {
    return { ok: false as const, error: "Pegawai tidak ditemukan", status: 404 };
  }
  if (local.jenis !== "asn" || !local.nip) {
    return {
      ok: false as const,
      error: "Hanya pegawai ASN yang dapat diperbarui dari Simpeg",
      status: 400,
    };
  }

  const remote = await fetchSimpegPegawaiByNip(local.nip);
  if (!remote) {
    return { ok: false as const, error: "Pegawai tidak ditemukan di Simpeg", status: 404 };
  }

  const saved = await upsertPegawaiFromSimpeg(remote);
  if (!saved) {
    return { ok: false as const, error: "Pegawai tidak ditemukan", status: 404 };
  }
  return { ok: true as const, id: saved.id };
}

export async function lookupOrSyncPegawaiByNip(nip: string) {
  const local = await prisma.pegawai.findUnique({ where: { nip } });
  if (local?.deletedAt) return null;
  if (local) {
    return { pegawai: local, source: "local" as const, alreadySaved: true };
  }

  try {
    const remote = await fetchSimpegPegawaiByNip(nip);
    if (remote) {
      const pegawai = await upsertPegawaiFromSimpeg(remote);
      if (!pegawai) return null;
      return { pegawai, source: "simpeg" as const, alreadySaved: true };
    }
  } catch {
    // Fall through to local directory when Simpeg is unreachable.
  }

  const directory = await prisma.asnDirectory.findUnique({
    where: { nip },
    select: { nip: true, name: true, address: true },
  });
  if (!directory) return null;
  return {
    pegawai: {
      nip: directory.nip,
      name: directory.name,
      address: directory.address,
    },
    source: "directory" as const,
    alreadySaved: false,
  };
}
