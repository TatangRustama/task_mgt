import { Prisma } from "@prisma/client";
import { listPerangkatDaerah, listUnorChildren, listUnorRootsForPerangkatDaerah } from "@/lib/admin-pegawai";
import { perangkatDaerahIdsForScope, type AdminScope } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import type { UnorChoice } from "@/lib/task-monitor-shared";
import { formatNip } from "@/lib/utils";

export type KepatuhanPeriodMode = "harian" | "bulanan";
export type KepatuhanStatusFilter = "belum" | "sudah" | "semua";

export type KepatuhanFilters = {
  mode: KepatuhanPeriodMode;
  date: string;
  month: string;
  pd: string;
  unor: [string, string, string];
  q: string;
  status: KepatuhanStatusFilter;
};

export type KepatuhanRow = {
  userId: string;
  name: string;
  idLabel: string;
  unitId: string | null;
  unitName: string;
  perangkatDaerahNama: string;
  atasanId: string | null;
  atasanName: string;
  atasanIdLabel: string;
  validCount: number;
  rejectedCount: number;
  isCompliant: boolean;
  reason: "ok" | "ditolak" | "kosong";
};

export type KepatuhanSummary = {
  totalPegawai: number;
  sudahInput: number;
  belumInput: number;
  ditolakOnly: number;
  persentaseSudah: number;
};

type UnorLevels = [UnorChoice[], UnorChoice[], UnorChoice[]];

const emptyUnor = {
  selected: ["", "", ""] as [string, string, string],
  options: [[], [], []] as UnorLevels,
  unitId: "",
};

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function currentMonthIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMode(raw: string | undefined): KepatuhanPeriodMode {
  return raw === "bulanan" ? "bulanan" : "harian";
}

function parseStatus(raw: string | undefined): KepatuhanStatusFilter {
  if (raw === "sudah" || raw === "semua") return raw;
  return "belum";
}

function parseDayIso(raw: string | undefined): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return todayIso();
  const [y, m, d] = raw.trim().split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return todayIso();
  }
  return raw.trim();
}

function parseMonthIso(raw: string | undefined): string {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw.trim())) return currentMonthIso();
  const [y, m] = raw.trim().split("-").map(Number);
  if (m < 1 || m > 12 || y < 2000) return currentMonthIso();
  return raw.trim();
}

export function parseKepatuhanFilters(raw: {
  mode?: string;
  date?: string;
  month?: string;
  pd?: string;
  u1?: string;
  u2?: string;
  u3?: string;
  q?: string;
  status?: string;
}): KepatuhanFilters {
  return {
    mode: parseMode(raw.mode),
    date: parseDayIso(raw.date),
    month: parseMonthIso(raw.month),
    pd: raw.pd?.trim() || "",
    unor: [raw.u1?.trim() || "", raw.u2?.trim() || "", raw.u3?.trim() || ""],
    q: raw.q?.trim() || "",
    status: parseStatus(raw.status),
  };
}

function periodRange(filters: KepatuhanFilters) {
  if (filters.mode === "bulanan") {
    const [y, m] = filters.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const monthText = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(start);
    return { start, end, label: `Bulanan · ${monthText}` };
  }
  const [y, m, d] = filters.date.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  const dayText = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(start);
  return { start, end, label: `Harian · ${dayText}` };
}

async function resolveUnorChain(
  pd: string,
  raw: [string, string, string],
  allowed: Set<string> | null,
) {
  if (!pd) return { ...emptyUnor, unitId: "" };
  const keep = (items: UnorChoice[]) => (allowed ? items.filter((item) => allowed.has(item.id)) : items);
  const options: UnorLevels = [[], [], []];
  const selected: [string, string, string] = ["", "", ""];

  options[0] = keep(await listUnorRootsForPerangkatDaerah(pd));
  if (!options[0].some((item) => item.id === raw[0])) {
    return { selected, options, unitId: "" };
  }

  selected[0] = raw[0];
  options[1] = keep(await listUnorChildren(selected[0]));
  if (!options[1].some((item) => item.id === raw[1])) {
    return { selected, options, unitId: selected[0] };
  }

  selected[1] = raw[1];
  options[2] = keep(await listUnorChildren(selected[1]));
  if (options[2].some((item) => item.id === raw[2])) selected[2] = raw[2];
  return { selected, options, unitId: selected[2] || selected[1] };
}

async function descendantUnitIds(rootId: string) {
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.unit.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (ids.has(child.id)) continue;
      ids.add(child.id);
      frontier.push(child.id);
    }
  }
  return [...ids];
}

