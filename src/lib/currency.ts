/**
 * Pricing helpers. This store sells in Egyptian pounds only — there is no
 * second currency, no geo detection and no currency switching anywhere in the
 * app, so none of these helpers take a currency argument.
 */

export interface PricedItem {
  priceEgp: number | string | { toNumber(): number };
  compareAtEgp?: number | string | { toNumber(): number } | null;
}

function toNum(v: number | string | { toNumber(): number }): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  return v.toNumber();
}

/**
 * Clean a price for display in admin inputs/tables. Prices are stored as
 * Float, so repeated bulk % adjustments can accumulate binary floating-point
 * noise (e.g. 440.0000000000001). Rounding to 2 decimal places removes the
 * noise while preserving genuine piastres; a whole-number price then just
 * displays as e.g. "440" since JS drops a trailing ".00".
 */
export function displayPrice(v: number | string | { toNumber(): number } | null | undefined): string {
  if (v == null) return "";
  return (Math.round(toNum(v) * 100) / 100).toString();
}

// Pricing model:
//   priceEgp      = the regular price
//   compareAtEgp  = the OPTIONAL discounted (sale) price — lower than regular
// When a valid discount is set, the customer pays the discounted price and the
// regular price is shown struck-through.
function rawPrices(item: PricedItem): { reg: number; disc: number | null } {
  const reg = toNum(item.priceEgp);
  const disc = item.compareAtEgp != null ? toNum(item.compareAtEgp) : null;
  return { reg, disc };
}

// Price + compare-at may be entered in either order (some flows put the
// original as the higher value, others the sale as the lower). To be robust we
// always CHARGE the lower of the two and STRIKE THROUGH the higher.
/** The price the customer actually pays (the lower of the two when a pair is set). */
export function getPrice(item: PricedItem): number {
  const { reg, disc } = rawPrices(item);
  if (disc == null) return reg;
  return Math.min(reg, disc);
}

/** The struck-through "was" price to show (the higher of the two), or null. */
export function getCompareAtPrice(item: PricedItem): number | null {
  const { reg, disc } = rawPrices(item);
  if (disc == null) return null;
  const hi = Math.max(reg, disc);
  return hi > Math.min(reg, disc) ? hi : null;
}

/** Effective (paid) price — for building cart payloads. */
export function effectivePrices(item: PricedItem): { priceEgp: number } {
  return { priceEgp: getPrice(item) };
}

/**
 * The store's single price format: Western digits, two decimals, "EGP" suffix
 * (e.g. "350.00 EGP").
 *
 * Verified against the live site on both product pages AND the cart — the cart
 * uses the same format, not Arabic-Indic digits with "ج.م". (A design mockup
 * showed the latter for order summaries; the live site does not do this, so
 * there is deliberately no second formatter.)
 *
 * Prices are rendered inside `.price-mono`, which forces `direction: ltr` —
 * without it the bidi algorithm reorders this to read "EGP 350.00".
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EGP`;
}

export function isOnSale(item: PricedItem): boolean {
  const { reg, disc } = rawPrices(item);
  return disc != null && disc !== reg;
}

export function savingsPercent(item: PricedItem): number {
  const { reg, disc } = rawPrices(item);
  if (disc == null || disc === reg) return 0;
  const hi = Math.max(reg, disc);
  const lo = Math.min(reg, disc);
  return Math.round(((hi - lo) / hi) * 100);
}
