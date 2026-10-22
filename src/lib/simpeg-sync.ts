import { prisma } from "@/lib/prisma";
import { ensureUserFromPegawai, syncPegawaiAccounts } from "@/lib/simpeg-accounts";
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

export function pegawaiRecordFromSimpeg(pegawai: SimpegPegawai, unitId: string | null) {
  const nip = str(pegawai.nip);
  if (!nip) {
    throw new Error("NIP Simpeg kosong");
  }
  const name = displayPegawaiName(pegawai) || nip;
  const tempatLahir = str(pegawai.tempat_lahir);
  const unorNama = str(pegawai.unor_nama);

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
    jabatanNama: str(pegawai.jabatan_nama),
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

export function nextSyncedUnitId(unorId: string | null, localUnitId: string | null): string | null | undefined {
  if (!unorId) return null;
  if (!localUnitId) return undefined;
  return localUnitId;
}

function simpegPegawaiWrite(pegawai: SimpegPegawai, resolvedUnitId: string | null | undefined) {
  const data = pegawaiRecordFromSimpeg(pegawai, resolvedUnitId ?? null);
  if (resolvedUnitId !== undefined) return { create: data, update: data };
  const { unitId, ...update } = data;
  void unitId;
  return { create: data, update };
}

export async function upsertPegawaiFromSimpeg(pegawai: SimpegPegawai) {
  const nip = str(pegawai.nip);
  if (!nip) {
    throw new Error("NIP Simpeg kosong");
  }
  const unorId = str(pegawai.unor_id);
  const removed = await prisma.pegawai.findUnique({
    where: { nip },
    select: { id: true, deletedAt: true },
  });
  if (removed?.deletedAt) return null;
  const unit = unorId
    ? await prisma.unit.findFirst({
        where: { OR: [{ id: unorId }, { externalId: unorId }] },
        select: { id: true },
      })
    : null;
  const write = simpegPegawaiWrite(pegawai, nextSyncedUnitId(unorId, unit?.id ?? null));

  const saved = await prisma.pegawai.upsert({
    where: { nip },
    create: write.create,
    update: write.update,
  });
  await upsertAsnDirectory(write.create.nip, write.create.name, write.create.address);
  await ensureUserFromPegawai(saved);
  return saved;
}

export async function syncSimpegUnor(onProgress?: ProgressFn) {
  onProgress?.({ step: "unor", message: "Mengambil unit organisasi dari Simpeg..." });
  const { items } = await fetchSimpegUnor();
  const instansi = await ensureInstansi();
  const now = new Date();
  const ids = new Set(items.map((item) => item.id).filter(Boolean));

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
        return prisma.unit.upsert({
          where: { id },
          create: {
            id,
            externalId: id,
            name,
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
  const localIdByKey = new Map<string, string>();
  for (const unit of await prisma.unit.findMany({ select: { id: true, externalId: true } })) {
    localIdByKey.set(unit.id, unit.id);
    if (unit.externalId) localIdByKey.set(unit.externalId, unit.id);
  }
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

  onProgress?.({
    step: "pegawai",
    message: `Mengambil pegawai halaman 1/${lastPage}...`,
    current: 0,
    total,
  });

  async function persistPage(items: SimpegPegawai[]) {
    for (const group of chunk(items, 15)) {
      await Promise.all(
        group.map(async (pegawai) => {
          const nip = str(pegawai.nip);
          if (!nip || removedNips.has(nip)) return;
          const unorId = str(pegawai.unor_id);
          const write = simpegPegawaiWrite(
            pegawai,
            nextSyncedUnitId(unorId, unorId ? localIdByKey.get(unorId) ?? null : null),
          );
          await prisma.pegawai.upsert({
            where: { nip },
            create: write.create,
            update: write.update,
          });
        }),
      );
      saved += group.filter((item) => str(item.nip)).length;
      onProgress?.({
        step: "pegawai",
        message: `Menyimpan pegawai ${Math.min(saved, total)}/${total}`,
        current: Math.min(saved, total),
        total,
      });
    }
  }

  await persistPage(first.items);

  for (let page = 2; page <= lastPage; page += 1) {
    onProgress?.({
      step: "pegawai",
      message: `Mengambil pegawai halaman ${page}/${lastPage}...`,
      current: saved,
      total,
    });
    const result = await fetchSimpegPegawaiPage(page);
    await persistPage(result.items);
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
