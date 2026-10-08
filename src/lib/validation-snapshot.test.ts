import assert from "node:assert/strict";
import test from "node:test";
import { tasksForValidationSnapshot } from "./laporan-print-view";
import type { ReportTask } from "./report-types";

const septemberStart = new Date(2026, 8, 1);
const octoberStart = new Date(2026, 9, 1);

function task(overrides: Partial<ReportTask> & Pick<ReportTask, "id">): ReportTask {
  return {
    status: "disetujui",
    title: overrides.id,
    description: null,
    source: "delegasi",
    priority: "sedang",
    createdAt: "2026-09-02T00:00:00.000Z",
    assignedAt: "2026-09-02T00:00:00.000Z",
    completedAt: "2026-09-15T00:00:00.000Z",
    deadline: "2026-09-20T00:00:00.000Z",
    reviewedAt: "2026-09-16T00:00:00.000Z",
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

test("validation stays on the stored task ids", () => {
  const recorded = task({ id: "recorded" });
  const later = task({ id: "later", completedAt: "2026-09-20T00:00:00.000Z" });

  const shown = tasksForValidationSnapshot(
    ["recorded"],
    [later, recorded],
    septemberStart,
    octoberStart,
  );

  assert.deepEqual(
    shown.map((item) => item.id),
    ["recorded"],
  );
});

test("validation keeps a recorded task whose completion date is outside the report month", () => {
  const august = task({
    id: "august",
    completedAt: "2026-08-20T00:00:00.000Z",
    reviewedAt: "2026-09-02T00:00:00.000Z",
    score: 2,
  });

  const shown = tasksForValidationSnapshot(["august"], [august], septemberStart, octoberStart);

  assert.equal(shown.length, 1);
  assert.equal(shown[0]?.id, "august");
  assert.equal(shown[0]?.score, 2);
  assert.equal(shown[0]?.status, "disetujui");
});

test("validation keeps snapshot order and classifies in-month tasks", () => {
  const second = task({ id: "second", completedAt: "2026-09-18T00:00:00.000Z", score: 2 });
  const first = task({ id: "first", completedAt: "2026-09-04T00:00:00.000Z", score: 3 });

  const shown = tasksForValidationSnapshot(
    ["second", "first"],
    [first, second],
    septemberStart,
    octoberStart,
  );

  assert.deepEqual(
    shown.map((item) => item.id),
    ["second", "first"],
  );
  assert.equal(shown[0]?.printRole, "selesai");
  assert.equal(shown[0]?.score, 2);
});
