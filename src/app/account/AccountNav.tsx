"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/account", en: "Dashboard", ar: "لوحة التحكم" },
  { href: "/account/orders", en: "My Orders", ar: "طلباتي" },
  { href: "/account/wishlist", en: "Wishlist", ar: "المفضلة" },
  { href: "/account/addresses", en: "Addresses", ar: "عناويني" },
  { href: "/account/settings", en: "Settings", ar: "الإعدادات" },
];

export function AccountNav({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border border-[#ddd] flex sm:flex-col overflow-x-auto sm:overflow-visible">
      {NAV.map((item) => {
        const isActive =
          item.href === "/account"
            ? pathname === "/account"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 sm:px-5 py-3 text-[13px] font-bold border-b-0 sm:border-b border-r sm:border-r-0 border-[#eee] transition-colors whitespace-nowrap last:border-r-0 sm:last:border-b-0 ${
              isActive
                ? "text-brand bg-[#FFECEC] border-l-2 sm:border-l-0 sm:border-r-2 border-brand"
                : "text-[#333] hover:text-brand hover:bg-[#FFECEC]"
            }`}
          >
            {item.ar}
          </Link>
        );
      })}
      <button
        onClick={onSignOut}
        className="w-full text-start px-4 sm:px-5 py-3 text-[13px] font-bold text-[#aaa] hover:text-brand transition-colors whitespace-nowrap"
      >
        تسجيل الخروج
      </button>
    </nav>
  );
}
