"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Play, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiTokenItem } from "@/lib/api-tokens";

type Props = {
  initialTokens: ApiTokenItem[];
};

export function ExternalApiCard({ initialTokens }: Props) {
  const [tokens, setTokens] = useState<ApiTokenItem[]>(initialTokens);
  const [selectedTokenId, setSelectedTokenId] = useState<string>(
    initialTokens[0]?.id || ""
  );

  // Form tambah token baru
  const [newTokenName, setNewTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Visibility & copy states
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Tester states
  const activeToken =
    tokens.find((t) => t.id === selectedTokenId)?.token ||
    tokens[0]?.token ||
    "kin_live_9f82d84a7e1c49b08f4cb123e4567890";

  const [testNip, setTestNip] = useState("199101012021011001");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [testMonth, setTestMonth] = useState(() => new Date().getMonth() + 1);
  const [testYear, setTestYear] = useState(() => new Date().getFullYear());
  const [testPage, setTestPage] = useState(1);
  const [testLimit, setTestLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    timeMs: number;
    url: string;
    data: unknown;
  } | null>(null);

  function copyText(text: string, id: string, isCurl = false) {
    navigator.clipboard.writeText(text);
    if (isCurl) {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function toggleShowToken(id: string) {
    setShowTokens((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    const name = newTokenName.trim();
    if (!name) return;

    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Gagal membuat token");
        return;
      }
      setTokens((prev) => [data.token, ...prev]);
      setSelectedTokenId(data.token.id);
      setNewTokenName("");
    } catch {
      setCreateError("Terjadi kesalahan jaringan");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteToken(id: string) {
    if (!confirm("Hapus token ini? Sistem yang menggunakan token ini tidak akan bisa menarik data.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/api-tokens?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        if (selectedTokenId === id) {
          const remaining = tokens.filter((t) => t.id !== id);
          setSelectedTokenId(remaining[0]?.id || "");
        }
      }
    } catch {
      alert("Gagal menghapus token");
    }
  }

  async function runTest(mode: "daily" | "monthly") {
    setLoading(true);
    setTestResult(null);

    const startTime = performance.now();
    const url =
      mode === "daily"
        ? `/api/v1/external/kinerja/daily?nip=${encodeURIComponent(testNip)}&date=${testDate}&page=${testPage}&limit=${testLimit}`
        : `/api/v1/external/kinerja/monthly?nip=${encodeURIComponent(testNip)}&month=${testMonth}&year=${testYear}&page=${testPage}&limit=${testLimit}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      const endTime = performance.now();
      setTestResult({
        status: res.status,
        timeMs: Math.round(endTime - startTime),
        url,
        data,
      });
    } catch (err: unknown) {
      const endTime = performance.now();
      setTestResult({
        status: 500,
        timeMs: Math.round(endTime - startTime),
        url,
        data: {
          error: "Fetch error",
          message: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      setLoading(false);
    }
  }

  const sampleCurl = `curl -X GET "http://localhost:3000/api/v1/external/kinerja/daily?nip=${testNip}&date=${testDate}&page=${testPage}&limit=${testLimit}" \\
  -H "Authorization: Bearer ${activeToken}" \\
  -H "Accept: application/json"`;

  return (
    <Card className="border-outline-variant/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            API Data Kinerja Eksternal
          </CardTitle>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {tokens.length} Token Aktif
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p className="text-on-surface-variant text-xs">
          Akses penarikan data kinerja pegawai oleh sistem eksternal menggunakan <strong>Bearer Token</strong>.
        </p>

        {/* Form Tambah Token Baru */}
        <form onSubmit={handleCreateToken} className="space-y-2 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-3.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Tambah Token Baru
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="Keterangan pengguna (misal: E-Kinerja BKD, Aplikasi TPP)"
                className="h-8 text-xs bg-surface-container-low"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={creating || !newTokenName.trim()}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              {creating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Tambah Token
            </Button>
          </div>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
        </form>

        {/* Daftar Token */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Daftar Token Pengguna
          </Label>
          <div className="divide-y divide-outline-variant/30 rounded-xl border border-outline-variant/50 bg-surface-container-lowest overflow-hidden">
            {tokens.map((item) => {
              const isShown = Boolean(showTokens[item.id]);
              const isSelected = item.id === selectedTokenId;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3 space-y-2 transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-surface-container-low/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs text-on-surface truncate">
                        {item.name}
                      </span>
                      {isSelected && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                          Dipilih untuk Uji Coba
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => toggleShowToken(item.id)}
                      >
                        {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => copyText(item.token, item.id)}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="hidden sm:inline">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Salin</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        onClick={() => handleDeleteToken(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedTokenId(item.id)}
                    className="font-mono text-[11px] bg-surface-container-low px-2.5 py-1.5 rounded border border-outline-variant/30 text-on-surface select-all break-all cursor-pointer hover:border-primary/40"
                    title="Klik untuk memilih token ini pada konsol pengujian"
                  >
                    {isShown
                      ? item.token
                      : item.token.slice(0, 10) + "•".repeat(Math.max(8, item.token.length - 14)) + item.token.slice(-4)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Endpoints Info */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Endpoint
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">GET</span>
                <span className="font-mono text-xs font-semibold text-on-surface">/api/v1/external/kinerja/daily</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Harian: <code>nip</code>, <code>date</code>, <code>page</code>, <code>limit</code>
              </p>
            </div>

            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">GET</span>
                <span className="font-mono text-xs font-semibold text-on-surface">/api/v1/external/kinerja/monthly</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Bulanan: <code>nip</code>, <code>month</code>, <code>year</code>, <code>page</code>, <code>limit</code>
              </p>
            </div>
          </div>
        </div>

        {/* Local Test Console */}
        <div className="space-y-3.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              Uji Coba API
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-primary hover:text-primary"
              onClick={() => copyText(sampleCurl, "curl", true)}
            >
              {copiedCurl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> cURL Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Salin cURL
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">NIP</Label>
              <Input
                value={testNip}
                onChange={(e) => setTestNip(e.target.value)}
                placeholder="18 digit NIP"
                className="h-8 text-xs font-mono bg-surface-container-lowest"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">Tanggal</Label>
              <Input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="h-8 text-xs bg-surface-container-lowest"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-on-surface-variant">Page</Label>
                <Input
                  type="number"
                  min="1"
                  value={testPage}
                  onChange={(e) => setTestPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-8 text-xs bg-surface-container-lowest"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-on-surface-variant">Limit</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={testLimit}
                  onChange={(e) => setTestLimit(Math.max(1, parseInt(e.target.value, 10) || 10))}
                  className="h-8 text-xs bg-surface-container-lowest"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs h-8"
              disabled={loading || !testNip}
              onClick={() => runTest("daily")}
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Tarik Harian
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              disabled={loading || !testNip}
              onClick={() => runTest("monthly")}
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Tarik Bulanan
            </Button>
          </div>

          {/* Result view */}
          {testResult && (
            <div className="space-y-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold ${
                      testResult.status === 200
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-red-500/10 text-red-700"
                    }`}
                  >
                    HTTP {testResult.status}
                  </span>
                  <span className="text-on-surface-variant">{testResult.timeMs} ms</span>
                </div>
                <span className="text-on-surface-variant truncate max-w-xs">{testResult.url}</span>
              </div>
              <pre className="max-h-60 overflow-auto rounded bg-surface-container-low p-2.5 font-mono text-[11px] leading-relaxed text-on-surface">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
