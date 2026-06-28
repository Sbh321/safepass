import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Populate token on first sign-in
      if (user) {
        token.id = user.id ?? "";
        token.role = ((user as { role?: string }).role) ?? "EMPLOYEE";
        token.organizationId = ((user as { organizationId?: string }).organizationId) ?? "";
        token.masterKeySalt = ((user as { masterKeySalt?: string | null }).masterKeySalt) ?? null;
      }

      // Handle explicit session updates (e.g., after master key setup).
      // `update()` from useSession() triggers trigger === "update" and passes
      // the new data in `session`. We merge it into the token so it persists.
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
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          masterKeySalt: user.masterKeySalt,
        };
      },
    }),
  ],
});
