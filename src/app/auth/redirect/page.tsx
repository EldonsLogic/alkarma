import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Role-aware post-login redirect.
 * Used as callbackUrl for OAuth providers so admins land on /admin,
 * customers on /account, and unauthenticated users go back to /login.
 */
export default async function AuthRedirectPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if ((session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/account");
}
