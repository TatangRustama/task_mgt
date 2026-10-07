import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateTime, formatDateTimeLocal, parseDateTimeLocal } from "./utils";

test("admin edit keeps a Jayapura completion instant when the server is UTC", () => {
  const stored = new Date("2026-10-07T01:00:00.000Z");
  assert.equal(formatDateTimeLocal(stored), "2026-10-07T10:00");
  assert.equal(parseDateTimeLocal("2026-10-07T10:00")?.toISOString(), stored.toISOString());
});

test("an evening completion stays on the same Jayapura calendar day", () => {
  const stored = new Date("2026-10-07T11:00:00.000Z");
  assert.equal(formatDateTimeLocal(stored), "2026-10-07T20:00");
  assert.equal(parseDateTimeLocal("2026-10-07T20:00")?.toISOString(), stored.toISOString());
});

test("midnight in Jayapura stays on that calendar day", () => {
  const stored = new Date("2026-10-06T15:00:00.000Z");
  assert.equal(formatDateTimeLocal(stored), "2026-10-07T00:00");
  assert.equal(parseDateTimeLocal("2026-10-07T00:00")?.toISOString(), stored.toISOString());
});

test("displayed completion time uses Jayapura, not the server zone", () => {
  const stored = new Date("2026-10-07T01:00:00.000Z");
  const label = formatDateTime(stored);
  assert.match(label, /10\.00/);
  assert.match(label, /2026/);
});

test("rejects dates that do not exist in Jayapura", () => {
  assert.equal(parseDateTimeLocal("2026-02-31T10:00"), null);
  assert.equal(parseDateTimeLocal("2026-10-07T24:00"), null);
  assert.equal(parseDateTimeLocal(""), null);
});
