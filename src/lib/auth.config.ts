import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma, no bcrypt, no Node.js-only modules.
// Used by middleware (Edge Runtime) and spread into auth.ts (Node.js runtime).
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = ((user as { role?: string }).role) ?? "EMPLOYEE";
        token.organizationId = ((user as { organizationId?: string }).organizationId) ?? "";
        token.masterKeySalt = ((user as { masterKeySalt?: string | null }).masterKeySalt) ?? null;
      }
      if (trigger === "update" && session?.masterKeySalt !== undefined) {
        token.masterKeySalt = session.masterKeySalt as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
        session.user.masterKeySalt = token.masterKeySalt as string | null;
      }
      return session;
    },
  },
  providers: [],
};
