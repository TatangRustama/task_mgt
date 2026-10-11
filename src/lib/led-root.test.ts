import assert from "node:assert/strict";
import test from "node:test";
import { ledScopeIds, resolveBoardFocus, resolveLedRootUnitId } from "./led-root";

const bidangTree = [
  { id: "bidang", parentId: "kantor" },
  { id: "sub-a", parentId: "bidang" },
  { id: "sub-b", parentId: "bidang" },
];

test("a definitive leader stays rooted on the unit that covers their visible tree", () => {
  assert.equal(resolveLedRootUnitId("bidang", bidangTree), "bidang");
  const focus = resolveBoardFocus("bidang", null, bidangTree);
  assert.equal(focus.focusUnitId, "bidang");
  assert.equal(focus.drilledIn, false);
  assert.deepEqual(ledScopeIds(focus.focusUnitId, bidangTree, bidangTree.map((unit) => unit.id)), [
    "bidang",
    "sub-a",
    "sub-b",
  ]);
});

test("a Plt whose home seat is inside the acting tree sees the whole acting unit", () => {
  const focus = resolveBoardFocus("sub-a", null, bidangTree);
  assert.equal(focus.ledRootId, "bidang");
  assert.equal(focus.focusUnitId, "bidang");
  assert.equal(focus.boardRootId, "bidang");
  assert.equal(focus.drilledIn, false);
  assert.deepEqual(ledScopeIds(focus.focusUnitId, bidangTree, ["bidang", "sub-a", "sub-b"]), [
    "bidang",
    "sub-a",
    "sub-b",
  ]);
});

test("a Plt whose home seat is outside the visible units is rooted on the acting unit", () => {
  const acting = [{ id: "sub-b", parentId: "bidang" }];
  const focus = resolveBoardFocus("sub-a", null, acting);
  assert.equal(focus.focusUnitId, "sub-b");
  assert.deepEqual(ledScopeIds(focus.focusUnitId, acting, ["sub-b"]), ["sub-b"]);
});

test("drilling from a definitive leader still opens that child unit", () => {
  const focus = resolveBoardFocus("bidang", "sub-a", bidangTree);
  assert.equal(focus.boardRootId, "bidang");
  assert.equal(focus.focusUnitId, "sub-a");
  assert.equal(focus.drilledIn, true);
  assert.deepEqual(ledScopeIds(focus.focusUnitId, bidangTree, ["bidang", "sub-a", "sub-b"]), ["sub-a"]);
});

test("drilling from the acting root still opens a child unit", () => {
  const focus = resolveBoardFocus("sub-a", "sub-b", bidangTree);
  assert.equal(focus.boardRootId, "bidang");
  assert.equal(focus.focusUnitId, "sub-b");
  assert.equal(focus.drilledIn, true);
  assert.deepEqual(ledScopeIds(focus.focusUnitId, bidangTree, ["bidang", "sub-a", "sub-b"]), ["sub-b"]);
});

test("two led trees stay expanded instead of collapsing onto the home seat", () => {
  const units = [
    { id: "sub-a", parentId: "bidang-a" },
    { id: "bidang-b", parentId: "kantor" },
    { id: "sub-b", parentId: "bidang-b" },
  ];
  const focus = resolveBoardFocus("sub-a", null, units);
  assert.equal(focus.ledRootId, null);
  assert.equal(focus.focusUnitId, null);
  assert.deepEqual(
    ledScopeIds(focus.focusUnitId, units, units.map((unit) => unit.id)),
    ["sub-a", "bidang-b", "sub-b"],
  );
});
