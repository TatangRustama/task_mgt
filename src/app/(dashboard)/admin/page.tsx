"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-outline-variant px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

type Unit = {
  id: string;
  name: string;
  type: "kantor" | "bidang" | "sub_bidang";
  parentId: string | null;
  parent?: { name: string } | null;
  pimpinan?: { name: string } | null;
  _count: { users: number };
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  nip: string;
  role: string;
  jabatan: string | null;
  unit?: { name: string } | null;
};

const unitTypeLabel: Record<Unit["type"], string> = {
  kantor: "Kantor",
  bidang: "Bidang",
  sub_bidang: "Sub Bidang",
};

const jabatanLabel: Record<string, string> = {
  kepala_kantor: "Kepala Kantor",
  kepala_bidang: "Kepala Bidang",
  kepala_sub_bidang: "Kepala Sub Bidang",
  pelaksana: "Staf Pelaksana",
};

export default function AdminPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState("");
  const [unitType, setUnitType] = useState<Unit["type"]>("bidang");

  async function loadData() {
    const res = await fetch("/api/admin");
    if (res.ok) {
      const data = await res.json();
      setUnits(data.units);
      setUsers(data.users);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const parentOptions = units.filter((unit) => {
    if (unitType === "bidang") return unit.type === "kantor";
    if (unitType === "sub_bidang") return unit.type === "bidang";
    return false;
  });

  async function createUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_unit",
        name: formData.get("unitName"),
        type: formData.get("unitType"),
        parentId: formData.get("parentId") || null,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Unit berhasil dibuat" : data.error || "Gagal membuat unit");
    if (res.ok) {
      e.currentTarget.reset();
      setUnitType("bidang");
      loadData();
    }
  }

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jabatan = String(formData.get("jabatan") || "");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_user",
        name: formData.get("name"),
        nip: formData.get("nip"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: jabatan === "admin" ? "admin" : undefined,
        jabatan: jabatan === "admin" ? null : jabatan,
        unitId: formData.get("unitId") || null,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "User berhasil dibuat" : data.error || "Gagal membuat user");
    if (res.ok) {
      e.currentTarget.reset();
      loadData();
    }
  }

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Admin Instansi" subtitle="Kelola struktur organisasi, unit, dan pengguna" />
      {message ? (
        <p className="rounded-xl bg-secondary-container px-4 py-2 text-sm text-on-secondary-container">{message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat Unit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUnit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="unitName">Nama Unit</Label>
              <Input id="unitName" name="unitName" required placeholder="Bidang Pelayanan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitType">Jenis</Label>
              <select
                id="unitType"
                name="unitType"
                className={selectClassName}
                value={unitType}
                onChange={(event) => setUnitType(event.target.value as Unit["type"])}
              >
                <option value="kantor">Kantor</option>
                <option value="bidang">Bidang</option>
                <option value="sub_bidang">Sub Bidang</option>
              </select>
            </div>
            {unitType !== "kantor" ? (
              <div className="space-y-2">
                <Label htmlFor="parentId">Unit induk</Label>
                <select id="parentId" name="parentId" className={selectClassName} required>
                  <option value="">Pilih unit induk</option>
                  {parentOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Button type="submit">Simpan Unit</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-3">
            <Input name="name" required placeholder="Nama lengkap" />
            <Input name="nip" required placeholder="NIP" />
            <Input name="email" type="email" required placeholder="Email" />
            <Input name="password" type="password" required placeholder="Password" defaultValue="password123" />
            <select name="jabatan" className={selectClassName} defaultValue="pelaksana">
              <option value="admin">Admin instansi</option>
              <option value="kepala_kantor">Kepala Kantor</option>
              <option value="kepala_bidang">Kepala Bidang</option>
              <option value="kepala_sub_bidang">Kepala Sub Bidang</option>
              <option value="pelaksana">Staf Pelaksana</option>
            </select>
            <select name="unitId" className={selectClassName}>
              <option value="">Pilih unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitTypeLabel[unit.type]} · {unit.name}
                </option>
              ))}
            </select>
            <Button type="submit">Simpan User</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Struktur Unit ({units.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {units.map((unit) => (
            <div key={unit.id} className="rounded-xl border border-surface-container-highest bg-surface-container-low p-3">
              <p className="font-medium text-on-surface">{unit.name}</p>
              <p className="text-on-surface-variant">
                {unitTypeLabel[unit.type]}
                {unit.parent ? ` · induk: ${unit.parent.name}` : ""}
              </p>
              <p className="text-tertiary">
                {unit.pimpinan?.name || "Belum ada pejabat"} · {unit._count.users} anggota
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar User ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-surface-container-highest bg-surface-container-low p-3">
              <p className="font-medium text-on-surface">{u.name}</p>
              <p className="text-on-surface-variant">
                {u.email} · {u.jabatan ? jabatanLabel[u.jabatan] || u.jabatan : u.role}
              </p>
              <p className="text-tertiary">{u.unit?.name || "Tanpa unit"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageMain>
  );
}
