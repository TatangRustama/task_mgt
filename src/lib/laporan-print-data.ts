import { Prisma } from "@prisma/client";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanPersonLabel } from "@/lib/laporan-board-types";
import { golonganSortKey } from "@/lib/golongan";
import { dailyValidationTaskIds } from "@/lib/daily-report-snapshot";
import { getDailyLaporanPrintContext, getLaporanPrintContext } from "@/lib/laporan-print";
import { toMonthlyPrintTasks } from "@/lib/laporan-print-view";
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
import { completedOnReportDate, formatISODate, formatNip, isISODate, parseISODate, reportDayRange } from "@/lib/utils";

const taskPrintInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

async function loadMonthlyPrintTasks(
  where: Prisma.TaskWhereInput,
  start: Date,
  end: Date,
  completedOnly = false,
) {
  const rows = await prisma.task.findMany({
    where: {
      AND: [
        where,
        { status: { not: "dibatalkan" } },
        completedOnly
          ? { completedAt: { gte: start, lt: end } }
          : {
              OR: [
                { completedAt: { gte: start, lt: end } },
                { assignedAt: { gte: start, lt: end }, completedAt: { gte: end } },
              ],
            },
      ],
    },
    include: taskPrintInclude,
    orderBy: [{ completedAt: "asc" }, { assignedAt: "asc" }],
  });
  return toMonthlyPrintTasks(rows.map(mapTask), start, end);
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

  const day = view === "harian" ? reportDayRange(date) : null;
  const start = day?.start ?? new Date(year, month - 1, 1);
  const end = day?.end ?? new Date(year, month, 1);

  const unitAssigneeIds = assigneeIdsFromBoard(board, user.id);
  const completedOnly = view === "harian";
  const [leaderTasks, tasks] = await Promise.all([
    isLeader
      ? loadMonthlyPrintTasks({ assignedToId: user.id }, start, end, completedOnly)
      : Promise.resolve([]),
    isLeader
      ? unitAssigneeIds.length
        ? loadMonthlyPrintTasks({ assignedToId: { in: unitAssigneeIds } }, start, end, completedOnly)
        : Promise.resolve([])
      : loadMonthlyPrintTasks(
          { OR: [{ assignedToId: user.id }, { createdById: user.id }] },
          start,
          end,
          completedOnly,
        ),
  ]);
  const onReportDate = (task: { completedAt?: string | Date | null }) =>
    !completedOnly || completedOnReportDate(task.completedAt, date);
  leaderTasks.splice(0, leaderTasks.length, ...leaderTasks.filter(onReportDate));
  tasks.splice(0, tasks.length, ...tasks.filter(onReportDate));
  const ownPrinted = isLeader ? leaderTasks : tasks.filter((task) => task.assigneeId === user.id);
  const lampiranTasks = ownPrinted.filter((task) => task.printRole !== "dikerjakan");

  if (view === "harian") {
    const focusedTaskIds = [...new Set([...leaderTasks, ...tasks].map((task) => task.id))];
    const drilledIn = Boolean(unit && user.unitId && unit !== user.unitId && visibleUnitIds.includes(unit));
    let taskIds = focusedTaskIds;
    if (drilledIn && isLeader) {
      const rootBoard = await getLaporanBoard({
        viewerId: user.id,
        rootUnitId: user.unitId,
        visibleUnitIds,
        isLeader,
        view: "harian",
        date,
        month,
        year,
        detail: "ui",
      });
      if (rootBoard) {
        const rootAssigneeIds = assigneeIdsFromBoard(rootBoard, user.id);
        const rootUnitTasks = rootAssigneeIds.length
          ? await loadMonthlyPrintTasks({ assignedToId: { in: rootAssigneeIds } }, start, end, true)
          : [];
        taskIds = dailyValidationTaskIds({
          drilledIn: true,
          focusedTaskIds,
          rootTaskIds: [
            ...new Set(
              [...leaderTasks, ...rootUnitTasks.filter((task) => completedOnReportDate(task.completedAt, date))].map(
                (task) => task.id,
              ),
            ),
          ],
        });
      }
    }
    const print = await getDailyLaporanPrintContext({
      userId: user.id,
      date,
      instansiName: meta.instansiName,
      agencyName: meta.agencyName,
      taskIds,
    });
    return {
      view,
      date,
      print,
      isLeader,
      tasks,
      leaderTasks,
      lampiranTasks,
    };
  }

  const identities = await loadIdentities([
    ...board.childUnits.map((row) => row.leaderId),
    ...board.people.map((person) => person.id),
  ]);
  const print = await getLaporanPrintContext({
    userId: user.id,
    month,
    year,
    instansiName: meta.instansiName,
    agencyName: meta.agencyName,
    taskIds: [...new Set([...leaderTasks, ...tasks].map((task) => task.id))],
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
    leaderTasks,
    lampiranTasks,
  };
}

function assigneeIdsFromBoard(
  board: {
    people: { id: string }[];
    childUnits: { leaderId: string | null }[];
  },
  viewerId: string,
) {
  return [
    ...new Set(
      [
        ...board.people.map((person) => person.id),
        ...board.childUnits.map((unitRow) => unitRow.leaderId),
      ].filter((id): id is string => Boolean(id) && id !== viewerId),
    ),
  ];
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
