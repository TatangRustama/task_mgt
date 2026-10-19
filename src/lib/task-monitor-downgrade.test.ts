import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { downgradedTaskStatus } from "./task-monitor-shared";

describe("downgradedTaskStatus", () => {
  it("returns approved and waiting tasks to in progress", () => {
    assert.equal(downgradedTaskStatus({ status: "disetujui", assignedToId: "staff" }), "dikerjakan");
    assert.equal(
      downgradedTaskStatus({ status: "menunggu_approval", assignedToId: "staff" }),
      "dikerjakan",
    );
  });

  it("keeps an assigned rejection submittable", () => {
    assert.equal(downgradedTaskStatus({ status: "ditolak", assignedToId: "staff" }), "dikerjakan");
  });

  it("does not drop assigned in-progress work to an unclaimable open card", () => {
    assert.equal(downgradedTaskStatus({ status: "dikerjakan", assignedToId: "staff" }), null);
  });

  it("returns an unassigned in-progress card to the open column", () => {
    assert.equal(downgradedTaskStatus({ status: "dikerjakan", assignedToId: null }), "tersedia");
    assert.equal(downgradedTaskStatus({ status: "ditolak", assignedToId: null }), "tersedia");
  });

  it("has no lower stage for an open card", () => {
    assert.equal(downgradedTaskStatus({ status: "tersedia", assignedToId: null }), null);
  });
});
