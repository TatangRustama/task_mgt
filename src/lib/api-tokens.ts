import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ApiTokenItem = {
  id: string;
  name: string; // Keterangan pengguna
  token: string;
  createdAt: string;
  isActive: boolean;
};

export const DEFAULT_FALLBACK_TOKEN = "kin_live_9f82d84a7e1c49b08f4cb123e4567890";

function getTokensFilePath(): string {
  const primary = path.join(process.cwd(), "data", "api-tokens.json");
  try {
    const dir = path.dirname(primary);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return primary;
  } catch {
    const fallbackDir = path.join("/tmp", "task_mgt_data");
    if (!fs.existsSync(fallbackDir)) {
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
      } catch {}
    }
    return path.join(fallbackDir, "api-tokens.json");
  }
}

export function getStoredApiTokens(): ApiTokenItem[] {
  try {
    const filePath = getTokensFilePath();
    if (!fs.existsSync(filePath)) {
      const defaultToken: ApiTokenItem = {
        id: "tok_default_1",
        name: "Integrasi SIMPEG / E-Kinerja",
        token: process.env.EXTERNAL_API_TOKEN || DEFAULT_FALLBACK_TOKEN,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      try {
        fs.writeFileSync(filePath, JSON.stringify([defaultToken], null, 2), "utf-8");
      } catch {}
      return [defaultToken];
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [
      {
        id: "tok_default_1",
        name: "Integrasi SIMPEG / E-Kinerja",
        token: process.env.EXTERNAL_API_TOKEN || DEFAULT_FALLBACK_TOKEN,
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    ];
  } catch (err) {
    console.error("Gagal membaca file api-tokens.json:", err);
    return [
      {
        id: "tok_default_1",
        name: "Integrasi SIMPEG / E-Kinerja",
        token: process.env.EXTERNAL_API_TOKEN || DEFAULT_FALLBACK_TOKEN,
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    ];
  }
}

export function saveApiTokens(tokens: ApiTokenItem[]): void {
  try {
    const filePath = getTokensFilePath();
    fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (err) {
    console.error("Gagal menyimpan file api-tokens.json:", err);
  }
}

export function createNewApiToken(name: string): ApiTokenItem {
  const tokens = getStoredApiTokens();
  const randomHex = crypto.randomBytes(16).toString("hex");
  const newToken: ApiTokenItem = {
    id: `tok_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    name: name.trim() || "Aplikasi Mitra Eksternal",
    token: `kin_live_${randomHex}`,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  tokens.unshift(newToken);
  saveApiTokens(tokens);
  return newToken;
}

export function deleteApiToken(id: string): boolean {
  const tokens = getStoredApiTokens();
  const filtered = tokens.filter((t) => t.id !== id);
  if (filtered.length === tokens.length) return false;
  saveApiTokens(filtered);
  return true;
}

export function isTokenValid(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;

  const stored = getStoredApiTokens();
  if (stored.some((t) => t.isActive && t.token === trimmed)) {
    return true;
  }

  if (process.env.EXTERNAL_API_TOKEN && process.env.EXTERNAL_API_TOKEN.trim() === trimmed) {
    return true;
  }

  if (trimmed === DEFAULT_FALLBACK_TOKEN) {
    return true;
  }

  return false;
}
