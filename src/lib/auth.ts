import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import bcrypt from "bcryptjs";

class RateLimitError extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Required for NextAuth v5 behind a proxy (Vercel)
  trustHost: true,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();

        // ── Brute-force protection ──────────────────────────────────────────
        // Throttle by IP (15 attempts / 15 min) AND by target account
        // (10 attempts / 15 min) so password-spraying is blocked either way.
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ??
          request?.headers?.get("x-real-ip") ??
          "unknown";
        const window = 15 * 60 * 1000;
        const [byIp, byAccount] = await Promise.all([
          rateLimit(`login-ip:${ip}`, { limit: 15, windowMs: window }),
          rateLimit(`login-acct:${email}`, { limit: 10, windowMs: window }),
        ]);
        if (!byIp.allowed || !byAccount.allowed) {
          throw new RateLimitError();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          staffRole: user.staffRole,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Populate firstName/lastName for Google sign-ins (PrismaAdapter doesn't handle custom fields)
      if (account?.provider === "google" && profile && user.id) {
        const name = (profile.name as string | undefined) ?? "";
        const parts = name.trim().split(" ");
        const firstName = (profile as { given_name?: string }).given_name ?? parts[0] ?? "";
        const lastName = (profile as { family_name?: string }).family_name ?? parts.slice(1).join(" ") ?? "";
        await prisma.user.update({
          where: { id: user.id },
          data: { firstName, lastName, role: "CUSTOMER" },
        }).catch(() => {}); // non-fatal — user was created, names can be filled later
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.staffRole = (user as { staffRole?: string | null }).staffRole ?? null;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      (session.user as { role?: string }).role = token.role as string;
      (session.user as { staffRole?: string | null }).staffRole = (token.staffRole as string | null) ?? null;
      return session;
    },
  },
  pages: { signIn: "/login" },
});

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

/**
 * Gate an admin API route by capability. Returns the session if allowed,
 * or null if the caller lacks the required permission.
 *   const session = await requirePermission("orders", "write");
 *   if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 */
export async function requirePermission(
  section: import("./permissions").Section,
  action: import("./permissions").Action = "write"
) {
  const session = await auth();
  const { can } = await import("./permissions");
  if (!can(session, section, action)) return null;
  return session;
}

/** Super-admin-only gate (e.g. staff management). */
export async function requireSuperAdmin() {
  const session = await auth();
  const { getStaffRole, isAdmin } = await import("./permissions");
  if (!isAdmin(session) || getStaffRole(session) !== "SUPER_ADMIN") return null;
  return session;
}
