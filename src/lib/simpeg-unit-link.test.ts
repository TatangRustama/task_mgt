import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSyncedUnitId } from "./simpeg-sync";

describe("nextSyncedUnitId", () => {
  it("keeps the current unit when Simpeg names a unor that is not imported yet", () => {
    assert.equal(nextSyncedUnitId("unor-baru", null), undefined);
  });

  it("links a known unor to the local unit id", () => {
    assert.equal(nextSyncedUnitId("simpeg-unor", "local-unit"), "local-unit");
  });

  it("clears the unit only when Simpeg no longer sends a unor", () => {
    assert.equal(nextSyncedUnitId(null, null), null);
  });
});
