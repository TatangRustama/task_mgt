import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.jabatan = user.jabatan;
        token.unitId = user.unitId;
        token.nip = user.nip;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.jabatan = (token.jabatan as typeof session.user.jabatan) ?? null;
        session.user.unitId = (token.unitId as string | null) ?? null;
        session.user.nip = token.nip as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
