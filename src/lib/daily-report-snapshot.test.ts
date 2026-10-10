import assert from "node:assert/strict";
import test from "node:test";
import { dailySnapshotTasks, dailyValidationTaskIds } from "./daily-report-snapshot";
import type { ReportTask } from "./report-types";

function task(overrides: Partial<ReportTask> & Pick<ReportTask, "id">): ReportTask {
  return {
    status: "disetujui",
    title: overrides.id,
    description: null,
    source: "delegasi",
    priority: "sedang",
    createdAt: "2026-10-10T00:00:00.000Z",
    assignedAt: "2026-10-10T00:00:00.000Z",
    completedAt: "2026-10-10T01:00:00.000Z",
    deadline: "2026-10-10T08:00:00.000Z",
    reviewedAt: "2026-10-10T02:00:00.000Z",
    score: 3,
    address: null,
    notes: null,
    feedback: "Baik",
    photoUrls: ["https://example.test/photo.jpg"],
    assigneeId: "author",
    assigneeName: "Sari",
    createdByName: "Sari",
    jumlahIntervensi: null,
    satuan: null,
    ...overrides,
  };
}

test("daily validation keeps the root day when a child unit is printed", () => {
  const ids = dailyValidationTaskIds({
    drilledIn: true,
    focusedTaskIds: ["child-staff"],
    rootTaskIds: ["leader", "direct-report", "child-leader"],
  });

  assert.deepEqual(ids, ["leader", "direct-report", "child-leader"]);
});

test("daily validation at the root uses the tasks being printed", () => {
  const ids = dailyValidationTaskIds({
    drilledIn: false,
    focusedTaskIds: ["leader", "direct-report"],
    rootTaskIds: [],
  });

  assert.deepEqual(ids, ["leader", "direct-report"]);
});

test("daily QR validation ignores a later completion that was not on the print", () => {
  const recorded = task({ id: "recorded" });
  const later = task({ id: "later", completedAt: "2026-10-10T06:00:00.000Z" });

  const shown = dailySnapshotTasks(["recorded"], [later, recorded], "2026-10-10");

  assert.deepEqual(
    shown.map((item) => item.id),
    ["recorded"],
  );
});

test("daily QR validation keeps a recorded task finished outside that Jayapura day", () => {
  const previousEvening = task({
    id: "previous-evening",
    completedAt: "2026-10-09T14:00:00.000Z",
  });

  const shown = dailySnapshotTasks(["previous-evening"], [previousEvening], "2026-10-10");

  assert.deepEqual(
    shown.map((item) => item.id),
    ["previous-evening"],
  );
});
