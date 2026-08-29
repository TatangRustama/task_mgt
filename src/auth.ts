import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "NIP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const identifier = String(credentials?.email || "").trim();
          const password = credentials?.password as string | undefined;

          if (!identifier || !password) return null;

          const user = identifier.includes("@")
            ? await prisma.user.findUnique({ where: { email: identifier } })
            : await prisma.user.findUnique({ where: { nip: identifier } });

          if (!user) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            jabatan: user.jabatan,
            unitId: user.unitId,
            nip: user.nip,
          };
        } catch (error) {
          console.error("[auth] authorize failed:", error);
          return null;
        }
      },
    }),
  ],
});