function identityLabel(pegawai: { jenis: string; nip: string | null; nik: string | null } | null, nip: string) {
  if (pegawai?.jenis === "non_asn") return `NIK ${pegawai.nik || "-"}`;
  return `NIP ${formatNip(pegawai?.nip || nip)}`;
}

export async function getKepatuhanMonitor(filters: KepatuhanFilters, scope: AdminScope) {
  const scoped = !scope.unrestricted;
  const allowedPd = await perangkatDaerahIdsForScope(scope);
  const allPerangkat = await listPerangkatDaerah();
  const perangkatDaerah = allowedPd ? allPerangkat.filter((item) => allowedPd.has(item.id)) : allPerangkat;
  let pd = perangkatDaerah.some((item) => item.id === filters.pd) ? filters.pd : "";
  const perangkatLocked = scoped && perangkatDaerah.length === 1;
  if (perangkatLocked) pd = perangkatDaerah[0]?.id ?? "";

  const activeFilters: KepatuhanFilters = { ...filters, pd };
  const allowedUnits = scoped ? new Set(scope.unitIds) : null;
  const unor = await resolveUnorChain(pd, activeFilters.unor, allowedUnits);
  const { start, end, label: periodLabel } = periodRange(activeFilters);

  const emptyResult = (queried: boolean) => ({
    rows: [] as KepatuhanRow[],
    summary: { totalPegawai: 0, sudahInput: 0, belumInput: 0, ditolakOnly: 0, persentaseSudah: 0 } satisfies KepatuhanSummary,
    perangkatDaerah,
    unor,
    filters: { ...activeFilters, unor: unor.selected },
    periodLabel,
    perangkatLocked,
    queried,
  });

  if (scoped && scope.unitIds.length === 0) {
    return emptyResult(false);
  }
  if (!scoped && !pd && !activeFilters.q) {
    return emptyResult(false);
  }

  const and: Prisma.UserWhereInput[] = [
    { deletedAt: null },
    { role: "personal" },
  ];

  if (scoped) {
    and.push({
      OR: [
        { unitId: { in: scope.unitIds } },
        { pegawai: { unitId: { in: scope.unitIds } } },
        { pegawai: { unorId: { in: scope.unitIds } } },
      ],
    });
  }

  if (unor.unitId) {
    const unitIds = await descendantUnitIds(unor.unitId);
    and.push({
      OR: [
        { unitId: { in: unitIds } },
        { pegawai: { unitId: { in: unitIds } } },
        { pegawai: { unorId: { in: unitIds } } },
      ],
    });
  } else if (pd) {
    and.push({
      OR: [
        { unit: { perangkatDaerahId: pd } },
        { pegawai: { perangkatDaerahId: pd } },
      ],
    });
  }

  if (activeFilters.q) {
    const digits = activeFilters.q.replace(/\D/g, "");
    const orSearch: Prisma.UserWhereInput[] = [
      { name: { contains: activeFilters.q, mode: "insensitive" } },
    ];
    if (digits) {
      orSearch.push(
        { nip: { contains: digits } },
        { pegawai: { nip: { contains: digits } } },
        { pegawai: { nik: { contains: digits } } },
      );
    }
    and.push({ OR: orSearch });
  }

  const users = await prisma.user.findMany({
    where: { AND: and },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      nip: true,
      unitId: true,
      unit: {
        select: {
          id: true,
          name: true,
          parentId: true,
          pimpinanId: true,
          perangkatDaerahNama: true,
        },
      },
      pegawai: {
        select: {
          jenis: true,
          nip: true,
          nik: true,
          perangkatDaerahNama: true,
        },
      },
    },
  });

  if (users.length === 0) {
    return emptyResult(true);
  }

  const userIds = users.map((u) => u.id);

  // Hitung tugas per pegawai pada periode terpilih (exclude dibatalkan)
  const taskCounts = await prisma.task.groupBy({
    by: ["assignedToId", "status"],
    where: {
      assignedToId: { in: userIds },
      assignedAt: { gte: start, lt: end },
      status: { not: "dibatalkan" },
    },
    _count: { _all: true },
  });

  const statsByUser = new Map<string, { valid: number; rejected: number }>();
  for (const item of taskCounts) {
    if (!item.assignedToId) continue;
    const prev = statsByUser.get(item.assignedToId) ?? { valid: 0, rejected: 0 };
    if (item.status === "ditolak") {
      prev.rejected += item._count._all;
    } else {
      prev.valid += item._count._all;
    }
    statsByUser.set(item.assignedToId, prev);
  }

  // Batch resolusi atasan langsung per unit & parentUnit
  const unitIdsNeeded = new Set<string>();
  const parentIdsNeeded = new Set<string>();
  for (const u of users) {
    if (u.unit?.id) unitIdsNeeded.add(u.unit.id);
    if (u.unit?.parentId) parentIdsNeeded.add(u.unit.parentId);
  }

  const allUnitIds = [...new Set([...unitIdsNeeded, ...parentIdsNeeded])];
  const [parentUnits, activeActing] = await Promise.all([
    allUnitIds.length > 0
      ? prisma.unit.findMany({
          where: { id: { in: allUnitIds } },
          select: { id: true, pimpinanId: true, parentId: true },
        })
      : [],
    allUnitIds.length > 0
      ? prisma.penugasanSementara.findMany({
          where: {
            unitId: { in: allUnitIds },
            OR: [{ selesai: null }, { selesai: { gte: new Date() } }],
          },
          select: { unitId: true, userId: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const unitMap = new Map(parentUnits.map((u) => [u.id, u]));
  const actingMap = new Map<string, string>();
  for (const act of activeActing) {
    if (!actingMap.has(act.unitId)) actingMap.set(act.unitId, act.userId);
  }

  const leaderIds = new Set<string>();
  for (const u of parentUnits) {
    if (u.pimpinanId) leaderIds.add(u.pimpinanId);
  }
  for (const uid of actingMap.values()) {
    leaderIds.add(uid);
  }

  const leaders =
    leaderIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...leaderIds] }, deletedAt: null },
          select: {
            id: true,
            name: true,
            nip: true,
            pegawai: { select: { jenis: true, nip: true, nik: true } },
          },
        })
      : [];
  const leaderMap = new Map(leaders.map((l) => [l.id, l]));

  function resolveLeaderForUser(u: (typeof users)[number]) {
    if (!u.unit) return null;
    // Cek pimpinan unit sendiri (definitif atau Plt/Plh)
    const ownLeaderId = u.unit.pimpinanId || actingMap.get(u.unit.id) || null;
    if (ownLeaderId && ownLeaderId !== u.id) {
      return leaderMap.get(ownLeaderId) ?? null;
    }
    // Jika user adalah pimpinan unit tsb, atasan adalah pimpinan parent unit
    if (u.unit.parentId) {
      const parent = unitMap.get(u.unit.parentId);
      const parentLeaderId = parent?.pimpinanId || actingMap.get(u.unit.parentId) || null;
      if (parentLeaderId && parentLeaderId !== u.id) {
        return leaderMap.get(parentLeaderId) ?? null;
      }
    }
    return null;
  }

  const allRows: KepatuhanRow[] = users.map((u) => {
    const stat = statsByUser.get(u.id) ?? { valid: 0, rejected: 0 };
    const isCompliant = stat.valid > 0;
    const reason: KepatuhanRow["reason"] = isCompliant
      ? "ok"
      : stat.rejected > 0
        ? "ditolak"
        : "kosong";
    const atasan = resolveLeaderForUser(u);
    return {
      userId: u.id,
      name: u.name,
      idLabel: identityLabel(u.pegawai, u.nip),
      unitId: u.unitId,
      unitName: u.unit?.name || "Belum ada unit",
      perangkatDaerahNama:
        u.unit?.perangkatDaerahNama || u.pegawai?.perangkatDaerahNama || "Perangkat daerah belum diisi",
      atasanId: atasan?.id ?? null,
      atasanName: atasan?.name ?? "Atasan belum ditetapkan",
      atasanIdLabel: atasan ? identityLabel(atasan.pegawai, atasan.nip) : "-",
      validCount: stat.valid,
      rejectedCount: stat.rejected,
      isCompliant,
      reason,
    };
  });

  const totalPegawai = allRows.length;
  const sudahInput = allRows.filter((r) => r.isCompliant).length;
  const belumInput = totalPegawai - sudahInput;
  const ditolakOnly = allRows.filter((r) => r.reason === "ditolak").length;
  const persentaseSudah = totalPegawai > 0 ? Math.round((sudahInput / totalPegawai) * 100) : 0;

  const rows =
    activeFilters.status === "semua"
      ? allRows
      : activeFilters.status === "sudah"
        ? allRows.filter((r) => r.isCompliant)
        : allRows.filter((r) => !r.isCompliant);

  return {
    rows,
    summary: {
      totalPegawai,
      sudahInput,
      belumInput,
      ditolakOnly,
      persentaseSudah,
    } satisfies KepatuhanSummary,
    perangkatDaerah,
    unor,
    filters: { ...activeFilters, unor: unor.selected },
    periodLabel,
    perangkatLocked,
    queried: true,
  };
}
