import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { readableSections } from "@/lib/permissions";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const userName = session.user.name ?? session.user.email ?? "Admin";
  const allowed = Array.from(readableSections(session));

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      {/* Mobile header + drawer (hidden on md+) */}
      <AdminMobileNav userName={userName} allowed={allowed} />

      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[220px] flex-shrink-0 bg-[#1e293b] text-white flex flex-col min-h-screen">
          <div className="px-5 py-4 border-b border-[#2d3748]">
            <Link href="/admin" className="text-[16px] font-black text-white tracking-wide">
              Alkarma Admin
            </Link>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">Store management</p>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            <AdminNav allowed={allowed} />
          </nav>

          <div className="px-5 py-4 border-t border-[#2d3748] space-y-2">
            <Link href="/" className="block text-[12px] text-[#64748b] hover:text-white transition-colors">
              ← View Store
            </Link>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-[#e2e8f0] px-8 py-3 flex items-center justify-between">
            <Link href="/" className="text-[12px] text-[#94a3b8] hover:text-[#1e293b] transition-colors">
              ← View Store
            </Link>
            <div className="flex items-center gap-5">
              <span className="text-[13px] text-[#64748b]">
                <strong className="text-[#1e293b]">{userName}</strong>
              </span>
              <Link href="/account/settings" className="text-[13px] text-[#94a3b8] hover:text-[#1e293b] transition-colors font-bold">
                Account &amp; Password
              </Link>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button type="submit"
                  className="text-[13px] text-[#94a3b8] hover:text-brand transition-colors font-bold">
                  Sign Out
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </div>

      {/* Mobile content (visible only on < md) */}
      <div className="md:hidden">
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
