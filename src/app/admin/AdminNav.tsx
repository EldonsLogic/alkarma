"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionForPath } from "@/lib/permissions";

const NAV = [
  { section: "Catalogue" },
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Books", icon: "📚" },
  { href: "/admin/stationery", label: "Stationery", icon: "✏️" },
  { href: "/admin/adopt", label: "Adopt a Book", icon: "🐣" },
  { href: "/admin/categories", label: "Categories", icon: "📂" },
  { href: "/admin/authors", label: "Authors", icon: "✍️" },
  { href: "/admin/bundles", label: "Bundles", icon: "📦" },
  { href: "/admin/inventory", label: "Inventory", icon: "📋" },
  { href: "/admin/media", label: "Media Library", icon: "🖼️" },

  { section: "Orders" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/returns", label: "Returns", icon: "↩️" },

  { section: "Customers" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/subscribers", label: "Subscribers", icon: "📧" },
  { href: "/admin/cart-abandonment", label: "Cart Drop-offs", icon: "🛒" },

  { section: "Marketing" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: "🎁" },
  { href: "/admin/reviews", label: "Reviews", icon: "💬" },

  { section: "Content" },
  { href: "/admin/content", label: "Site Content & Settings", icon: "✏️" },
  { href: "/admin/pages", label: "Pages", icon: "📄" },
  { href: "/admin/editorial/banners", label: "Hero Banners", icon: "🎨" },
  { href: "/admin/campaign", label: "Campaign Banner", icon: "📣" },
  { href: "/admin/editorial/featured", label: "Featured Lists", icon: "⭐" },
  { href: "/admin/bestsellers", label: "Bestsellers", icon: "🏆" },
  { href: "/admin/navigation", label: "Navigation", icon: "🧭" },
  { href: "/admin/redirects", label: "Redirects", icon: "🔀" },

  { section: "Analytics" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/search-analytics", label: "Search Analytics", icon: "🔎" },

  { section: "Operations" },
  { href: "/admin/shipping", label: "Shipping", icon: "🚚" },
  { href: "/admin/email-templates", label: "Email Templates", icon: "✉️" },
  { href: "/admin/settings/email", label: "Email & Auth Settings", icon: "⚙️" },
  { href: "/admin/staff", label: "Staff", icon: "👤" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "🔍" },
];

export function AdminNav({ allowed }: { allowed?: string[] }) {
  const pathname = usePathname();
  const allowSet = allowed ? new Set(allowed) : null;

  // Build a filtered list, dropping links the user can't access and any
  // section header left with no visible links beneath it.
  const visible = NAV.filter((item) => {
    if ("section" in item) return true; // decide headers after
    if (!allowSet) return true;
    return allowSet.has(sectionForPath(item.href));
  });
  // Remove section headers that have no following links
  const pruned = visible.filter((item, idx) => {
    if (!("section" in item)) return true;
    const next = visible[idx + 1];
    return next && !("section" in next);
  });

  return (
    <>
      {pruned.map((item, i) => {
        if ("section" in item) {
          return (
            <div key={`section-${i}`} className="px-5 pt-5 pb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#475569]">{item.section}</p>
            </div>
          );
        }

        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors ${
              isActive
                ? "text-white bg-[#334155] border-l-2 border-brand"
                : "text-[#94a3b8] hover:text-white hover:bg-[#334155]"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
