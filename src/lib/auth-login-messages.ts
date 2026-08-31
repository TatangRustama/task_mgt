export type LoginErrorCode = "missing_fields" | "database" | "not_found" | "wrong_password";

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  missing_fields: "Isi NIP/email dan password.",
  database: "Layanan sementara tidak tersedia. Coba lagi beberapa saat.",
  not_found: "NIP atau email tidak terdaftar. Hubungi admin unit atau sync SIMPEG.",
  wrong_password: "Password salah. Pegawai baru: password default sama dengan NIP.",
};

export class LoginError extends Error {
  code: LoginErrorCode;

  constructor(code: LoginErrorCode) {
    super(LOGIN_ERROR_MESSAGES[code]);
    this.code = code;
  }
}
