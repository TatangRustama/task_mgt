import { NextResponse } from "next/server";
import { AssignmentMode, TaskPriority, TaskSource } from "@prisma/client";
import {
  canDelegate,
  canSeeTaskWithScope,
  assignmentRules,
  getActiveLeadershipScope,
  getDbOrgUser,
  getDirectReports,
  getOrgScope,
} from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { parseJumlahSatuan } from "@/lib/satuan";
import { notifyNewPostedTask } from "@/lib/push-notify";
import { canUseEmployeeApp, isAppAdmin } from "@/lib/roles";
import { getAdminScope, taskInScopeWhere } from "@/lib/admin-scope";
import { getCurrentUser } from "@/lib/session";
import { parseAssignedAt, parseFormDateInput } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAppAdmin(user.role)) {
    const scope = await getAdminScope(user);
    const tasks = await prisma.task.findMany({
      where: taskInScopeWhere(scope),
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  }

  const { visibleUnitIds, isLeader, activeScope } = await getOrgScope(user);
  const tasks = await prisma.task.findMany({
    where:
      isLeader && activeScope
        ? { unitId: { in: visibleUnitIds } }
        : {
            OR: [
              ...(visibleUnitIds.length ? [{ unitId: { in: visibleUnitIds } }] : []),
              { assignedToId: user.id },
              { createdById: user.id },
            ],
          },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const visible = tasks.filter((task) =>
    canSeeTaskWithScope(user, task, {
      visibleUnitIds,
      isLeader,
    }),
  );

  return NextResponse.json(visible);
}

export async function POST(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getDbOrgUser(sessionUser.id);
  if (!canUseEmployeeApp(sessionUser.role)) {
    return NextResponse.json({ error: "Pengelola tidak membuat tugas pribadi" }, { status: 403 });
  }
  if (!user?.unitId || !user.unit) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  }

  const body = await request.json();
  const title = String(body.title || "").trim();
  const description = body.description ? String(body.description) : null;
  const deadline = parseFormDateInput(body.deadline);
  const assignedAt = parseAssignedAt(body.assignedAt);
  const priority = (body.priority || "sedang") as TaskPriority;
  const source = (body.source || "mandiri") as TaskSource;
  const assignmentMode = (body.assignmentMode || "ditunjuk") as AssignmentMode;
  const assignedToId = body.assignedToId ? String(body.assignedToId) : null;
  const parsedJumlah = parseJumlahSatuan(body.jumlahIntervensi, body.satuan, false);

  if (!title || title.length > 60) {
    return NextResponse.json({ error: "Judul wajib diisi (max 60 karakter)" }, { status: 400 });
  }
  if (!parsedJumlah.ok) {
    return NextResponse.json({ error: parsedJumlah.error }, { status: 400 });
  }

  const jumlahSatuan = {
    jumlahIntervensi: parsedJumlah.jumlahIntervensi,
    satuan: parsedJumlah.satuan,
  };

  const activeScope = await getActiveLeadershipScope(user);

  if (source === "mandiri") {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        deadline,
        assignedAt,
        priority,
        source,
        assignmentMode: "ditunjuk",
        unitId: activeScope?.unitId ?? user.unitId,
        createdById: user.id,
        status: "dikerjakan",
        assignedToId: user.id,
        ...jumlahSatuan,
      },
    });
    return NextResponse.json(task, { status: 201 });
  }

  if (!canDelegate(user, activeScope)) {
    return NextResponse.json({ error: "Anda tidak berwenang mendelegasikan tugas" }, { status: 403 });
  }

  const rules = assignmentRules(user, activeScope);

  if (assignmentMode === "kolam") {
    const poolUnit = rules.poolUnit;
    if (!rules.canUsePool || !poolUnit) {
      return NextResponse.json(
        { error: "Hanya kepala sub bidang yang dapat melempar tugas ke board staf" },
        { status: 403 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        deadline,
        assignedAt,
        priority,
        source,
        assignmentMode: "kolam",
        unitId: poolUnit.id,
        createdById: user.id,
        status: "tersedia",
        assignedToId: null,
        ...jumlahSatuan,
      },
    });
    await notifyNewPostedTask({
      taskId: task.id,
      title: task.title,
      createdByName: sessionUser.name,
      assignmentMode: task.assignmentMode,
      assignedToId: task.assignedToId,
      unitId: task.unitId,
      createdById: task.createdById,
    });
    return NextResponse.json(task, { status: 201 });
  }

  if (!assignedToId) {
    return NextResponse.json({ error: "Pilih penerima tugas" }, { status: 400 });
  }

  const reports = await getDirectReports(user, activeScope?.unitId);
  const assignee = reports.find((person) => person.id === assignedToId);
  if (!assignee?.unitId) {
    return NextResponse.json(
      { error: "Penerima harus bawahan langsung pada jabatan yang dipilih" },
      { status: 400 }
    );
  }

  if (rules.mustAssignNamed && assignmentMode !== "ditunjuk") {
    return NextResponse.json(
      { error: "Kepala kantor dan kepala bidang wajib menunjuk penerima secara bernama" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      deadline,
      assignedAt,
      priority,
      source,
      assignmentMode: "ditunjuk",
      unitId: assignee.unitId,
      createdById: user.id,
      status: "dikerjakan",
      assignedToId: assignee.id,
      ...jumlahSatuan,
    },
  });
  await notifyNewPostedTask({
    taskId: task.id,
    title: task.title,
    createdByName: sessionUser.name,
    assignmentMode: task.assignmentMode,
    assignedToId: task.assignedToId,
    unitId: task.unitId,
    createdById: task.createdById,
  });

  return NextResponse.json(task, { status: 201 });
}
