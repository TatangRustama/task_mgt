import { Prisma } from "@prisma/client";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanPersonLabel } from "@/lib/laporan-board-types";
import { golonganSortKey } from "@/lib/golongan";
import { getDailyLaporanPrintContext, getLaporanPrintContext, printableTasks } from "@/lib/laporan-print";
import { dailyPrintTasks } from "@/lib/laporan-print-view";
import type {
  DailyLaporanPrintContext,
  LaporanPrintContext,
  PrintUnitReviewRow,
} from "@/lib/laporan-print-view";
import { displayJabatan } from "@/lib/jabatan-display";
import { getOrgScope } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getUnitMeta, mapTask } from "@/lib/reports";
import type { ReportTask } from "@/lib/report-types";
import type { SessionUser } from "@/lib/session";
import { formatISODate, formatNip, isISODate, parseISODate } from "@/lib/utils";

const taskPrintInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

function periodWhere(start: Date, end: Date, view: "harian" | "bulanan"): Prisma.TaskWhereInput {
  const inPeriod: Prisma.TaskWhereInput[] = [
    { assignedAt: { gte: start, lt: end } },
    { completedAt: { gte: start, lt: end } },
    { review: { is: { reviewedAt: { gte: start, lt: end } } } },
    { status: "ditolak", updatedAt: { gte: start, lt: end } },
  ];
  if (view === "bulanan") inPeriod.push({ status: "menunggu_approval" });
  else inPeriod.push({ status: "menunggu_approval", completedAt: { gte: start, lt: end } });
  return { OR: inPeriod };
}

async function loadOwnPrintableTasks(userId: string, start: Date, end: Date, view: "harian" | "bulanan") {
  const rows = await prisma.task.findMany({
    where: {
      assignedToId: userId,
      status: { not: "dibatalkan" },
      AND: [periodWhere(start, end, view)],
    },
    include: taskPrintInclude,
    orderBy: [{ assignedAt: "asc" }, { completedAt: "asc" }, { createdAt: "asc" }],
  });
  return printableTasks(rows.map(mapTask));
}

export type HarianPrintData = {
  view: "harian";
  date: string;
  print: DailyLaporanPrintContext;
  isLeader: boolean;
  tasks: ReportTask[];
  leaderTasks: ReportTask[];
  lampiranTasks: ReportTask[];
};

export type BulananPrintData = {
  view: "bulanan";
  month: number;
  year: number;
  print: LaporanPrintContext;
  isLeader: boolean;
  tasks: ReportTask[];
  rows: PrintUnitReviewRow[];
  leaderTasks: ReportTask[];
  lampiranTasks: ReportTask[];
};

export type LaporanPrintData = HarianPrintData | BulananPrintData;

export async function getLaporanPrintData(
  user: SessionUser,
  searchParams: URLSearchParams,
): Promise<LaporanPrintData | null> {
  const view = searchParams.get("view") === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const dateParam = searchParams.get("date") || undefined;
  const date = isISODate(dateParam) ? dateParam : today;
  const selected = parseISODate(date);
  const month = Number(searchParams.get("month") || selected.getMonth() + 1);
  const year = Number(searchParams.get("year") || selected.getFullYear());
  const unit = searchParams.get("unit") || undefined;

  const { visibleUnitIds, isLeader } = await getOrgScope(user);
  const board = await getLaporanBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    isLeader,
    focusUnitId: unit,
    view,
    date,
    month,
    year,
    detail: "print",
  });
  if (!board) return null;
  const meta = await getUnitMeta(user.unitId);

  const start = view === "harian" ? parseISODate(date) : new Date(year, month - 1, 1);
  const end =
    view === "harian"
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
      : new Date(year, month, 1);

  if (view === "harian") {
    const print = await getDailyLaporanPrintContext({
      userId: user.id,
      instansiName: meta.instansiName,
      agencyName: meta.agencyName,
    });
    const ownTasks = await loadOwnPrintableTasks(user.id, start, end, view);
    return {
      view,
      date,
      print,
      isLeader,
      tasks: dailyPrintTasks(board.tasks, date),
      leaderTasks: isLeader ? dailyPrintTasks(ownTasks, date) : [],
      lampiranTasks: dailyPrintTasks(ownTasks, date),
    };
  }

  const tasks = printableTasks(board.tasks);
  const [identities, ownTasks] = await Promise.all([
    loadIdentities([
      ...board.childUnits.map((row) => row.leaderId),
      ...board.people.map((person) => person.id),
    ]),
    loadOwnPrintableTasks(user.id, start, end, view),
  ]);
  const print = await getLaporanPrintContext({
    userId: user.id,
    month,
    year,
    instansiName: meta.instansiName,
    agencyName: meta.agencyName,
    taskIds: [...new Set([...(isLeader ? ownTasks : []), ...tasks].map((task) => task.id))],
  });

  const rows: PrintUnitReviewRow[] = [
    ...board.childUnits.map((unitRow) => {
      const identity = unitRow.leaderId ? identities.get(unitRow.leaderId) : undefined;
      return {
        name: unitRow.leaderName || unitRow.name,
        identity: identity?.identity || "-",
        jabatanNama: identity?.jabatanNama || "-",
        insight: unitRow.insight,
        completed: unitRow.completed,
        rejected: unitRow.rejected,
        averageScore: unitRow.averageScore,
        onTimePercent: unitRow.onTimePercent,
        rank: identity?.rank ?? 99,
      };
    }),
    ...board.people.map((person) => {
      const identity = identities.get(person.id);
      return {
        name: person.name,
        identity: identity?.identity || "-",
        jabatanNama: identity?.jabatanNama || "-",
        insight: person.insight || laporanPersonLabel(person),
        completed: person.completed,
        rejected: person.rejected,
        averageScore: person.averageScore,
        onTimePercent: person.onTimePercent,
        rank: identity?.rank ?? 99,
      };
    }),
  ]
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "id"))
    .map(({ rank: _rank, ...row }) => row);

  return {
    view,
    month,
    year,
    print,
    isLeader,
    tasks,
    rows,
    leaderTasks: isLeader ? ownTasks : [],
    lampiranTasks: ownTasks,
  };
}

async function loadIdentities(userIds: Array<string | null>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, { identity: string; jabatanNama: string; rank: number }>();

  const [users, pegawais] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nip: true, jabatan: true },
    }),
    prisma.pegawai.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        nip: true,
        nik: true,
        jenis: true,
        jabatanNama: true,
        golonganNama: true,
      },
    }),
  ]);
  const userById = new Map(users.map((row) => [row.id, row]));
  const pegawaiByUser = new Map(pegawais.map((row) => [row.userId as string, row]));

  return new Map(
    ids.map((id) => {
      const pegawai = pegawaiByUser.get(id);
      const user = userById.get(id);
      const isNonAsn = pegawai?.jenis === "non_asn";
      const identity = isNonAsn
        ? `NIK ${pegawai?.nik || "-"}`
        : `NIP ${formatNip(pegawai?.nip || user?.nip)}`;
      return [
        id,
        {
          identity,
          jabatanNama: displayJabatan(pegawai, user?.jabatan),
          rank: golonganSortKey(pegawai?.golonganNama),
        },
      ] as const;
    }),
  );
}
