/**
 * Prisma-free shipping helpers + types — safe to import from client components.
 * (Server-only, DB-backed functions live in ./shipping.ts.)
 */

// isFree/freeAbove are kept for shape compatibility but are never set true /
// non-null — the free-shipping threshold has been removed (no longer applicable).
export interface ResolvedRate {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
  basePrice: number;
  isFree: boolean;
  freeAbove: number | null;
  estimatedDays: string;
}

// Env fallback used only when no shipping zones are configured in the DB
export const FLAT_EGP = Number(process.env.SHIPPING_FLAT_RATE_EGP ?? 50);

export function daysLabel(min: number, max: number): string {
  return min === max ? `${min} business day${min === 1 ? "" : "s"}` : `${min}-${max} business days`;
}
