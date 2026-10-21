import { DefaultSession } from "next-auth";
import { Jabatan, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      opdAdmin: boolean;
      superAdmin: boolean;
      jabatan: Jabatan | null;
      unitId: string | null;
      nip: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    opdAdmin: boolean;
    superAdmin: boolean;
    jabatan: Jabatan | null;
    unitId: string | null;
    nip: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    opdAdmin: boolean;
    superAdmin: boolean;
    jabatan: Jabatan | null;
    unitId: string | null;
    nip: string;
  }
}

export {};
