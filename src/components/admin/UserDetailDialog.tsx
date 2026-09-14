"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayJabatan } from "@/lib/jabatan-display";
import { roleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

type UserRole = "super_admin" | "admin" | "personal";
type Panel = "detail" | "edit" | "password" | "delete";

export type UserDetail = {
  id: string;
  name: string;
  email: string;
  nip: string;
  role: UserRole;
  jabatan: "kepala_kantor" | "kepala_bidang" | "kepala_sub_bidang" | "pelaksana" | null;
  createdAt: string;
  updatedAt: string;
  unit: { id: string; name: string } | null;
  pegawai: {
    id: string;
    jenis: "asn" | "non_asn";
    nip: string | null;
    nik: string | null;
    jabatanNama: string | null;
    unorNama: string | null;
    perangkatDaerahNama: string | null;
  } | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value || "-"}</p>
    </div>
  );
}

export function UserDetailDialog({
  userId,
  open,
  onOpenChange,
  onChanged,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (message: string) => void;
}) {
  const [panel, setPanel] = useState<Panel>("detail");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("personal");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isPersonal = role === "personal";

  useEffect(() => {
    if (!open || !userId) {
      setPanel("detail");
      setDetail(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPanel("detail");
    fetch(`/api/admin/${userId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Gagal memuat detail pengguna");
          setDetail(null);
          return;
        }
        setDetail(data.user);
        setIsSelf(Boolean(data.isSelf));
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat detail pengguna");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  function startEdit() {
    if (!detail) return;
    setName(detail.name);
    setRole(detail.role);
    setUsername(detail.nip);
    setError("");
    setPanel("edit");
  }

  function startPassword() {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setPanel("password");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, username }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan perubahan");
      return;
    }
    setDetail(data.user);
    setIsSelf(Boolean(data.isSelf));
    setPanel("detail");
    onChanged("Data pengguna berhasil diperbarui");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal mereset password");
      return;
    }
    setPanel("detail");
    onChanged("Password berhasil direset");
  }

  async function confirmDelete() {
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menghapus pengguna");
      return;
    }
    onOpenChange(false);
    onChanged("Pengguna berhasil dihapus");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>
            {panel === "edit"
              ? "Edit pengguna"
              : panel === "password"
                ? "Reset password"
                : panel === "delete"
                  ? "Hapus pengguna?"
                  : "Detail pengguna"}
          </DialogTitle>
        </DialogHeader>

        {loading ? <p className="text-sm text-on-surface-variant">Memuat detail...</p> : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}

        {!loading && detail && panel === "detail" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama" value={detail.name} />
              <Field label="Role" value={roleLabel[detail.role]} />
              <Field label={detail.role === "personal" ? "NIP / NIK login" : "Username"} value={detail.nip} />
              <Field label="Email" value={detail.email} />
              <Field
                label="Jabatan"
                value={displayJabatan(detail.pegawai, detail.jabatan)}
              />
              <Field label="Unit" value={detail.unit?.name || "-"} />
              {detail.pegawai ? (
                <>
                  <Field label="Jenis pegawai" value={detail.pegawai.jenis === "asn" ? "ASN" : "Non-ASN"} />
                  <Field label="NIK" value={detail.pegawai.nik || "-"} />
                  <Field label="Perangkat daerah" value={detail.pegawai.perangkatDaerahNama || "-"} />
                  <Field label="Unit organisasi" value={detail.pegawai.unorNama || "-"} />
                </>
              ) : null}
              <Field label="Dibuat" value={formatDateTime(detail.createdAt)} />
              <Field label="Diperbarui" value={formatDateTime(detail.updatedAt)} />
            </div>
            <div className="space-y-2">
              <Button type="button" variant="secondary" className="w-full" onClick={startPassword}>
                <KeyRound className="h-4 w-4" />
                Reset password
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={isSelf}
                  onClick={() => {
                    setError("");
                    setPanel("delete");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </div>
            {isSelf ? (
              <p className="text-xs text-on-surface-variant">Akun yang sedang digunakan tidak dapat dihapus.</p>
            ) : null}
          </div>
        ) : null}

        {!loading && detail && panel === "edit" ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama lengkap</Label>
              <Input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                className={selectClassName}
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin OPD</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">{isPersonal ? "NIP / NIK" : "Username"}</Label>
              <Input
                id="edit-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        ) : null}

        {!loading && detail && panel === "password" ? (
          <form onSubmit={savePassword} className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Password baru untuk {detail.name}. Minimal 6 karakter.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Password baru</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Konfirmasi password</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Reset password"}
              </Button>
            </div>
          </form>
        ) : null}

        {!loading && detail && panel === "delete" ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Akun {detail.name} ({detail.nip}) akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={saving} onClick={confirmDelete}>
                {saving ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
