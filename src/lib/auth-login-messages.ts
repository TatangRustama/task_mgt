export type LoginErrorCode = "missing_fields" | "database" | "not_found" | "wrong_password";

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  missing_fields: "Isi NIP dan password.",
  database: "Layanan sementara tidak tersedia. Coba lagi beberapa saat.",
  not_found: "NIP dan Password salah. periksa kembali",
  wrong_password: "NIP dan Password salah. periksa kembali",
};

export class LoginError extends Error {
  code: LoginErrorCode;

  constructor(code: LoginErrorCode) {
    super(LOGIN_ERROR_MESSAGES[code]);
    this.code = code;
  }
}
