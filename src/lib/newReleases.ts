import type { Prisma } from "@prisma/client";
import { BRAND_AR } from "@/lib/brand";

/**
 * What counts as a "new release".
 *
 * Only the house's own titles count: أحدث الإصدارات is دار الكرمة's new list,
 * not the distributed catalogue's. Before this was scoped, six books from
 * دار الخيال and شركة المطبوعات sat in it beside the 22 Karma titles. The
 * publisher is matched on the exact string the books carry, which is the
 * brand name.
 *
 * Within that, a book qualifies if EITHER it was published in the current
 * calendar year OR someone flagged it by hand (isNewRelease). The flag alone
 * is not enough: it has to be set manually, so a title published this year
 * would silently never appear as new until somebody remembered to tick it.
 *
 * The year is derived from the clock every time this runs — never hardcoded —
 * so the shelf rolls over on 1 January with no code change and no admin action.
 * Boundaries are built in UTC to match how Prisma stores DateTime, which keeps
 * the cutoff deterministic rather than shifting with the server's timezone.
 *
 * Used by the homepage's أحدث الإصدارات rail and the /new-releases listing, so
 * the two can never drift apart.
 */
export function newReleaseWindow(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  return {
    from: new Date(Date.UTC(year, 0, 1)),
    // Exclusive upper bound: the first instant of next year.
    until: new Date(Date.UTC(year + 1, 0, 1)),
    year,
  };
}

/** Prisma `where` fragment selecting new releases. Spread into an existing where. */
export function newReleaseWhere(now: Date = new Date()): Prisma.BookWhereInput {
  const { from, until } = newReleaseWindow(now);
  return {
    publisher: BRAND_AR,
    OR: [{ publishDate: { gte: from, lt: until } }, { isNewRelease: true }],
  };
}

/**
 * Ordering for new-release listings: newest publication first. createdAt is the
 * row's import timestamp, not the book's publication date — ordering by it puts
 * whatever happened to be imported last on top, which is the same class of bug
 * as sorting a catalogue by when its rows were written. It stays only as a
 * tiebreaker for books sharing a publishDate.
 */
export const NEW_RELEASE_ORDER_BY: Prisma.BookOrderByWithRelationInput[] = [
  { publishDate: "desc" },
  { createdAt: "desc" },
];

/** True when a single book qualifies — for per-book UI (badges, PDP). */
export function isNewRelease(
  book: { publishDate?: Date | null; isNewRelease?: boolean; publisher?: string | null },
  now: Date = new Date(),
): boolean {
  if (book.publisher !== undefined && book.publisher !== BRAND_AR) return false;
  if (book.isNewRelease) return true;
  if (!book.publishDate) return false;
  const { from, until } = newReleaseWindow(now);
  return book.publishDate >= from && book.publishDate < until;
}
