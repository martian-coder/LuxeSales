// Edge middleware — uses lightweight auth config (no Prisma / Node modules)
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
