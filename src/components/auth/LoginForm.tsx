"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { LOGIN_ERROR_MESSAGES, type LoginErrorCode } from "@/lib/auth-login-messages";
import { useNavigationLoader } from "@/components/layout/NavigationLoader";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { start } = useNavigationLoader();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    const check = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const checkData = await check.json().catch(() => ({}));

    if (!check.ok) {
      setLoading(false);
      const code = checkData.code as LoginErrorCode | undefined;
      setError(
        (code && LOGIN_ERROR_MESSAGES[code]) ||
          checkData.error ||
          "NIP atau password salah",
      );
      return;
    }

    const result = await signIn("credentials", {
      email: username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(LOGIN_ERROR_MESSAGES.database);
      return;
    }

    start();
    router.push(searchParams.get("callbackUrl") || "/mandiri");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border border-outline">
      <div className="border-b border-accent bg-primary px-4 py-4 text-center">
        <p className="text-sm font-semibold tracking-[0.24em] text-white/80">Data dan Informasi</p>
        <CardTitle className="mt-0.5 text-2xl tracking-tight text-white">Manajemen Tugas</CardTitle>
        <p className="mt-1 text-xs text-white/75">versi 1.0</p>
      </div>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username">NIP</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="NIP atau email admin"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Password (default: NIP)"
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-tertiary">
          Pegawai: NIP / password NIP. Admin demo: admin@demo.go.id / password123
        </p>
      </CardContent>
    </Card>
  );
}
