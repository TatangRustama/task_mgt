import { DefaultSession } from "next-auth";
import { Jabatan, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      jabatan: Jabatan | null;
      unitId: string | null;
      nip: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    jabatan: Jabatan | null;
    unitId: string | null;
    nip: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    jabatan: Jabatan | null;
    unitId: string | null;
    nip: string;
  }
}

export {};
