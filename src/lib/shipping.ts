import { prisma } from "./prisma";
import {
  FLAT_EGP,
  daysLabel,
  type ResolvedRate,
} from "./shipping-utils";

// Re-export client-safe types so existing server imports keep working
export type { ResolvedRate } from "./shipping-utils";

/**
 * Find the shipping zone that serves a given country.
 * Matches an explicit country code first, then a wildcard "*" zone
 * (rest-of-world), preferring lower sortOrder.
 */
async function findZoneForCountry(country: string) {
  const code = country.toUpperCase();
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { rates: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  // Exact country match wins
  const exact = zones.find((z) => z.countries.map((c) => c.toUpperCase()).includes(code));
  if (exact) return exact;
  // Wildcard / rest-of-world zone
  return zones.find((z) => z.countries.includes("*")) ?? null;
}

/**
 * Returns the list of shipping options available for a country, with
 * per-rate free-shipping applied for the given currency + subtotal.
 * Falls back to a single env-configured flat rate if no zones exist.
 */
export async function getRatesForCountry(
  country: string,
  subtotal: number,
  governorate?: string
): Promise<ResolvedRate[]> {
  try {
    const zone = await findZoneForCountry(country);
    if (zone && zone.rates.length > 0) {
      let rates = zone.rates;

      // Egypt: if a governorate is given, narrow to the rate(s) that cover it.
      // A rate with an empty governorates list applies to all areas (fallback).
      if (country.toUpperCase() === "EG" && governorate) {
        const matching = zone.rates.filter(
          (r) => r.governorates.length === 0 || r.governorates.includes(governorate)
        );
        // Prefer rates that explicitly list the governorate over catch-all rates
        const explicit = matching.filter((r) => r.governorates.includes(governorate));
        rates = explicit.length > 0 ? explicit : matching;
      }

      // Free-shipping threshold is no longer applicable — always charge the
      // full rate, regardless of any freeAboveEgp value stored on the rate.
      return rates.map((r) => {
        const base = Number(r.priceEgp);
        return {
          id: r.id,
          name: r.name,
          nameAr: r.nameAr ?? null,
          price: base,
          basePrice: base,
          isFree: false,
          freeAbove: null,
          estimatedDays: daysLabel(r.minDays, r.maxDays),
        };
      });
    }
  } catch {
    // fall through to env fallback
  }

  // ── Fallback: single flat rate from env vars ──
  const isDomestic = country.toUpperCase() === "EG";
  const flat = FLAT_EGP;
  return [
    {
      id: "standard",
      name: isDomestic ? "Standard Delivery" : "International Shipping",
      nameAr: isDomestic ? "توصيل عادي" : "شحن دولي",
      price: flat,
      basePrice: flat,
      isFree: false,
      freeAbove: null,
      estimatedDays: isDomestic ? "3-5 business days" : "7-14 business days",
    },
  ];
}

/**
 * Resolve a single rate by id for a country (authoritative — used at checkout
 * so the server never trusts a client-sent price).
 */
export async function resolveRateById(
  rateId: string,
  country: string,
  subtotal: number,
  governorate?: string
): Promise<ResolvedRate | null> {
  const rates = await getRatesForCountry(country, subtotal, governorate);
  // For Egypt the governorate already narrows to the correct rate, so prefer
  // the resolved list's first entry; otherwise honour the chosen rateId.
  return rates.find((r) => r.id === rateId) ?? rates[0] ?? null;
}
