"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDERS = [
  { token: "{{atasan}}", desc: "Nama atasan langsung" },
  { token: "{{periode}}", desc: "Tanggal / bulan filter" },
  { token: "{{daftar_pegawai}}", desc: "Daftar pegawai belum input" },
];

export function KepatuhanTemplateCard({
  initialTemplate,
  defaultTemplate,
}: {
  initialTemplate: string;
  defaultTemplate: string;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/kepatuhan/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (!res.ok) {
        setError("Gagal menyimpan template.");
      } else {
        const data = (await res.json()) as { template?: string };
        if (data.template) setTemplate(data.template);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  }

  function onResetDefault() {
    setTemplate(defaultTemplate);
    setSaved(false);
    setError("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Template Pesan Salin Info Kepatuhan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-on-surface-variant">
          Teks ini digunakan saat menekan tombol <strong>Salin Info</strong> atau{" "}
          <strong>Salin Pesan Atasan</strong> pada menu Kepatuhan.
        </p>

        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.token}
              type="button"
              onClick={() => setTemplate((prev) => `${prev}${prev.endsWith("\n") || !prev ? "" : " "}${p.token}`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant bg-surface-container-low px-2 py-1 text-xs hover:border-primary"
              title={`Sisipkan ${p.token}`}
            >
              <code className="font-semibold text-primary">{p.token}</code>
              <span className="text-on-surface-variant">· {p.desc}</span>
            </button>
          ))}
        </div>

        <Textarea
          rows={7}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Masukkan template pesan..."
          className="font-mono text-xs"
        />

        {error ? <p className="text-xs text-error">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Tersimpan" : "Simpan Template"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onResetDefault}
            disabled={saving}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
