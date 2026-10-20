import assert from "node:assert/strict";
import test from "node:test";
import { applyActiveAccount, sessionFromAccount, type ActiveAccount } from "./auth-account";

const active: ActiveAccount = {
  name: "Sari",
  email: "sari@simpeg.local",
  role: "personal",
  jabatan: "pelaksana",
  unitId: "unit-baru",
  nip: "198001012006041001",
};

test("applyActiveAccount replaces role and unit stored on the login token", () => {
  const token = applyActiveAccount(
    {
      name: "Sari",
      email: "sari@simpeg.local",
      role: "super_admin" as const,
      jabatan: "kepala_kantor" as const,
      unitId: "unit-lama",
      nip: "198001012006041001",
    },
    active,
  );

  assert.equal(token.role, "personal");
  assert.equal(token.jabatan, "pelaksana");
  assert.equal(token.unitId, "unit-baru");
});

test("sessionFromAccount uses the database account, not the previous claims", () => {
  const session = sessionFromAccount("user-1", active);

  assert.deepEqual(session, {
    id: "user-1",
    name: "Sari",
    email: "sari@simpeg.local",
    role: "personal",
    jabatan: "pelaksana",
    unitId: "unit-baru",
    nip: "198001012006041001",
  });
});
