import assert from "node:assert/strict";
import test from "node:test";
import { lastActiveTaskDate, recapDaysForPersonTasks, taskReportDate } from "./laporan-task-date";
import type { ReportTask } from "./report-types";

function task(partial: Pick<ReportTask, "status" | "completedAt" | "reviewedAt" | "assignedAt" | "createdAt"> & { id?: string }): ReportTask {
  return {
    id: partial.id ?? partial.status,
    title: partial.status,
    description: null,
    status: partial.status,
    source: "delegasi",
    priority: "sedang",
    createdAt: partial.createdAt,
    assignedAt: partial.assignedAt,
    completedAt: partial.completedAt,
    deadline: null,
    reviewedAt: partial.reviewedAt,
    score: null,
    address: null,
    notes: null,
    feedback: null,
    photoUrls: [],
    assigneeId: "pegawai",
    assigneeName: "Pegawai",
    createdByName: "Atasan",
    jumlahIntervensi: null,
    satuan: null,
  };
}

test("rejection stays on the Jayapura review day after completedAt is cleared", () => {
  const rejected = task({
    status: "ditolak",
    completedAt: null,
    reviewedAt: "2026-10-12T16:30:00.000Z",
    assignedAt: "2026-10-10T01:00:00.000Z",
    createdAt: "2026-10-10T01:00:00.000Z",
  });

  assert.equal(taskReportDate(rejected), "2026-10-13");
});

test("in-progress multi-day work stays on the assigned Jayapura day", () => {
  const inProgress = task({
    status: "dikerjakan",
    completedAt: null,
    reviewedAt: null,
    assignedAt: "2026-10-04T18:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
  });

  assert.equal(taskReportDate(inProgress), "2026-10-05");
});

test("approved work stays on the completion day", () => {
  const approved = task({
    id: "approved",
    status: "disetujui",
    completedAt: "2026-10-09T16:30:00.000Z",
    reviewedAt: "2026-10-10T02:00:00.000Z",
    assignedAt: "2026-10-08T01:00:00.000Z",
    createdAt: "2026-10-08T01:00:00.000Z",
  });

  assert.equal(taskReportDate(approved), "2026-10-10");
});

test("monthly calendar lists a rejection on its review day beside an earlier approval", () => {
  const approved = task({
    id: "approved",
    status: "disetujui",
    completedAt: "2026-10-09T02:00:00.000Z",
    reviewedAt: "2026-10-09T03:00:00.000Z",
    assignedAt: "2026-10-08T01:00:00.000Z",
    createdAt: "2026-10-08T01:00:00.000Z",
  });
  const rejected = task({
    id: "rejected",
    status: "ditolak",
    completedAt: null,
    reviewedAt: "2026-10-12T16:30:00.000Z",
    assignedAt: "2026-10-10T01:00:00.000Z",
    createdAt: "2026-10-10T01:00:00.000Z",
  });
  const tasks = [approved, rejected];
  const days = recapDaysForPersonTasks(tasks, 10, 2026);
  const selected = lastActiveTaskDate(tasks);

  assert.equal(selected, "2026-10-13");
  assert.equal(days.find((day) => day.date === "2026-10-09")?.completed, 1);
  assert.equal(days.find((day) => day.date === "2026-10-13")?.posted, 1);
  assert.deepEqual(
    tasks.filter((item) => taskReportDate(item) === selected).map((item) => item.id),
    ["rejected"],
  );
  assert.deepEqual(
    tasks.filter((item) => taskReportDate(item) === "2026-10-09").map((item) => item.id),
    ["approved"],
  );
});
