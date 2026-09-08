import type { Session } from "next-auth";

/**
 * Role-based access control for the admin panel.
 *
 * Every admin user has role === "ADMIN" plus a staffRole that scopes what they
 * can do. An owner account with no staffRole is treated as SUPER_ADMIN so the
 * original admin is never locked out.
 */

export type StaffRole = "SUPER_ADMIN" | "EDITOR" | "FULFILLMENT" | "VIEWER";

export type Section =
  | "catalog"
  | "orders"
  | "customers"
  | "marketing"
  | "content"
  | "analytics"
  | "settings"
  | "staff";

export type Level = "none" | "read" | "write";
export type Action = "read" | "write";

const MATRIX: Record<StaffRole, Partial<Record<Section, Level>>> = {
  SUPER_ADMIN: {
    catalog: "write", orders: "write", customers: "write", marketing: "write",
    content: "write", analytics: "write", settings: "write", staff: "write",
  },
  EDITOR: {
    catalog: "write", content: "write", marketing: "write",
    analytics: "read", orders: "read", customers: "read",
  },
  FULFILLMENT: {
    orders: "write", customers: "read", catalog: "read", analytics: "read",
  },
  VIEWER: {
    catalog: "read", orders: "read", customers: "read",
    marketing: "read", content: "read", analytics: "read",
  },
};

interface SessionUserWithRole {
  role?: string;
  staffRole?: string | null;
}

export function getStaffRole(session: Session | null): StaffRole {
  const sr = (session?.user as SessionUserWithRole | undefined)?.staffRole;
  // Owner accounts (ADMIN, no staffRole) → full access
  if (!sr) return "SUPER_ADMIN";
  if (sr === "SUPER_ADMIN" || sr === "EDITOR" || sr === "FULFILLMENT" || sr === "VIEWER") return sr;
  return "VIEWER"; // unknown role → least privilege
}

export function isAdmin(session: Session | null): boolean {
  return !!session?.user && (session.user as SessionUserWithRole).role === "ADMIN";
}

/** Can this session perform `action` on `section`? */
export function can(session: Session | null, section: Section, action: Action = "read"): boolean {
  if (!isAdmin(session)) return false;
  const level = MATRIX[getStaffRole(session)]?.[section] ?? "none";
  if (action === "read") return level === "read" || level === "write";
  return level === "write";
}

/** Sections this session can at least read — used to filter the admin nav. */
export function readableSections(session: Session | null): Set<Section> {
  const out = new Set<Section>();
  if (!isAdmin(session)) return out;
  const caps = MATRIX[getStaffRole(session)] ?? {};
  (Object.keys(caps) as Section[]).forEach((s) => {
    if (caps[s] === "read" || caps[s] === "write") out.add(s);
  });
  return out;
}

/** Map an admin path to the capability section that governs it. */
export function sectionForPath(path: string): Section {
  if (path.startsWith("/admin/orders") || path.startsWith("/admin/returns")) return "orders";
  if (path.startsWith("/admin/customers") || path.startsWith("/admin/subscribers") || path.startsWith("/admin/cart-abandonment")) return "customers";
  if (path.startsWith("/admin/coupons") || path.startsWith("/admin/reviews") || path.startsWith("/admin/gift-cards")) return "marketing";
  if (path.startsWith("/admin/staff")) return "staff";
  if (
    path.startsWith("/admin/shipping") || path.startsWith("/admin/email-templates") ||
    path.startsWith("/admin/settings") || path.startsWith("/admin/audit-log")
  ) return "settings";
  if (path.startsWith("/admin/analytics") || path.startsWith("/admin/search-analytics")) return "analytics";
  if (
    path.startsWith("/admin/content") || path.startsWith("/admin/pages") || path.startsWith("/admin/blog") ||
    path.startsWith("/admin/campaign") ||
    path.startsWith("/admin/editorial") || path.startsWith("/admin/bestsellers") ||
    path.startsWith("/admin/navigation") || path.startsWith("/admin/redirects")
  ) return "content";
  // Catalogue (products, categories, authors, bundles, inventory, media) + dashboard
  return "catalog";
}
