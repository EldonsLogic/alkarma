// Shared SEO helpers. Every storefront page must set its own canonical URL —
// the root layout's canonical ("/") only applies when a page doesn't
// override it, and until this file existed, NO page overrode it, so every
// single page (book, category, author, etc.) was telling search engines its
// canonical URL was the homepage. That suppresses indexing of everything but
// "/". (Ported from the Jee Bookstore codebase, where this was a real bug.)
//
// The canonical host is the BARE domain — alkarmabooks.com, no "www" — which
// is what the existing live site already canonicalises to. Changing that on
// launch would needlessly churn every indexed URL.
export { SITE_URL } from "./brand";
import { SITE_URL } from "./brand";

export function canonical(path: string) {
  return { alternates: { canonical: `${SITE_URL}${path}` } };
}
