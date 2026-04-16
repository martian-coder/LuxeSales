// Full auth config — Node.js only (server components, API routes, actions)
// DO NOT import this in middleware — use lib/auth.config.ts there
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        // In dev, accept any password for any existing user (demo mode)
        // In production: use bcrypt.compare(password, user.passwordHash)
        if (!user || !user.email) return null;
        return user;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        if (user.email) {
          const existing = await db.user.findUnique({
            where: { email: user.email },
          });
          if (existing && !existing.username) {
            const base = user.email
              .split("@")[0]
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            let username = base;
            let i = 1;
            while (await db.user.findUnique({ where: { username } })) {
              username = `${base}${i++}`;
            }
            await db.user.update({
              where: { email: user.email },
              data: { username },
            });
          }
        }
      }
      return true;
    },
  },
  session: { strategy: "database" },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
