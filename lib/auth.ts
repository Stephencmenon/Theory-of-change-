import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";
import { logSecurityEvent } from "@/lib/logger";

// NextAuth config (ADD §7.1). Credentials provider, bcrypt check against
// password_hash, JWT session in an httpOnly+Secure cookie with a 30-day TTL.
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) {
          logSecurityEvent({
            event: "auth_failure",
            route: "/api/auth/callback/credentials",
            detail: "unknown_email",
          });
          return null;
        }

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) {
          logSecurityEvent({
            event: "auth_failure",
            route: "/api/auth/callback/credentials",
            userId: user.id,
            detail: "bad_password",
          });
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role as AppRole,
          programId: user.programId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy identity onto the token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.programId = user.programId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        role: token.role,
        programId: token.programId,
      };
      return session;
    },
  },
};
