/**
 * One cover file per book, at one unchanging address.
 *
 * Both stores share a single Vercel Blob store but keep separate databases, and
 * a cover is just a URL on the book row. With random file names, replacing a
 * cover in one admin produced a new URL that only that site's database knew;
 * the other kept pointing at the old file, and broke as soon as the old file
 * was deleted.
 *
 * Every book's cover therefore lives at covers/<isbn>.webp and is overwritten
 * IN PLACE when replaced. Both databases hold the same URL, so a swap made in
 * either admin shows on both stores once the caches turn over — nothing to
 * re-point, nothing to sync. The ISBN is the key because it is the one
 * identifier the two catalogues are guaranteed to agree on (2066 of 2067 books
 * carry one, every book with a cover does).
 *
 * Files under covers/ must never be deleted from the store — only overwritten.
 */

export const COVER_PREFIX = "covers/";

/** Browser/CDN TTL for covers. Short, so an in-place replacement shows soon. */
export const COVER_CACHE_SECONDS = 300;

export function stableCoverPathname(isbn: string): string {
  return `${COVER_PREFIX}${isbn.replace(/[^0-9Xx]/g, "")}.webp`;
}

export function isStableCoverUrl(url: string | null | undefined): boolean {
  return !!url && /\.public\.blob\.vercel-storage\.com\/covers\/[0-9Xx]+\.webp$/.test(url);
}
