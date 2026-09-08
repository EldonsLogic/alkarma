/**
 * Single source of truth for brand identity strings.
 *
 * Everything user-visible that names the store — page titles, metadata,
 * JSON-LD, email templates, logo alt text — reads from here rather than
 * hardcoding the name, so the brand can never drift out of sync across the
 * codebase. Ported from the Jee Bookstore codebase, where the name was
 * scattered across ~50 files.
 */

/** Full brand name, as shown in headings and formal contexts. */
export const BRAND_AR = "دار الكرمة";

/** Short form, used where space is tight (logo alt, nav, footer). */
export const BRAND_SHORT_AR = "الكرمة";

/** Latin form — only for machine-readable contexts (schema.org, email headers). */
export const BRAND_LATIN = "Alkarma Books";

/**
 * Canonical production origin. No trailing slash, BARE domain (no "www") —
 * this matches what the existing live site already canonicalises to.
 *
 * Deliberately a constant rather than read from the environment: canonical
 * URLs, robots.txt and the sitemap must be stable and identical in every
 * environment. Deriving them from NEXT_PUBLIC_APP_URL means one wrong env var
 * silently points every canonical at localhost or a preview deployment and
 * de-indexes the site — the same class of bug that suppressed indexing on the
 * Jee Bookstore codebase this was ported from.
 */
export const SITE_URL = "https://alkarmabooks.com";

/** Bare domain, for display in emails and footers. */
export const SITE_DOMAIN = "alkarmabooks.com";

/** Order-number prefix. Orders imported from the previous site keep their
 *  original numbers; only orders created here use this scheme. */
export const ORDER_PREFIX = "ALK";

/** Public contact address shown on the storefront. */
export const CONTACT_EMAIL = "info@alkarmabooks.com";

/** Public contact phone, as displayed. */
export const CONTACT_PHONE = "01067274880";
