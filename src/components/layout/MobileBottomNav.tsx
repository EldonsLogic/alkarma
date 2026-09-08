"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/stores/cart.store";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BrowseIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function WishlistIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const itemCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0)
  );

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const accountHref = session ? (isAdmin ? "/admin" : "/account") : "/login";
  const accountLabel = session
    ? isAdmin
      ? "Admin"
      : "حسابي"
    : "دخول";

  const tabs = [
    { href: "/",                 label: "الرئيسية",     Icon: HomeIcon },
    { href: "/search",           label: "بحث",        Icon: SearchIcon },
    { href: "/category",         label: "الأقسام",    Icon: BrowseIcon },
    { href: "/account/wishlist", label: "المفضلة",  Icon: WishlistIcon },
    { href: accountHref,         label: accountLabel,                     Icon: AccountIcon },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[90] lg:hidden border-t border-paper-dark"
      style={{ background: "var(--paper)" }}
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-[3px] transition-colors ${
                active ? "text-brand" : "text-ink-muted"
              }`}
              aria-label={label}
            >
              <Icon active={active} />
              <span
                className="text-[10px] tracking-[0.04em]"

              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
