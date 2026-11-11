import { NextResponse } from "next/server";
import { getStoredApiTokens, isTokenValid } from "@/lib/api-tokens";

export function getValidExternalTokens(): string[] {
  const tokens: string[] = [];
  const stored = getStoredApiTokens();
  for (const item of stored) {
    if (item.isActive && !tokens.includes(item.token)) {
      tokens.push(item.token);
    }
  }

  if (process.env.EXTERNAL_API_TOKEN) {
    const envToken = process.env.EXTERNAL_API_TOKEN.trim();
    if (!tokens.includes(envToken)) {
      tokens.push(envToken);
    }
  }

  if (tokens.length === 0) {
    tokens.push("kin_live_9f82d84a7e1c49b08f4cb123e4567890");
  }
  return tokens;
}

export function validateExternalApiToken(request: Request): {
  valid: boolean;
  status?: number;
  code?: string;
  message?: string;
} {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");

  if (!authHeader) {
    return {
      valid: false,
      status: 401,
      code: "MISSING_BEARER_TOKEN",
      message: "Header Authorization dengan format 'Bearer <TOKEN>' diperlukan",
    };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return {
      valid: false,
      status: 401,
      code: "INVALID_TOKEN_FORMAT",
      message: "Format header otentikasi harus 'Bearer <TOKEN>'",
    };
  }

  const token = parts[1];

  if (!isTokenValid(token)) {
    return {
      valid: false,
      status: 403,
      code: "INVALID_OR_EXPIRED_TOKEN",
      message: "Token otentikasi tidak valid atau sudah tidak aktif",
    };
  }

  return { valid: true };
}

export function unauthorizedExternalResponse(validation: {
  status?: number;
  code?: string;
  message?: string;
}) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: validation.code || "UNAUTHORIZED",
        message: validation.message || "Akses tidak diizinkan",
      },
    },
    { status: validation.status || 401 }
  );
}
