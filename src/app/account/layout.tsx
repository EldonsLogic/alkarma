import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountNavWrapper } from "./AccountNavWrapper";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Account header */}
      <div className="bg-white border-b border-[#ddd] px-4 sm:px-10 py-4">
        <p className="text-[13px] text-[#666]">
          أهلًا، <strong className="text-[#1a1a1a]">{session.user.name}</strong>
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-6 sm:py-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
        {/* Sidebar — horizontal tabs on mobile, vertical on sm+ */}
        <aside className="w-full sm:w-[220px] sm:flex-shrink-0">
          <AccountNavWrapper />
        </aside>

        {/* Content */}
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
