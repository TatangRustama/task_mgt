import assert from "node:assert/strict";
import test from "node:test";
import { isDrilledInReportUnit, monthlyValidationTaskIds } from "./laporan-report-ids.ts";

test("monthly validation keeps the full unit tree when a child unit is printed", () => {
  const ids = monthlyValidationTaskIds({
    drilledIn: true,
    focusedTaskIds: ["sub-a"],
    rootTaskIds: ["sub-a", "sub-b", "other-unit"],
    ownTaskIds: ["leader"],
    includeOwn: true,
  });

  assert.deepEqual(ids, ["leader", "sub-a", "sub-b", "other-unit"]);
});

test("monthly validation at the root uses the focused board and still includes the leader", () => {
  const ids = monthlyValidationTaskIds({
    drilledIn: false,
    focusedTaskIds: ["sub-a", "sub-b"],
    rootTaskIds: [],
    ownTaskIds: ["leader", "sub-a"],
    includeOwn: true,
  });

  assert.deepEqual(ids, ["leader", "sub-a", "sub-b"]);
});

test("a staff monthly report does not mix in another person's tasks", () => {
  const ids = monthlyValidationTaskIds({
    drilledIn: false,
    focusedTaskIds: ["mine"],
    rootTaskIds: ["mine", "theirs"],
    ownTaskIds: ["mine"],
    includeOwn: false,
  });

  assert.deepEqual(ids, ["mine"]);
});

test("only a visible child unit counts as a drill-down", () => {
  assert.equal(isDrilledInReportUnit("child", "root", ["root", "child"]), true);
  assert.equal(isDrilledInReportUnit("root", "root", ["root", "child"]), false);
  assert.equal(isDrilledInReportUnit(undefined, "root", ["root", "child"]), false);
  assert.equal(isDrilledInReportUnit("outside", "root", ["root", "child"]), false);
  assert.equal(isDrilledInReportUnit("child", null, ["child"]), false);
});
