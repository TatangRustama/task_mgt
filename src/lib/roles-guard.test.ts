import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProtectedPegawaiAccount } from "./roles";

describe("isProtectedPegawaiAccount", () => {
  it("protects a personal NIP that also administers the organization", () => {
    assert.equal(
      isProtectedPegawaiAccount({ role: "personal", opdAdmin: true, superAdmin: false }),
      true,
    );
    assert.equal(
      isProtectedPegawaiAccount({ role: "personal", opdAdmin: false, superAdmin: true }),
      true,
    );
  });

  it("protects legacy admin roles", () => {
    assert.equal(isProtectedPegawaiAccount({ role: "super_admin" }), true);
    assert.equal(isProtectedPegawaiAccount({ role: "admin" }), true);
  });

  it("leaves an ordinary pegawai deletable", () => {
    assert.equal(
      isProtectedPegawaiAccount({ role: "personal", opdAdmin: false, superAdmin: false }),
      false,
    );
    assert.equal(isProtectedPegawaiAccount(null), false);
  });
});
