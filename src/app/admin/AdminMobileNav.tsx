"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { sectionForPath } from "@/lib/permissions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Books", icon: "📚" },
  { href: "/admin/stationery", label: "Stationery", icon: "✏️" },
  { href: "/admin/categories", label: "Categories", icon: "📂" },
  { href: "/admin/authors", label: "Authors", icon: "✍️" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/bundles", label: "Bundles", icon: "📦" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/inventory", label: "Inventory", icon: "📋" },
  { href: "/admin/editorial/banners", label: "Banners", icon: "🎨" },
  { href: "/admin/editorial/featured", label: "Featured", icon: "⭐" },
  { href: "/admin/reviews", label: "Reviews", icon: "💬" },
  { href: "/admin/subscribers", label: "Subscribers", icon: "📧" },
  { href: "/admin/cart-abandonment", label: "Cart Drop-offs", icon: "🛒" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export function AdminMobileNav({ userName, allowed }: { userName: string; allowed?: string[] }) {
  const [open, setOpen] = useState(false);
  const allowSet = allowed ? new Set(allowed) : null;
  const navItems = allowSet ? NAV.filter((i) => allowSet.has(sectionForPath(i.href))) : NAV;

  return (
    <>
      {/* Mobile top bar — only visible on small screens */}
      <header className="md:hidden flex items-center justify-between bg-[#1e293b] px-4 py-3 sticky top-0 z-50">
        <Link href="/admin" className="text-[15px] font-black text-white tracking-wide">
          Alkarma Admin
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#94a3b8] truncate max-w-[120px]">{userName}</span>
          <button
            onClick={() => setOpen(true)}
            className="text-white p-1"
            aria-label="Open navigation"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-[260px] bg-[#1e293b] flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d3748]">
              <div>
                <p className="text-[15px] font-black text-white">Alkarma Admin</p>
                <p className="text-[11px] text-[#94a3b8]">Store management</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#94a3b8] hover:text-white p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 py-3 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-[14px] text-[#94a3b8] hover:text-white hover:bg-[#334155] transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="px-5 py-4 border-t border-[#2d3748] space-y-3">
              <Link href="/" onClick={() => setOpen(false)}
                className="block text-[13px] text-[#64748b] hover:text-white transition-colors">
                ← View Store
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block text-[13px] text-[#64748b] hover:text-brand transition-colors font-bold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
