/**
 * Where the store can actually deliver.
 *
 * This is a SHIPPING-ELIGIBILITY signal, deliberately independent of pricing —
 * the store has a single currency (EGP), so nothing here should ever be
 * derived from, or coupled to, currency logic. Its only job is to let the UI
 * warn a visitor early that checkout won't be available to them; the real
 * enforcement lives server-side in /api/checkout.
 */

/** The only country the store currently ships to. */
export const SHIPPING_COUNTRY = "EG";

/** Cookie the middleware writes the edge-detected country into. */
export const COUNTRY_COOKIE = "alk-country";

export function shipsToCountry(country: string | undefined | null): boolean {
  // Unknown location (local dev, a crawler, a stripped header) is treated as
  // eligible so we never show a false "we can't deliver to you" warning.
  if (!country) return true;
  return country.toUpperCase() === SHIPPING_COUNTRY;
}
