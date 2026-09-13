import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getLaporanBoard } from "@/lib/laporan-board";
import { laporanPersonLabel } from "@/lib/laporan-board-types";
import { golonganSortKey } from "@/lib/golongan";
import { kepegawaianStatus } from "@/lib/kepegawaian-status";
import { getDailyLaporanPrintContext, getLaporanPrintContext, printableTasks } from "@/lib/laporan-print";
import type { PrintUnitReviewRow } from "@/lib/laporan-print-view";
import { getDirectReportIds, getOrgScope } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getUnitMeta, mapTask } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";
import { formatISODate, formatNip, isISODate, parseISODate } from "@/lib/utils";

const taskPrintInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  evidence: { select: { address: true, notes: true, photoUrls: true } },
  review: { select: { score: true, reviewedAt: true, feedback: true } },
  rating: { select: { stars: true } },
} as const;

function periodWhere(start: Date, end: Date): Prisma.TaskWhereInput {
  return {
    OR: [
      { assignedAt: { gte: start, lt: end } },
      { completedAt: { gte: start, lt: end } },
      { review: { is: { reviewedAt: { gte: start, lt: end } } } },
      { status: "ditolak", updatedAt: { gte: start, lt: end } },
      { status: "menunggu_approval" },
    ],
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const dateParam = searchParams.get("date") || undefined;
  const date = isISODate(dateParam) ? dateParam : today;
  const selected = parseISODate(date);
  const month = Number(searchParams.get("month") || selected.getMonth() + 1);
  const year = Number(searchParams.get("year") || selected.getFullYear());
  const unit = searchParams.get("unit") || undefined;

  const { orgUser, visibleUnitIds, isLeader } = await getOrgScope(user);
  const reportIds = orgUser && isLeader ? await getDirectReportIds(orgUser) : [];
  const board = await getLaporanBoard({
    viewerId: user.id,
    rootUnitId: user.unitId,
    visibleUnitIds,
    isLeader,
    directReportIds: reportIds,
    focusUnitId: unit,
    view,
    date,
    month,
    year,
    detail: "print",
  });
  if (!board) return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  const meta = await getUnitMeta(user.unitId);

  const start =
    view === "harian" ? parseISODate(date) : new Date(year, month - 1, 1);
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
    const leaderTaskRows = isLeader
      ? await prisma.task.findMany({
          where: {
            source: "mandiri",
            status: { not: "dibatalkan" },
            AND: [
              { OR: [{ assignedToId: user.id }, { createdById: user.id }] },
              periodWhere(start, end),
            ],
          },
          include: taskPrintInclude,
          orderBy: [{ assignedAt: "asc" }, { completedAt: "asc" }, { createdAt: "asc" }],
        })
      : [];
    return NextResponse.json({
      view,
      print,
      isLeader,
      tasks: board.tasks,
      leaderTasks: printableTasks(leaderTaskRows.map(mapTask)),
    });
  }

  const tasks = printableTasks(board.tasks);

  const [print, leaderTaskRows, identities] = await Promise.all([
    getLaporanPrintContext({
      userId: user.id,
      month,
      year,
      instansiName: meta.instansiName,
      agencyName: meta.agencyName,
      taskIds: tasks.map((task) => task.id),
    }),
    isLeader
      ? prisma.task.findMany({
          where: {
            source: "mandiri",
            status: { not: "dibatalkan" },
            AND: [
              { OR: [{ assignedToId: user.id }, { createdById: user.id }] },
              periodWhere(start, end),
            ],
          },
          include: taskPrintInclude,
          orderBy: [{ assignedAt: "asc" }, { completedAt: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    loadIdentities([
      ...board.childUnits.map((row) => row.leaderId),
      ...board.people.map((person) => person.id),
    ]),
  ]);

  const rows: PrintUnitReviewRow[] = [
    ...board.childUnits.map((unitRow) => {
      const identity = unitRow.leaderId ? identities.get(unitRow.leaderId) : undefined;
      return {
        name: unitRow.leaderName || unitRow.name,
        identity: identity?.identity || "-",
        kedudukanHukum: identity?.kedudukanHukum || "-",
        role: unitRow.name,
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
        kedudukanHukum: identity?.kedudukanHukum || "-",
        role: person.jabatanLabel || "Pegawai",
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

  const leaderTasks = printableTasks(leaderTaskRows.map(mapTask));

  return NextResponse.json({ view, print, tasks, isLeader, rows, leaderTasks });
}

async function loadIdentities(userIds: Array<string | null>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, { identity: string; kedudukanHukum: string; rank: number }>();

  const [users, pegawais] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nip: true },
    }),
    prisma.pegawai.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        nip: true,
        nik: true,
        jenis: true,
        kedudukanHukum: true,
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
      const kedudukanHukum =
        pegawai?.kedudukanHukum?.trim() || kepegawaianStatus(pegawai?.jenis, pegawai?.kedudukanHukum);
      return [
        id,
        {
          identity,
          kedudukanHukum,
          rank: golonganSortKey(pegawai?.golonganNama),
        },
      ] as const;
    }),
  );
}
