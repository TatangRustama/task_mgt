import assert from "node:assert/strict";
import test from "node:test";
import { isReportedRejection, periodWhere } from "@/lib/laporan-board";
import { reportDayRange } from "@/lib/utils";

const { start, end } = reportDayRange("2026-10-12");

test("daily laporan still loads a rejection after completedAt is cleared", () => {
  const where = periodWhere(start, end, "harian");
  assert.deepEqual(where, {
    OR: [
      { completedAt: { gte: start, lt: end } },
      { status: "ditolak", review: { is: { reviewedAt: { gte: start, lt: end } } } },
    ],
  });
});

test("a rejection reviewed in Jayapura today still counts when completedAt is null", () => {
  const reviewedAt = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  assert.equal(
    isReportedRejection(
      { status: "ditolak", reviewedAt, completedAt: null, createdAt: "2026-10-01T00:00:00.000Z" },
      start,
      end,
    ),
    true,
  );
  assert.equal(
    isReportedRejection(
      { status: "ditolak", reviewedAt: "2026-10-01T02:00:00.000Z", completedAt: null, createdAt: reviewedAt },
      start,
      end,
    ),
    false,
  );
});
