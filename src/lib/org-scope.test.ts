import assert from "node:assert/strict";
import test from "node:test";
import { resolveLeadershipScope, type LeadershipScope } from "@/lib/kapasitas";
import { assignmentRules, canDelegate, listLeadershipScopes, type OrgUser } from "@/lib/org";

function pelaksanaWithPlt(actingType: LeadershipScope["unitType"] = "sub_bidang"): OrgUser & {
  pegawai: { jenis: string; jabatanNama: string };
} {
  return {
    id: "sari",
    role: "personal",
    jabatan: "pelaksana",
    unitId: "sub-arsip",
    unit: {
      id: "sub-arsip",
      type: "sub_bidang",
      parentId: "bid-a",
      pimpinanId: "kepala-arsip",
      name: "Subbid Arsip",
    },
    pegawai: { jenis: "asn", jabatanNama: "Pengolah Data" },
    penugasanSementara: [
      {
        id: "plt-mutasi",
        jenis: "plt",
        unitId: "unit-mutasi",
        unitName: "Mutasi",
        unitType: actingType,
      },
    ],
  };
}

test("a pelaksana home post is not a leadership seat when they are Plt elsewhere", () => {
  const user = pelaksanaWithPlt("sub_bidang");
  const scopes = listLeadershipScopes(user);
  assert.equal(scopes.length, 2);
  assert.equal(scopes[0]?.kind, "definitif");
  assert.equal(scopes[1]?.kind, "plt");

  const home = resolveLeadershipScope(scopes, "") ?? scopes[0];
  assert.ok(home);
  assert.equal(home.kind, "definitif");
  assert.equal(canDelegate(user, home), false);
  assert.deepEqual(assignmentRules(user, home), {
    canUsePool: false,
    mustAssignNamed: false,
    poolUnit: null,
  });

  const acting = scopes[1];
  assert.ok(acting);
  assert.equal(canDelegate(user, acting), true);
  assert.equal(assignmentRules(user, acting).canUsePool, true);
  assert.equal(assignmentRules(user, acting).poolUnit?.id, "unit-mutasi");
});

test("a kepala keeps delegation on the home post and on the acting post", () => {
  const user = pelaksanaWithPlt("bidang");
  user.jabatan = "kepala_sub_bidang";
  user.unit = { ...user.unit!, pimpinanId: user.id };
  const scopes = listLeadershipScopes(user);
  const home = scopes[0];
  const acting = scopes[1];
  assert.ok(home && acting);

  assert.equal(canDelegate(user, home), true);
  assert.equal(assignmentRules(user, home).canUsePool, true);
  assert.equal(canDelegate(user, acting), true);
  assert.equal(assignmentRules(user, acting).canUsePool, false);
  assert.equal(assignmentRules(user, acting).mustAssignNamed, true);
});
