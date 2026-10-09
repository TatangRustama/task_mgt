import assert from "node:assert/strict";
import test from "node:test";
import { monthAsOfDate } from "./kinerja";
import { formatISODate, reportMonthRange, startOfReportDay } from "./utils";

const octoberMorning = new Date("2026-09-30T22:30:00.000Z");

test("a Jayapura morning completion stays on that calendar day", () => {
  assert.equal(formatISODate(octoberMorning), "2026-10-01");
  const todayStart = startOfReportDay(octoberMorning);
  assert.equal(todayStart.toISOString(), "2026-09-30T15:00:00.000Z");
  assert.ok(octoberMorning >= todayStart);
});

test("October includes work finished before 09:00 WIT on the 1st and excludes the next month", () => {
  const october = reportMonthRange(2026, 10);
  const september = reportMonthRange(2026, 9);
  const novemberMorning = new Date("2026-10-31T22:30:00.000Z");

  assert.equal(october.start.toISOString(), "2026-09-30T15:00:00.000Z");
  assert.equal(october.end.toISOString(), "2026-10-31T15:00:00.000Z");
  assert.ok(octoberMorning >= october.start && octoberMorning < october.end);
  assert.ok(octoberMorning >= september.end);
  assert.ok(novemberMorning >= october.end);
  assert.ok(novemberMorning >= reportMonthRange(2026, 11).start);
  assert.ok(novemberMorning < reportMonthRange(2026, 11).end);
});

test("the current kinerja month follows the Jayapura date on the morning of the 1st", () => {
  assert.equal(monthAsOfDate(10, 2026, octoberMorning), "2026-10-01");
  assert.equal(monthAsOfDate(9, 2026, octoberMorning), "2026-09-30");
});

test("formatISODate and the month cutoff agree across the year boundary", () => {
  const newYearMorning = new Date("2026-12-31T18:00:00.000Z");
  assert.equal(formatISODate(newYearMorning), "2027-01-01");
  const january = reportMonthRange(2027, 1);
  assert.ok(newYearMorning >= january.start && newYearMorning < january.end);
  assert.equal(monthAsOfDate(1, 2027, newYearMorning), "2027-01-01");
});
