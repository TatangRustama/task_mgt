export type LoginErrorCode = "missing_fields" | "database" | "not_found" | "wrong_password";

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  missing_fields: "Isi NIP/NIK atau username dan password.",
  database: "Layanan sementara tidak tersedia. Coba lagi beberapa saat.",
  not_found: "Akun tidak terdaftar. Pegawai: gunakan NIP/NIK. Super admin: gunakan username.",
  wrong_password: "Password salah. Pegawai baru: password default sama dengan NIP.",
};

export class LoginError extends Error {
  code: LoginErrorCode;

  constructor(code: LoginErrorCode) {
    super(LOGIN_ERROR_MESSAGES[code]);
    this.code = code;
  }
}
