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

const TOKENS_FILE = path.join(process.cwd(), "data", "api-tokens.json");

function ensureDirectoryExists() {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getStoredApiTokens(): ApiTokenItem[] {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(TOKENS_FILE)) {
      const defaultToken: ApiTokenItem = {
        id: "tok_default_1",
        name: "Integrasi SIMPEG / E-Kinerja",
        token: process.env.EXTERNAL_API_TOKEN || "kin_live_9f82d84a7e1c49b08f4cb123e4567890",
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      fs.writeFileSync(TOKENS_FILE, JSON.stringify([defaultToken], null, 2), "utf-8");
      return [defaultToken];
    }
    const content = fs.readFileSync(TOKENS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Gagal membaca file api-tokens.json:", err);
    return [];
  }
}

export function saveApiTokens(tokens: ApiTokenItem[]): void {
  ensureDirectoryExists();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
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

  return false;
}
